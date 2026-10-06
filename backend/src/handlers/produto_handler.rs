use axum::{extract::{State, Path}, Json, response::IntoResponse, http::StatusCode};
use diesel::prelude::*;
use std::sync::Arc;
use chrono::Utc;
use bigdecimal::{BigDecimal, Zero};

use crate::{
    db::DbPool,
    auth::middleware::{AuthenticatedUser, require_role},
    models::produto_model::{Produto, NewProduto, UpdateProduto, EntradaEstoqueInput},
    schema::produtos,
};

/// Regra de negócio: preço de compra deve ser sempre positivo.
/// Valores zerados, negativos ou nulos são rejeitados antes de tocar o banco.
/// O `preco_venda` é coluna gerada no PostgreSQL
/// (`ROUND(preco_compra * 1.30, 2) STORED`) e se ajusta sozinho.
fn preco_compra_valido(preco: &BigDecimal) -> bool {
    preco > &BigDecimal::zero()
}

fn erro_preco_invalido() -> serde_json::Value {
    serde_json::json!({ "error": "preco_compra deve ser maior que zero." })
}

pub async fn create_produto_handler(
    State(pool): State<Arc<DbPool>>,
    user: AuthenticatedUser,
    Json(payload): Json<NewProduto>,
) -> impl IntoResponse {
    if let Err(response) = require_role(&user.0, &["ADMIN"]) {
        return response;
    }

    if !preco_compra_valido(&payload.preco_compra) {
        return (StatusCode::BAD_REQUEST, Json(erro_preco_invalido())).into_response();
    }
    if payload.quantidade_estoque < 0 {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "quantidade_estoque não pode ser negativa." }))).into_response();
    }
    if payload.nome.trim().is_empty() {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "Nome do produto é obrigatório." }))).into_response();
    }

    let mut conn = pool.get().expect("Erro ao obter conexão do pool");

    // Valida EAN único antes de inserir.
    // Para dar entrada em produto existente (somar estoque + atualizar
    // preco_compra), use POST /api/produtos/entrada.
    let existente = produtos::table
        .filter(produtos::ean.eq(&payload.ean))
        .select(Produto::as_select())
        .first::<Produto>(&mut conn)
        .optional();

    match existente {
        Ok(Some(_)) => {
            return (StatusCode::CONFLICT, Json(serde_json::json!({ "error": "Já existe um produto com este EAN. Use a entrada de estoque para atualizar preço e quantidade." }))).into_response();
        }
        Err(e) => {
            return (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao validar EAN: {}", e)).into_response();
        }
        Ok(None) => {}
    }

    match diesel::insert_into(produtos::table)
        .values(&payload)
        .get_result::<Produto>(&mut conn)
    {
        Ok(produto) => (StatusCode::CREATED, Json(produto)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao criar produto: {}", e)).into_response(),
    }
}

pub async fn list_produtos_handler(
    State(pool): State<Arc<DbPool>>,
    user: AuthenticatedUser,
) -> impl IntoResponse {
    if let Err(response) = require_role(&user.0, &["ADMIN", "BUYER", "SELLER"]) {
        return response;
    }

    let mut conn = pool.get().expect("Erro ao obter conexão do pool");

    match produtos::table
        .select(Produto::as_select())
        .load::<Produto>(&mut conn)
    {
        Ok(lista) => Json(lista).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao listar produtos: {}", e)).into_response(),
    }
}

pub async fn update_produto_handler(
    State(pool): State<Arc<DbPool>>,
    user: AuthenticatedUser,
    Path(id): Path<i32>,
    Json(payload): Json<UpdateProduto>,
) -> impl IntoResponse {
    if let Err(response) = require_role(&user.0, &["ADMIN"]) {
        return response;
    }

    // Tratamento de valores nulos/divergentes: rejeita preço zerado ou
    // negativo e estoque negativo antes de tocar o banco.
    if let Some(ref preco) = payload.preco_compra {
        if !preco_compra_valido(preco) {
            return (StatusCode::BAD_REQUEST, Json(erro_preco_invalido())).into_response();
        }
    }
    if let Some(qtd) = payload.quantidade_estoque {
        if qtd < 0 {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "quantidade_estoque não pode ser negativa." }))).into_response();
        }
    }
    if let Some(ref nome) = payload.nome {
        if nome.trim().is_empty() {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "Nome do produto não pode ser vazio." }))).into_response();
        }
    }

    let mut conn = pool.get().expect("Erro ao obter conexão do pool");

    match diesel::update(produtos::table.find(id))
        .set((
            &payload,
            produtos::updated_at.eq(Utc::now().naive_utc()),
        ))
        .get_result::<Produto>(&mut conn)
    {
        Ok(produto) => (StatusCode::OK, Json(produto)).into_response(),
        Err(diesel::result::Error::NotFound) => (StatusCode::NOT_FOUND, Json(serde_json::json!({ "error": "Produto não encontrado." }))).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao atualizar produto: {}", e)).into_response(),
    }
}

