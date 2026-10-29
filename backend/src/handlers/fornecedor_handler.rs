use axum::{extract::{State, Path}, Json, response::IntoResponse, http::StatusCode};
use diesel::prelude::*;
use std::sync::Arc;
use chrono::Utc;

use crate::{
    db::{conn_or_503, DbPool},
    auth::middleware::{AuthenticatedUser, require_role},
    models::fornecedor_model::{Fornecedor, NewFornecedor, UpdateFornecedor},
    schema::fornecedores,
};

pub async fn create_fornecedor_handler(
    State(pool): State<Arc<DbPool>>,
    user: AuthenticatedUser,
    Json(payload): Json<NewFornecedor>,
) -> impl IntoResponse {
    if let Err(response) = require_role(&user.0, &["ADMIN", "BUYER"]) {
        return response;
    }

    let mut conn = match conn_or_503(&pool) {
        Ok(c) => c,
        Err(r) => return r,
    };

    match diesel::insert_into(fornecedores::table)
        .values(&payload)
        .get_result::<Fornecedor>(&mut conn)
    {
        Ok(novo_fornecedor) => (StatusCode::CREATED, Json(novo_fornecedor)).into_response(),
        Err(e) => {
            eprintln!("Erro ao inserir fornecedor: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": "Erro interno ao processar a requisição." }))).into_response()
        }
    }
}

pub async fn list_fornecedores_handler(
    State(pool): State<Arc<DbPool>>,
    user: AuthenticatedUser,
) -> impl IntoResponse {
    if let Err(response) = require_role(&user.0, &["ADMIN", "BUYER"]) {
        return response;
    }

    let mut conn = match conn_or_503(&pool) {
        Ok(c) => c,
        Err(r) => return r,
    };

    match fornecedores::table
        .load::<Fornecedor>(&mut conn)
    {
        Ok(lista) => Json(lista).into_response(),
        Err(e) => {
            eprintln!("Erro ao listar fornecedores: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": "Erro interno ao processar a requisição." }))).into_response()
        }
    }
}

pub async fn update_fornecedor_handler(
    State(pool): State<Arc<DbPool>>,
    user: AuthenticatedUser,
    Path(id): Path<i32>,
    Json(payload): Json<UpdateFornecedor>,
) -> impl IntoResponse {
    if let Err(response) = require_role(&user.0, &["ADMIN", "BUYER"]) {
        return response;
    }

    let mut conn = match conn_or_503(&pool) {
        Ok(c) => c,
        Err(r) => return r,
    };

    let fornecedor_atualizado = diesel::update(fornecedores::table.find(id))
        .set((
            &payload,
            fornecedores::updated_at.eq(Utc::now().naive_utc()),
        ))
        .get_result::<Fornecedor>(&mut conn);

    match fornecedor_atualizado {
        Ok(f) => (StatusCode::OK, Json(f)).into_response(),
        Err(diesel::result::Error::NotFound) => (StatusCode::NOT_FOUND, Json(serde_json::json!({ "error": "Fornecedor não encontrado." }))).into_response(),
        Err(e) => {
            eprintln!("Erro ao atualizar fornecedor: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": "Erro interno ao processar a requisição." }))).into_response()
        }
    }
}

pub async fn delete_fornecedor_handler(
    State(pool): State<Arc<DbPool>>,
    user: AuthenticatedUser,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    if let Err(response) = require_role(&user.0, &["ADMIN", "BUYER"]) {
        return response;
    }

    let mut conn = match conn_or_503(&pool) {
        Ok(c) => c,
        Err(r) => return r,
    };

    match diesel::delete(fornecedores::table.find(id)).execute(&mut conn) {
        Ok(count) if count > 0 => StatusCode::NO_CONTENT.into_response(),
        Ok(_) => (StatusCode::NOT_FOUND, Json(serde_json::json!({ "error": "Fornecedor não encontrado." }))).into_response(),
        Err(diesel::result::Error::DatabaseError(diesel::result::DatabaseErrorKind::ForeignKeyViolation, _)) => {
            (StatusCode::CONFLICT, Json(serde_json::json!({ "error": "Não é possível excluir: existem pedidos de compra vinculados a este fornecedor." }))).into_response()
        }
        Err(e) => {
            eprintln!("Erro ao excluir fornecedor: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": "Erro interno ao processar a requisição." }))).into_response()
        }
    }
}
