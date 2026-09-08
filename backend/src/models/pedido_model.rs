use serde::{Deserialize, Serialize};
use diesel::prelude::*;
use crate::schema::{pedidos_compra, pedido_itens};
use chrono::NaiveDateTime;
use bigdecimal::BigDecimal;
use uuid::Uuid;

#[derive(Queryable, Selectable, Serialize, Debug)]
#[diesel(table_name = pedidos_compra)]
pub struct PedidoCompra {
    pub id: i32,
    pub fornecedor_id: i32,
    pub status: String,
    pub comprador_id: Uuid,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Serialize, Debug)]
pub struct PedidoCompraResponse {
    pub id: i32,
    pub fornecedor_id: i32,
    pub status: String,
    pub comprador_id: Uuid,
    pub comprador_nome: String,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Insertable, Deserialize, Debug)]
#[diesel(table_name = pedidos_compra)]
pub struct NewPedidoCompra {
    pub fornecedor_id: i32,
    pub status: String,
    pub comprador_id: Uuid,
}

#[derive(Queryable, Selectable, Serialize, Debug)]
#[diesel(table_name = pedido_itens)]
pub struct PedidoItem {
    pub id: i32,
    pub pedido_id: i32,
    pub item: String,
    pub ean: Option<String>,
    pub quantidade: i32,
    pub valor_unitario: BigDecimal,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Insertable, Deserialize, Debug)]
#[diesel(table_name = pedido_itens)]
pub struct NewPedidoItem {
    pub pedido_id: i32,
    pub item: String,
    pub ean: Option<String>,
    pub quantidade: i32,
    pub valor_unitario: BigDecimal,
}

// DTOs for API
#[derive(Deserialize, Debug)]
pub struct CreatePedidoItemInput {
    pub item: String,
    pub ean: Option<String>,
    pub quantidade: i32,
    pub valor_unitario: BigDecimal,
}

#[derive(Deserialize, Debug)]
pub struct CreatePedidoInput {
    pub fornecedor_id: i32,
    pub itens: Vec<CreatePedidoItemInput>,
}

#[derive(Deserialize, Debug)]
pub struct UpdatePedidoInput {
    pub fornecedor_id: i32,
    pub itens: Vec<CreatePedidoItemInput>,
}

#[derive(Deserialize, Debug)]
pub struct UpdatePedidoStatusInput {
    pub status: String,
}