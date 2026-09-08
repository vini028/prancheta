use axum::{extract::{State, Path}, Json, response::IntoResponse, http::StatusCode};
use diesel::prelude::*;
use std::sync::Arc;
use chrono::Utc;

use crate::{
    auth::middleware::{AuthenticatedUser, require_role}, db::DbPool, models::pedido_model::{CreatePedidoInput, NewPedidoCompra, NewPedidoItem, PedidoCompra, PedidoCompraResponse, PedidoItem, UpdatePedidoInput, UpdatePedidoStatusInput}, schema::{pedido_itens, pedidos_compra, users},
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