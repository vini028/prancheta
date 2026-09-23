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
    pub status_envio: Option<String>,
    pub observacao_problema: Option<String>,
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
    pub status_envio: Option<String>,
    pub observacao_problema: Option<String>,
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
    pub quantidade_recebida: Option<i32>,
    pub status_item: String,
    pub observacao_item: Option<String>,
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

#[derive(Deserialize, Debug)]
pub struct UpdateStatusEnvioInput {
    pub status_envio: String,
    pub observacao_problema: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct ConferenciaItemInput {
    pub item_id: i32,
    pub quantidade_recebida: i32,
    pub status_item: String,
    pub observacao_item: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct ConferenciaPedidoInput {
    pub itens: Vec<ConferenciaItemInput>,
}