pub async fn delete_produto_handler(
    State(pool): State<Arc<DbPool>>,
    user: AuthenticatedUser,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    if let Err(response) = require_role(&user.0, &["ADMIN"]) {
        return response;
    }

    let mut conn = pool.get().expect("Erro ao obter conexão do pool");

    match diesel::delete(produtos::table.find(id)).execute(&mut conn) {
        Ok(count) if count > 0 => StatusCode::NO_CONTENT.into_response(),
        Ok(_) => (StatusCode::NOT_FOUND, Json(serde_json::json!({ "error": "Produto não encontrado." }))).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao excluir produto: {}", e)).into_response(),
    }
}

/// POST /api/produtos/entrada — registra nova carga de estoque em produto
/// já existente (busca por EAN ou ID).
///
/// Regra de negócio: soma `quantidade` à `quantidade_estoque` e atualiza
/// `preco_compra` para o valor mais recente. O `preco_venda` é recalculado
/// automaticamente pelo banco (coluna gerada). Tudo em transação para
/// manter idoneidade do estoque e dos preços.
pub async fn entrada_estoque_handler(
    State(pool): State<Arc<DbPool>>,
    user: AuthenticatedUser,
    Json(payload): Json<EntradaEstoqueInput>,
) -> impl IntoResponse {
    if let Err(response) = require_role(&user.0, &["ADMIN"]) {
        return response;
    }

    if !preco_compra_valido(&payload.preco_compra) {
        return (StatusCode::BAD_REQUEST, Json(erro_preco_invalido())).into_response();
    }
    if payload.quantidade <= 0 {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "quantidade deve ser maior que zero." }))).into_response();
    }

    let ean_filtro = payload.ean.as_deref().map(str::trim).filter(|s| !s.is_empty()).map(str::to_string);
    if ean_filtro.is_none() && payload.produto_id.is_none() {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "Informe o EAN ou o ID do produto para dar entrada no estoque." }))).into_response();
    }

    let mut conn = pool.get().expect("Erro ao obter conexão do pool");

    let resultado = conn.transaction::<Produto, diesel::result::Error, _>(|conn| {
        // Localiza o produto por EAN (preferencial) ou por ID.
        let produto_id: i32 = if let Some(ref ean) = ean_filtro {
            produtos::table
                .filter(produtos::ean.eq(ean))
                .select(produtos::id)
                .first::<i32>(conn)?
        } else {
            let id = payload.produto_id.unwrap_or_default();
            produtos::table
                .filter(produtos::id.eq(id))
                .select(produtos::id)
                .first::<i32>(conn)?
        };

        diesel::update(produtos::table.find(produto_id))
            .set((
                produtos::preco_compra.eq(&payload.preco_compra),
                produtos::quantidade_estoque.eq(produtos::quantidade_estoque + payload.quantidade),
                produtos::updated_at.eq(Utc::now().naive_utc()),
            ))
            .get_result::<Produto>(conn)
    });

    match resultado {
        Ok(produto) => (StatusCode::OK, Json(produto)).into_response(),
        Err(diesel::result::Error::NotFound) => (StatusCode::NOT_FOUND, Json(serde_json::json!({ "error": "Produto não encontrado para o EAN/ID informado." }))).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao registrar entrada de estoque: {}", e)).into_response(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejeita_preco_zero_e_negativo() {
        assert!(!preco_compra_valido(&BigDecimal::from(0)));
        assert!(!preco_compra_valido(&BigDecimal::from(-1)));
        assert!(preco_compra_valido(&BigDecimal::from(1)));
    }
}
