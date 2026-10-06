use axum::{extract::{State, Path}, Json, response::IntoResponse, http::StatusCode};
use diesel::prelude::*;
use std::sync::Arc;
use chrono::Utc;

use crate::{
    db::DbPool,
    auth::middleware::{AuthenticatedUser, require_role},
    models::cliente_model::{Cliente, NewCliente, UpdateCliente},
    schema::clientes,
};

/// Normaliza o CPF para somente dígitos.
fn normalizar_cpf(cpf: &str) -> String {
    cpf.chars().filter(|c| c.is_ascii_digit()).collect()
}

fn validar_novo_cliente(nome: &str, cpf: &str, email: &Option<String>) -> Result<String, String> {
    if nome.trim().is_empty() {
        return Err("Nome do cliente é obrigatório.".to_string());
    }
    let cpf_norm = normalizar_cpf(cpf);
    if cpf_norm.len() != 11 {
        return Err("CPF inválido: deve conter 11 dígitos.".to_string());
    }
    if let Some(e) = email.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
        if !e.contains('@') {
            return Err("E-mail inválido.".to_string());
        }
    }
    Ok(cpf_norm)
}

fn email_ou_none(email: &Option<String>) -> Option<String> {
    email.clone().map(|e| e.trim().to_string()).filter(|e| !e.is_empty())
}

fn conflito_cpf() -> (StatusCode, Json<serde_json::Value>) {
    (StatusCode::CONFLICT, Json(serde_json::json!({ "error": "Já existe um cliente com este CPF." })))
}

