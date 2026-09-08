use axum::{extract::{State, Path}, Json, response::IntoResponse, http::StatusCode};
use diesel::prelude::*;
use std::sync::Arc;
use chrono::Utc;

use crate::{
    db::DbPool,
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

    let mut conn = pool.get().expect("Erro ao obter conexão do pool");

    let novo_fornecedor = diesel::insert_into(fornecedores::table)
        .values(&payload)
        .get_result::<Fornecedor>(&mut conn)
        .expect("Erro ao inserir fornecedor");

    (StatusCode::CREATED, Json(novo_fornecedor)).into_response()
}

pub async fn list_fornecedores_handler(
    State(pool): State<Arc<DbPool>>,
    user: AuthenticatedUser,
) -> impl IntoResponse {
    if let Err(response) = require_role(&user.0, &["ADMIN", "BUYER"]) {
        return response;
    }

    let mut conn = pool.get().expect("Erro ao obter conexão do pool");

    let lista = fornecedores::table
        .load::<Fornecedor>(&mut conn)
        .expect("Erro ao listar fornecedores");

    Json(lista).into_response()
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

    let mut conn = pool.get().expect("Erro ao obter conexão do pool");

    let fornecedor_atualizado = diesel::update(fornecedores::table.find(id))
        .set((
            &payload,
            fornecedores::updated_at.eq(Utc::now().naive_utc()),
        ))
        .get_result::<Fornecedor>(&mut conn);

    match fornecedor_atualizado {
        Ok(f) => (StatusCode::OK, Json(f)).into_response(),
        Err(_) => (StatusCode::NOT_FOUND, "Fornecedor não encontrado").into_response(),
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

    let mut conn = pool.get().expect("Erro ao obter conexão do pool");

    let linhas_afetadas = diesel::delete(fornecedores::table.find(id))
        .execute(&mut conn)
        .expect("Erro ao deletar fornecedor");

    if linhas_afetadas > 0 {
        (StatusCode::NO_CONTENT).into_response()
    } else {
        (StatusCode::NOT_FOUND, "Fornecedor não encontrado").into_response()
    }
}
