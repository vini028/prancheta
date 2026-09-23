use serde::{Deserialize, Serialize};
use diesel::prelude::*;
use crate::schema::produtos;
use chrono::NaiveDateTime;
use bigdecimal::BigDecimal;

#[derive(Queryable, Selectable, Serialize, Debug)]
#[diesel(table_name = produtos)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct Produto {
    pub id: i32,
    pub nome: String,
    pub ean: String,
    pub preco_compra: BigDecimal,
    // Coluna gerada pelo Postgres (preco_compra * 1.30): somente leitura.
    pub preco_venda: BigDecimal,
    pub quantidade_estoque: i32,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Insertable, Deserialize, Debug)]
#[diesel(table_name = produtos)]
pub struct NewProduto {
    pub nome: String,
    pub ean: String,
    pub preco_compra: BigDecimal,
    pub quantidade_estoque: i32,
}

#[derive(Deserialize, Debug, AsChangeset)]
#[diesel(table_name = produtos)]
pub struct UpdateProduto {
    pub nome: Option<String>,
    pub preco_compra: Option<BigDecimal>,
    pub quantidade_estoque: Option<i32>,
}
