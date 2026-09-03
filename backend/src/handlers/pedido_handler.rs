use axum::{extract::State, Json, response::IntoResponse, http::StatusCode};
use diesel::prelude::*;
use std::sync::Arc;

use crate::{
    db::DbPool,
    auth::middleware::{AuthenticatedUser, require_role},
    models::pedido_model::{PedidoCompra, NewPedidoCompra},
    schema::pedidos_compra,
};

pub async fn create_pedido_handler(
    State(pool): State<Arc<DbPool>>,
    user: AuthenticatedUser,
    Json(mut payload): Json<NewPedidoCompra>,
) -> impl IntoResponse {
    if let Err(response) = require_role(&user.0, &["ADMIN", "BUYER"]) {
        return response;
    }

    payload.comprador_id = user.0.sub;
    let mut conn = pool.get().expect("Erro ao obter conexão do pool");

    let novo_pedido = diesel::insert_into(pedidos_compra::table)
        .values(&payload)
        .get_result::<PedidoCompra>(&mut conn)
        .expect("Erro ao inserir pedido");

    (StatusCode::CREATED, Json(novo_pedido)).into_response()
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
        .load::<PedidoCompra>(&mut conn)
        .expect("Erro ao listar pedidos");

    Json(lista).into_response()
}
