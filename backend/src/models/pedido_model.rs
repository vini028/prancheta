use serde::{Deserialize, Serialize};
use diesel::prelude::*;
use crate::schema::pedidos_compra;
use chrono::NaiveDateTime;
use bigdecimal::BigDecimal;
use uuid::Uuid;

#[derive(Queryable, Selectable, Insertable, Serialize, Deserialize, Debug)]
#[diesel(table_name = pedidos_compra)]
pub struct PedidoCompra {
    pub id: i32,
    pub fornecedor_id: i32,
    pub item: String,
    pub quantidade: i32,
    pub valor_total: BigDecimal,
    pub comprador_id: Uuid,
    pub created_at: NaiveDateTime,
}

#[derive(Insertable, Deserialize, Debug)]
#[diesel(table_name = pedidos_compra)]
pub struct NewPedidoCompra {
    pub fornecedor_id: i32,
    pub item: String,
    pub quantidade: i32,
    pub valor_total: BigDecimal,
    #[serde(default)]
    pub comprador_id: Uuid,
}
