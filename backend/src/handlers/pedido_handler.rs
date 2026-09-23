use axum::{extract::{State, Path}, Json, response::IntoResponse, http::StatusCode};
use diesel::prelude::*;
use std::sync::Arc;
use chrono::Utc;

use crate::{
    auth::middleware::{AuthenticatedUser, require_role}, 
    db::DbPool, 
    models::pedido_model::{CreatePedidoInput, NewPedidoCompra, NewPedidoItem, PedidoCompra, PedidoCompraResponse, PedidoItem, UpdatePedidoInput, UpdatePedidoStatusInput, UpdateStatusEnvioInput, ConferenciaPedidoInput}, 
    models::produto_model::{NewProduto, Produto}, 
    schema::{pedido_itens, pedidos_compra, produtos, users},
};

pub async fn create_pedido_handler(
    State(pool): State<Arc<DbPool>>,
    user: AuthenticatedUser,
    Json(payload): Json<CreatePedidoInput>,
) -> impl IntoResponse {
    if let Err(response) = require_role(&user.0, &["ADMIN", "BUYER"]) {
        return response;
    }

    let mut conn = pool.get().expect("Erro ao obter conexão do pool");

    let novo_pedido = conn.transaction::<PedidoCompra, diesel::result::Error, _>(|conn| {
        let pedido = diesel::insert_into(pedidos_compra::table)
            .values(&NewPedidoCompra {
                fornecedor_id: payload.fornecedor_id,
                status: "PENDENTE".to_string(),
                comprador_id: user.0.sub,
            })
            .get_result::<PedidoCompra>(conn)?;

        let itens: Vec<NewPedidoItem> = payload.itens.into_iter().map(|i| NewPedidoItem {
            pedido_id: pedido.id,
            item: i.item,
            ean: i.ean,
            quantidade: i.quantidade,
            valor_unitario: i.valor_unitario,
        }).collect();

        diesel::insert_into(pedido_itens::table)
            .values(&itens)
            .execute(conn)?;

        Ok(pedido)
    });

    match novo_pedido {
        Ok(pedido) => (StatusCode::CREATED, Json(pedido)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao criar pedido: {}", e)).into_response(),
    }
}

pub async fn list_pedidos_handler(
    State(pool): State<Arc<DbPool>>,
    user: AuthenticatedUser,
) -> impl IntoResponse {
    if let Err(response) = require_role(&user.0, &["ADMIN", "BUYER"]) {
        return response;
    }

    let mut conn = pool.get().expect("Erro ao obter conexão do pool");

    let lista = pedidos_compra::table
        .inner_join(users::table)
        .select((PedidoCompra::as_select(), users::name))
        .load::<(PedidoCompra, String)>(&mut conn);

    match lista {
        Ok(lista) => {
            let response: Vec<PedidoCompraResponse> = lista.into_iter().map(|(p, u_name)| PedidoCompraResponse {
                id: p.id,
                fornecedor_id: p.fornecedor_id,
                status: p.status,
                comprador_id: p.comprador_id,
                comprador_nome: u_name,
                status_envio: p.status_envio,
                observacao_problema: p.observacao_problema,
                created_at: p.created_at,
                updated_at: p.updated_at,
            }).collect();
            Json(response).into_response()
        }
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao listar pedidos: {}", e)).into_response(),
    }
}

pub async fn update_pedido_handler(
    State(pool): State<Arc<DbPool>>,
    user: AuthenticatedUser,
    Path(id): Path<i32>,
    Json(payload): Json<UpdatePedidoInput>,
) -> impl IntoResponse {
    if let Err(response) = require_role(&user.0, &["ADMIN", "BUYER"]) {
        return response;
    }

    let mut conn = pool.get().expect("Erro ao obter conexão do pool");

    // Só permite editar pedidos ainda PENDENTES (máquina de aprovação)
    let pedido_atual = pedidos_compra::table
        .find(id)
        .select(PedidoCompra::as_select())
        .first::<PedidoCompra>(&mut conn);

    match pedido_atual {
        Err(diesel::result::Error::NotFound) => return StatusCode::NOT_FOUND.into_response(),
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao buscar pedido: {}", e)).into_response(),
        Ok(p) if p.status != "PENDENTE" => {
            return (StatusCode::CONFLICT, Json(serde_json::json!({ "error": "Apenas pedidos com status PENDENTE podem ser editados." }))).into_response();
        }
        Ok(_) => {}
    }

    let resultado = conn.transaction::<(), diesel::result::Error, _>(|conn| {
        diesel::update(pedidos_compra::table.find(id))
            .set((
                pedidos_compra::fornecedor_id.eq(payload.fornecedor_id),
                pedidos_compra::updated_at.eq(Utc::now().naive_utc()),
            ))
            .execute(conn)?;

        diesel::delete(pedido_itens::table.filter(pedido_itens::pedido_id.eq(id)))
            .execute(conn)?;

        let itens: Vec<NewPedidoItem> = payload.itens.into_iter().map(|i| NewPedidoItem {
            pedido_id: id,
            item: i.item,
            ean: i.ean,
            quantidade: i.quantidade,
            valor_unitario: i.valor_unitario,
        }).collect();

        diesel::insert_into(pedido_itens::table)
            .values(&itens)
            .execute(conn)?;

        Ok(())
    });

    match resultado {
        Ok(_) => StatusCode::NO_CONTENT.into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao atualizar pedido: {}", e)).into_response(),
    }
}

pub async fn delete_pedido_handler(
    State(pool): State<Arc<DbPool>>,
    user: AuthenticatedUser,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    if let Err(response) = require_role(&user.0, &["ADMIN", "BUYER"]) {
        return response;
    }

    let mut conn = pool.get().expect("Erro ao obter conexão do pool");

    let pedido = match buscar_pedido(&mut conn, id) {
        Ok(p) => p,
        Err(response) => return response,
    };

    // Pedido concluído já subiu ao estoque: não pode ser excluído.
    if pedido.status_envio.as_deref() == Some("CONCLUIDO") {
        return (StatusCode::CONFLICT, Json(serde_json::json!({ "error": "Pedidos concluídos não podem ser excluídos, pois já tiveram baixa no estoque." }))).into_response();
    }

    let resultado = diesel::delete(pedidos_compra::table.find(id))
        .execute(&mut conn);

    match resultado {
        Ok(count) if count > 0 => StatusCode::NO_CONTENT.into_response(),
        Ok(_) => StatusCode::NOT_FOUND.into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao excluir pedido: {}", e)).into_response(),
    }
}

// Adicione a função ao final do arquivo:
pub async fn update_pedido_status_handler(
    State(pool): State<Arc<DbPool>>,
    user: AuthenticatedUser,
    Path(id): Path<i32>,
    Json(payload): Json<UpdatePedidoStatusInput>,
) -> impl IntoResponse {
    if let Err(response) = require_role(&user.0, &["ADMIN", "BUYER"]) {
        return response;
    }

    let mut conn = pool.get().expect("Erro ao obter conexão do pool");

    let pedido_atual = match buscar_pedido(&mut conn, id) {
        Ok(p) => p,
        Err(response) => return response,
    };

    // Pedido concluído já subiu ao estoque: status não pode mais mudar.
    if pedido_atual.status_envio.as_deref() == Some("CONCLUIDO") {
        return (StatusCode::CONFLICT, Json(serde_json::json!({ "error": "Pedidos concluídos não podem ter o status alterado, pois já tiveram baixa no estoque." }))).into_response();
    }

    let resultado = diesel::update(pedidos_compra::table.find(id))
        .set((
            pedidos_compra::status.eq(payload.status),
            pedidos_compra::updated_at.eq(Utc::now().naive_utc()),
        ))
        .execute(&mut conn);

    match resultado {
        Ok(count) if count > 0 => StatusCode::NO_CONTENT.into_response(),
        Ok(_) => StatusCode::NOT_FOUND.into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao atualizar status do pedido: {}", e)).into_response(),
    }
}

pub async fn get_pedido_itens_handler(
    State(pool): State<Arc<DbPool>>,
    user: AuthenticatedUser,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    if let Err(response) = require_role(&user.0, &["ADMIN", "BUYER"]) {
        return response;
    }

    let mut conn = pool.get().expect("Erro ao obter conexão do pool");

    let itens = pedido_itens::table
        .filter(pedido_itens::pedido_id.eq(id))
        .load::<PedidoItem>(&mut conn);

    match itens {
        Ok(lista) => Json(lista).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao buscar itens: {}", e)).into_response(),
    }
}

fn buscar_pedido(conn: &mut diesel::PgConnection, id: i32) -> Result<PedidoCompra, axum::response::Response> {
    match pedidos_compra::table
        .find(id)
        .select(PedidoCompra::as_select())
        .first::<PedidoCompra>(conn)
    {
        Ok(p) => Ok(p),
        Err(diesel::result::Error::NotFound) => Err((StatusCode::NOT_FOUND, Json(serde_json::json!({ "error": "Pedido não encontrado." }))).into_response()),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao buscar pedido: {}", e)).into_response()),
    }
}

/// PATCH /api/pedidos-compra/:id/aprovar — apenas ADMIN.
/// PENDENTE -> APROVADO (e inicializa status_envio = CONFIRMADO).
pub async fn aprovar_pedido_handler(
    State(pool): State<Arc<DbPool>>,
    user: AuthenticatedUser,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    if let Err(response) = require_role(&user.0, &["ADMIN"]) {
        return response;
    }

    let mut conn = pool.get().expect("Erro ao obter conexão do pool");

    let pedido = match buscar_pedido(&mut conn, id) {
        Ok(p) => p,
        Err(response) => return response,
    };

    if pedido.status != "PENDENTE" {
        return (StatusCode::CONFLICT, Json(serde_json::json!({ "error": "Apenas pedidos PENDENTES podem ser aprovados." }))).into_response();
    }

    match diesel::update(pedidos_compra::table.find(id))
        .set((
            pedidos_compra::status.eq("APROVADO"),
            pedidos_compra::status_envio.eq("CONFIRMADO"),
            pedidos_compra::updated_at.eq(Utc::now().naive_utc()),
        ))
        .get_result::<PedidoCompra>(&mut conn)
    {
        Ok(p) => (StatusCode::OK, Json(p)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao aprovar pedido: {}", e)).into_response(),
    }
}

/// PATCH /api/pedidos-compra/:id/rejeitar — apenas ADMIN.
/// PENDENTE -> REJEITADO.
pub async fn rejeitar_pedido_handler(
    State(pool): State<Arc<DbPool>>,
    user: AuthenticatedUser,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    if let Err(response) = require_role(&user.0, &["ADMIN"]) {
        return response;
    }

    let mut conn = pool.get().expect("Erro ao obter conexão do pool");

    let pedido = match buscar_pedido(&mut conn, id) {
        Ok(p) => p,
        Err(response) => return response,
    };

    if pedido.status != "PENDENTE" {
        return (StatusCode::CONFLICT, Json(serde_json::json!({ "error": "Apenas pedidos PENDENTES podem ser rejeitados." }))).into_response();
    }

    match diesel::update(pedidos_compra::table.find(id))
        .set((
            pedidos_compra::status.eq("REJEITADO"),
            pedidos_compra::updated_at.eq(Utc::now().naive_utc()),
        ))
        .get_result::<PedidoCompra>(&mut conn)
    {
        Ok(p) => (StatusCode::OK, Json(p)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao rejeitar pedido: {}", e)).into_response(),
    }
}

/// PATCH /api/pedidos-compra/:id/cancelar — apenas ADMIN.
/// Cancela um pedido APROVADO (inclusive quando está COM_PROBLEMA no envio).
pub async fn cancelar_pedido_handler(
    State(pool): State<Arc<DbPool>>,
    user: AuthenticatedUser,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    if let Err(response) = require_role(&user.0, &["ADMIN"]) {
        return response;
    }

    let mut conn = pool.get().expect("Erro ao obter conexão do pool");

    let pedido = match buscar_pedido(&mut conn, id) {
        Ok(p) => p,
        Err(response) => return response,
    };

    if pedido.status != "APROVADO" {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "Apenas pedidos APROVADOS (incluindo os COM_PROBLEMA no envio) podem ser cancelados." }))).into_response();
    }

    // Pedido concluído já subiu ao estoque: não pode ser cancelado.
    if pedido.status_envio.as_deref() == Some("CONCLUIDO") {
        return (StatusCode::CONFLICT, Json(serde_json::json!({ "error": "Pedidos concluídos não podem ser cancelados, pois já tiveram baixa no estoque." }))).into_response();
    }

    match diesel::update(pedidos_compra::table.find(id))
        .set((
            pedidos_compra::status.eq("CANCELADO"),
            pedidos_compra::updated_at.eq(Utc::now().naive_utc()),
        ))
        .get_result::<PedidoCompra>(&mut conn)
    {
        Ok(p) => (StatusCode::OK, Json(p)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao cancelar pedido: {}", e)).into_response(),
    }
}