/// POST /api/clientes — ADMIN ou SELLER.
pub async fn create_cliente_handler(
    State(pool): State<Arc<DbPool>>,
    user: AuthenticatedUser,
    Json(payload): Json<NewCliente>,
) -> impl IntoResponse {
    if let Err(response) = require_role(&user.0, &["ADMIN", "SELLER"]) {
        return response;
    }

    let cpf_norm = match validar_novo_cliente(&payload.nome, &payload.cpf, &payload.email) {
        Ok(c) => c,
        Err(msg) => return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": msg }))).into_response(),
    };

    let mut conn = pool.get().expect("Erro ao obter conexão do pool");

    let existente = clientes::table
        .filter(clientes::cpf.eq(&cpf_norm))
        .select(clientes::id)
        .first::<i32>(&mut conn)
        .optional();

    match existente {
        Ok(Some(_)) => return conflito_cpf().into_response(),
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao validar CPF: {}", e)).into_response(),
        Ok(None) => {}
    }

    let novo = NewCliente {
        nome: payload.nome.trim().to_string(),
        cpf: cpf_norm,
        email: email_ou_none(&payload.email),
    };

    match diesel::insert_into(clientes::table)
        .values(&novo)
        .get_result::<Cliente>(&mut conn)
    {
        Ok(cliente) => (StatusCode::CREATED, Json(cliente)).into_response(),
        Err(e) => {
            let msg = e.to_string();
            if msg.contains("idx_clientes_cpf") || msg.contains("clientes_cpf_key") || msg.contains("duplicate key") {
                return conflito_cpf().into_response();
            }
            (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao criar cliente: {}", e)).into_response()
        }
    }
}

/// GET /api/clientes — ADMIN ou SELLER.
pub async fn list_clientes_handler(
    State(pool): State<Arc<DbPool>>,
    user: AuthenticatedUser,
) -> impl IntoResponse {
    if let Err(response) = require_role(&user.0, &["ADMIN", "SELLER"]) {
        return response;
    }

    let mut conn = pool.get().expect("Erro ao obter conexão do pool");

    match clientes::table
        .select(Cliente::as_select())
        .order(clientes::nome.asc())
        .load::<Cliente>(&mut conn)
    {
        Ok(lista) => Json(lista).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao listar clientes: {}", e)).into_response(),
    }
}

/// GET /api/clientes/:id — ADMIN ou SELLER.
pub async fn get_cliente_handler(
    State(pool): State<Arc<DbPool>>,
    user: AuthenticatedUser,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    if let Err(response) = require_role(&user.0, &["ADMIN", "SELLER"]) {
        return response;
    }

    let mut conn = pool.get().expect("Erro ao obter conexão do pool");

    match clientes::table
        .find(id)
        .select(Cliente::as_select())
        .first::<Cliente>(&mut conn)
    {
        Ok(cliente) => Json(cliente).into_response(),
        Err(diesel::result::Error::NotFound) => (StatusCode::NOT_FOUND, Json(serde_json::json!({ "error": "Cliente não encontrado." }))).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao buscar cliente: {}", e)).into_response(),
    }
}

/// PUT /api/clientes/:id — ADMIN ou SELLER.
pub async fn update_cliente_handler(
    State(pool): State<Arc<DbPool>>,
    user: AuthenticatedUser,
    Path(id): Path<i32>,
    Json(payload): Json<UpdateCliente>,
) -> impl IntoResponse {
    if let Err(response) = require_role(&user.0, &["ADMIN", "SELLER"]) {
        return response;
    }

    let nome = payload.nome.map(|n| n.trim().to_string());
    if let Some(ref n) = nome {
        if n.is_empty() {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "Nome do cliente não pode ser vazio." }))).into_response();
        }
    }

    let cpf = match payload.cpf {
        Some(c) => {
            let norm = normalizar_cpf(&c);
            if norm.len() != 11 {
                return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "CPF inválido: deve conter 11 dígitos." }))).into_response();
            }
            Some(norm)
        }
        None => None,
    };

    // None = não alterar. String vazia também não altera (limpeza de e-mail
    // não é suportada via PUT; o campo permanece como está).
    let email: Option<String> = match payload.email {
        None => None,
        Some(e) => {
            let e = e.trim().to_string();
            if e.is_empty() {
                None
            } else {
                if !e.contains('@') {
                    return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "E-mail inválido." }))).into_response();
                }
                Some(e)
            }
        }
    };

    let mut conn = pool.get().expect("Erro ao obter conexão do pool");

    // CPF em uso por outro cliente?
    if let Some(ref cpf_norm) = cpf {
        match clientes::table
            .filter(clientes::cpf.eq(cpf_norm))
            .filter(clientes::id.ne(id))
            .select(clientes::id)
            .first::<i32>(&mut conn)
            .optional()
        {
            Ok(Some(_)) => return conflito_cpf().into_response(),
            Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao validar CPF: {}", e)).into_response(),
            Ok(None) => {}
        }
    }

    let alteracao = UpdateCliente { nome, cpf, email };

    match diesel::update(clientes::table.find(id))
        .set((
            &alteracao,
            clientes::updated_at.eq(Utc::now().naive_utc()),
        ))
        .get_result::<Cliente>(&mut conn)
    {
        Ok(cliente) => (StatusCode::OK, Json(cliente)).into_response(),
        Err(diesel::result::Error::NotFound) => (StatusCode::NOT_FOUND, Json(serde_json::json!({ "error": "Cliente não encontrado." }))).into_response(),
        Err(e) => {
            let msg = e.to_string();
            if msg.contains("idx_clientes_cpf") || msg.contains("clientes_cpf_key") || msg.contains("duplicate key") {
                return conflito_cpf().into_response();
            }
            (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao atualizar cliente: {}", e)).into_response()
        }
    }
}

/// DELETE /api/clientes/:id — apenas ADMIN.
/// Vendas vinculadas são preservadas (cliente_id vira NULL — ON DELETE SET NULL).
pub async fn delete_cliente_handler(
    State(pool): State<Arc<DbPool>>,
    user: AuthenticatedUser,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    if let Err(response) = require_role(&user.0, &["ADMIN"]) {
        return response;
    }

    let mut conn = pool.get().expect("Erro ao obter conexão do pool");

    match diesel::delete(clientes::table.find(id)).execute(&mut conn) {
        Ok(count) if count > 0 => StatusCode::NO_CONTENT.into_response(),
        Ok(_) => (StatusCode::NOT_FOUND, Json(serde_json::json!({ "error": "Cliente não encontrado." }))).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao excluir cliente: {}", e)).into_response(),
    }
}
