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

/// Entrada de estoque para produto já existente (por EAN ou ID):
/// soma `quantidade` ao estoque e atualiza `preco_compra` para o valor
/// mais recente. O `preco_venda` é recalculado automaticamente pelo
/// PostgreSQL (coluna gerada `ROUND(preco_compra * 1.30, 2) STORED`).
#[derive(Deserialize, Debug)]
pub struct EntradaEstoqueInput {
    pub ean: Option<String>,
    pub produto_id: Option<i32>,
    pub preco_compra: BigDecimal,
    pub quantidade: i32,
}