/// Valida a transição da máquina de status_envio.
/// Fluxo feliz: CONFIRMADO -> ENVIADO -> RECEBIDO -> CONFERIDO -> CONCLUIDO.
/// Exceção: de qualquer etapa entre CONFIRMADO e CONFERIDO pode ir para COM_PROBLEMA,
/// e de COM_PROBLEMA pode voltar a uma etapa válida (sem pular direto para CONCLUIDO).
fn transicao_envio_valida(atual: Option<&str>, proximo: &str) -> bool {
    match (atual, proximo) {
        (None, "CONFIRMADO") => true,
        (Some("CONFIRMADO"), "ENVIADO") => true,
        (Some("CONFIRMADO"), "COM_PROBLEMA") => true,
        (Some("ENVIADO"), "RECEBIDO") => true,
        (Some("ENVIADO"), "COM_PROBLEMA") => true,
        (Some("RECEBIDO"), "CONFERIDO") => true,
        (Some("RECEBIDO"), "COM_PROBLEMA") => true,
        (Some("CONFERIDO"), "CONCLUIDO") => true,
        (Some("CONFERIDO"), "COM_PROBLEMA") => true,
        (Some("COM_PROBLEMA"), "CONFIRMADO") => true,
        (Some("COM_PROBLEMA"), "ENVIADO") => true,
        (Some("COM_PROBLEMA"), "RECEBIDO") => true,
        (Some("COM_PROBLEMA"), "CONFERIDO") => true,
        _ => false,
    }
}

