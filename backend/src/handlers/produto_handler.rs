use axum::{extract::{State, Path}, Json, response::IntoResponse, http::StatusCode};
use diesel::prelude::*;
use std::sync::Arc;
use chrono::Utc;

use crate::{
    db::DbPool,
    auth::middleware::{AuthenticatedUser, require_role},
    models::produto_model::{Produto, NewProduto, UpdateProduto},
    schema::produtos,
};

pub async fn create_produto_handler(
    State(pool): State<Arc<DbPool>>,
    user: AuthenticatedUser,
    Json(payload): Json<NewProduto>,
) -> impl IntoResponse {
    if let Err(response) = require_role(&user.0, &["ADMIN"]) {
        return response;
    }

    let mut conn = pool.get().expect("Erro ao obter conexão do pool");

    // Valida EAN único antes de inserir
    let existente = produtos::table
        .filter(produtos::ean.eq(&payload.ean))
        .select(Produto::as_select())
        .first::<Produto>(&mut conn)
        .optional();

    match existente {
        Ok(Some(_)) => {
            return (StatusCode::CONFLICT, Json(serde_json::json!({ "error": "Já existe um produto com este EAN." }))).into_response();
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
