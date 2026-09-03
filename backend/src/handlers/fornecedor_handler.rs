use axum::{extract::State, Json, response::IntoResponse, http::StatusCode};
use diesel::prelude::*;
use std::sync::Arc;

use crate::{
    db::DbPool,
    auth::middleware::{AuthenticatedUser, require_role},
    models::fornecedor_model::{Fornecedor, NewFornecedor},
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