/// PATCH /api/pedidos-compra/:id/status-envio — BUYER dono do pedido ou ADMIN (override).
pub async fn update_status_envio_handler(
    State(pool): State<Arc<DbPool>>,
    user: AuthenticatedUser,
    Path(id): Path<i32>,
    Json(payload): Json<UpdateStatusEnvioInput>,
) -> impl IntoResponse {
    if let Err(response) = require_role(&user.0, &["BUYER", "ADMIN"]) {
        return response;
    }

    let novo_status = payload.status_envio.trim().to_uppercase();
    const VALIDOS: [&str; 6] = ["CONFIRMADO", "ENVIADO", "RECEBIDO", "CONFERIDO", "CONCLUIDO", "COM_PROBLEMA"];
    if !VALIDOS.contains(&novo_status.as_str()) {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "status_envio inválido. Valores aceitos: CONFIRMADO, ENVIADO, RECEBIDO, CONFERIDO, CONCLUIDO, COM_PROBLEMA." }))).into_response();
    }

    let mut conn = pool.get().expect("Erro ao obter conexão do pool");

    let pedido = match buscar_pedido(&mut conn, id) {
        Ok(p) => p,
        Err(response) => return response,
    };

    // BUYER só mexe no próprio pedido; ADMIN tem override sobre qualquer pedido.
    if user.0.role == "BUYER" && pedido.comprador_id != user.0.sub {
        return (StatusCode::FORBIDDEN, Json(serde_json::json!({ "error": "Você só pode atualizar o envio dos seus próprios pedidos." }))).into_response();
    }

    // Logística só existe depois da aprovação.
    if pedido.status != "APROVADO" {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "O status de envio só pode avançar depois que o pedido for APROVADO." }))).into_response();
    }

    // Idempotência: pedido já concluído não pode ser concluído de novo.
    if pedido.status_envio.as_deref() == Some("CONCLUIDO") {
        return (StatusCode::CONFLICT, Json(serde_json::json!({ "error": "Pedido já concluído: a entrada em estoque não pode ser repetida." }))).into_response();
    }

    if !transicao_envio_valida(pedido.status_envio.as_deref(), &novo_status) {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": format!("Transição inválida de {} para {}. Siga a ordem: CONFIRMADO -> ENVIADO -> RECEBIDO -> CONFERIDO -> CONCLUIDO.", pedido.status_envio.as_deref().unwrap_or("—"), novo_status) }))).into_response();
    }

    // Exceção: tenta pré-preencher a observação a partir da conferência
    // (itens marcados PROBLEMA) antes de exigir que o BUYER digite tudo.
    let mut observacao = payload.observacao_problema.as_deref().map(str::trim).filter(|s| !s.is_empty()).map(str::to_string);
    if novo_status == "COM_PROBLEMA" && observacao.is_none() {
        if let Ok(itens_conf) = pedido_itens::table
            .filter(pedido_itens::pedido_id.eq(id))
            .select(PedidoItem::as_select())
            .load::<PedidoItem>(&mut conn)
        {
            let obs_itens: Vec<String> = itens_conf
                .iter()
                .filter(|i| i.status_item == "PROBLEMA")
                .filter_map(|i| i.observacao_item.clone().map(|o| o.trim().to_string()).filter(|o| !o.is_empty()).map(|o| format!("{}: {}", i.item, o)))
                .collect();
            if !obs_itens.is_empty() {
                observacao = Some(obs_itens.join("; "));
            }
        }
    }
    if novo_status == "COM_PROBLEMA" && observacao.is_none() {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "Para marcar COM_PROBLEMA é obrigatório informar observacao_problema." }))).into_response();
    }

    // CONFERIDO exige conferência item a item completa e sem problemas.
    if novo_status == "CONFERIDO" {
        match pedido_itens::table
            .filter(pedido_itens::pedido_id.eq(id))
            .select(PedidoItem::as_select())
            .load::<PedidoItem>(&mut conn)
        {
            Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao buscar itens do pedido: {}", e)).into_response(),
            Ok(itens_conf) => {
                if itens_conf.iter().any(|i| i.status_item == "PENDENTE") {
                    return (StatusCode::CONFLICT, Json(serde_json::json!({ "error": "Conferência incompleta: há itens ainda PENDENTES. Avalie todos os itens antes de avançar para CONFERIDO." }))).into_response();
                }
                if itens_conf.iter().any(|i| i.status_item == "PROBLEMA") {
                    return (StatusCode::CONFLICT, Json(serde_json::json!({ "error": "Há itens marcados com PROBLEMA na conferência. Reporte COM_PROBLEMA no pedido ou corrija a conferência antes de avançar para CONFERIDO." }))).into_response();
                }
            }
        }
    }

    // Conclusão: baixa/entrada em estoque dentro de uma transação (idempotente + atômica).
    if novo_status == "CONCLUIDO" {
        let itens = match pedido_itens::table
            .filter(pedido_itens::pedido_id.eq(id))
            .select(PedidoItem::as_select())
            .load::<PedidoItem>(&mut conn)
        {
            Ok(lista) => lista,
            Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao buscar itens do pedido: {}", e)).into_response(),
        };

        // Item sem EAN não pode subir ao estoque automaticamente.
        if let Some(sem_ean) = itens.iter().find(|i| i.ean.as_deref().map(str::trim).filter(|s| !s.is_empty()).is_none()) {
            return (StatusCode::UNPROCESSABLE_ENTITY, Json(serde_json::json!({ "error": format!("O item '{}' não possui EAN e não pode subir ao estoque automaticamente. Cadastre o EAN no item antes de concluir.", sem_ean.item) }))).into_response();
        }

        let resultado = conn.transaction::<PedidoCompra, diesel::result::Error, _>(|conn| {
            let pedido_atualizado = diesel::update(pedidos_compra::table.find(id))
                .set((
                    pedidos_compra::status_envio.eq("CONCLUIDO"),
                    pedidos_compra::observacao_problema.eq::<Option<String>>(None),
                    pedidos_compra::updated_at.eq(Utc::now().naive_utc()),
                ))
                .get_result::<PedidoCompra>(conn)?;

            for item in &itens {
                // Sobe ao estoque a quantidade efetivamente recebida
                // (pode ser menor que a pedida após problema parcialmente resolvido).
                let qtd_recebida = item.quantidade_recebida.unwrap_or(item.quantidade);
                // EAN já validado acima: sempre Some aqui.
                let ean = item.ean.clone().unwrap_or_default();
                let existente = produtos::table
                    .filter(produtos::ean.eq(&ean))
                    .select(Produto::as_select())
                    .first::<Produto>(conn)
                    .optional()?;

                match existente {
                    Some(_) => {
                        diesel::update(produtos::table.filter(produtos::ean.eq(&ean)))
                            .set((
                                produtos::quantidade_estoque.eq(produtos::quantidade_estoque + qtd_recebida),
                                produtos::updated_at.eq(Utc::now().naive_utc()),
                            ))
                            .execute(conn)?;
                    }
                    None => {
                        // EAN inédito: cria o produto usando nome e valor unitário do item
                        // (o ADMIN pode ajustar nome/preço depois no inventário).
                        diesel::insert_into(produtos::table)
                            .values(&NewProduto {
                                nome: item.item.clone(),
                                ean,
                                preco_compra: item.valor_unitario.clone(),
                                quantidade_estoque: qtd_recebida,
                            })
                            .execute(conn)?;
                    }
                }
            }

            Ok(pedido_atualizado)
        });

        return match resultado {
            Ok(p) => (StatusCode::OK, Json(p)).into_response(),
            Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao concluir pedido e atualizar estoque: {}", e)).into_response(),
        };
    }

    // Transições simples (sem efeito no estoque).
    let nova_observacao: Option<String> = if novo_status == "COM_PROBLEMA" { observacao } else { None };
    match diesel::update(pedidos_compra::table.find(id))
        .set((
            pedidos_compra::status_envio.eq(&novo_status),
            pedidos_compra::observacao_problema.eq(&nova_observacao),
            pedidos_compra::updated_at.eq(Utc::now().naive_utc()),
        ))
        .get_result::<PedidoCompra>(&mut conn)
    {
        Ok(p) => (StatusCode::OK, Json(p)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao atualizar status de envio: {}", e)).into_response(),
    }
}

/// PUT /api/pedidos-compra/:id/conferencia — BUYER dono do pedido ou ADMIN (override).
/// Salva a conferência item a item. Só na etapa RECEBIDO do fluxo de envio.
pub async fn salvar_conferencia_handler(
    State(pool): State<Arc<DbPool>>,
    user: AuthenticatedUser,
    Path(id): Path<i32>,
    Json(payload): Json<ConferenciaPedidoInput>,
) -> impl IntoResponse {
    if let Err(response) = require_role(&user.0, &["BUYER", "ADMIN"]) {
        return response;
    }

    let mut conn = pool.get().expect("Erro ao obter conexão do pool");

    let pedido = match buscar_pedido(&mut conn, id) {
        Ok(p) => p,
        Err(response) => return response,
    };

    // BUYER só confere o próprio pedido; ADMIN tem override sobre qualquer pedido.
    if user.0.role == "BUYER" && pedido.comprador_id != user.0.sub {
        return (StatusCode::FORBIDDEN, Json(serde_json::json!({ "error": "Você só pode conferir os seus próprios pedidos." }))).into_response();
    }

    // Conferência acontece na etapa RECEBIDO.
    if pedido.status_envio.as_deref() != Some("RECEBIDO") {
        return (StatusCode::CONFLICT, Json(serde_json::json!({ "error": format!("A conferência só pode ser preenchida quando o pedido está RECEBIDO. Estado atual: {}.", pedido.status_envio.as_deref().unwrap_or("—")) }))).into_response();
    }

    // Validação por item antes de tocar o banco.
    for item in &payload.itens {
        let status_item = item.status_item.trim().to_uppercase();
        if status_item != "OK" && status_item != "PROBLEMA" {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "status_item inválido. Valores aceitos: OK, PROBLEMA." }))).into_response();
        }
        if item.quantidade_recebida < 0 {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "quantidade_recebida deve ser maior ou igual a zero." }))).into_response();
        }
        if status_item == "PROBLEMA" {
            let obs = item.observacao_item.as_deref().map(str::trim).filter(|s| !s.is_empty());
            if obs.is_none() {
                return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "observacao_item é obrigatória quando status_item é PROBLEMA." }))).into_response();
            }
        }
    }

    let agora = Utc::now().naive_utc();
    let resultado = conn.transaction::<Vec<PedidoItem>, diesel::result::Error, _>(|conn| {
        for item in &payload.itens {
            let status_item = item.status_item.trim().to_uppercase();
            let obs: Option<String> = item.observacao_item.clone().map(|o| o.trim().to_string()).filter(|o| !o.is_empty());
            // Filtro por id + pedido_id: nunca altera itens de outro pedido.
            diesel::update(
                pedido_itens::table
                    .filter(pedido_itens::id.eq(item.item_id))
                    .filter(pedido_itens::pedido_id.eq(id)),
            )
            .set((
                pedido_itens::quantidade_recebida.eq(item.quantidade_recebida),
                pedido_itens::status_item.eq(status_item),
                pedido_itens::observacao_item.eq(obs),
                pedido_itens::updated_at.eq(agora),
            ))
            .execute(conn)?;
        }

        pedido_itens::table
            .filter(pedido_itens::pedido_id.eq(id))
            .select(PedidoItem::as_select())
            .load::<PedidoItem>(conn)
    });

    match resultado {
        Ok(lista) => (StatusCode::OK, Json(lista)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao salvar conferência: {}", e)).into_response(),
    }
}