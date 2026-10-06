use serde::{Deserialize, Serialize};
use diesel::prelude::*;
use crate::schema::{vendas, itens_venda};
use chrono::NaiveDateTime;
use bigdecimal::BigDecimal;
use uuid::Uuid;

/// Métodos de pagamento aceitos no PDV.
pub const METODOS_PAGAMENTO_VALIDOS: [&str; 4] =
    ["DINHEIRO", "PIX", "CARTAO_CREDITO", "CARTAO_DEBITO"];

/// Desconto de fidelidade: venda com cliente cadastrado.
pub const DESCONTO_CLIENTE_PCT: &str = "0.05";
/// Desconto adicional do meio de pagamento à vista (DINHEIRO/PIX),
/// aplicado sobre o valor restante após o desconto de fidelidade.
pub const DESCONTO_PAGAMENTO_PCT: &str = "0.05";

#[derive(Queryable, Selectable, Serialize, Debug)]
#[diesel(table_name = vendas)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct Venda {
    pub id: i32,
    /// None = "cliente não identificado" (sem desconto fidelidade).
    pub cliente_id: Option<i32>,
    pub vendedor_id: Uuid,
    pub metodo_pagamento: String,
    pub subtotal: BigDecimal,
    pub desconto_total: BigDecimal,
    pub valor_final: BigDecimal,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Insertable, Debug)]
#[diesel(table_name = vendas)]
pub struct NewVenda {
    pub cliente_id: Option<i32>,
    pub vendedor_id: Uuid,
    pub metodo_pagamento: String,
    pub subtotal: BigDecimal,
    pub desconto_total: BigDecimal,
    pub valor_final: BigDecimal,
}

#[derive(Queryable, Selectable, Serialize, Debug)]
#[diesel(table_name = itens_venda)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct ItemVenda {
    pub id: i32,
    pub venda_id: i32,
    pub produto_id: i32,
    pub quantidade: i32,
    pub preco_unitario: BigDecimal,
    pub subtotal: BigDecimal,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Insertable, Debug)]
#[diesel(table_name = itens_venda)]
pub struct NewItemVenda {
    pub venda_id: i32,
    pub produto_id: i32,
    pub quantidade: i32,
    pub preco_unitario: BigDecimal,
    pub subtotal: BigDecimal,
}

// ---------- DTOs da API ----------

#[derive(Deserialize, Debug)]
pub struct CheckoutItemInput {
    pub produto_id: i32,
    pub quantidade: i32,
}

#[derive(Deserialize, Debug)]
pub struct CheckoutVendaInput {
    /// Opcional: None = "cliente não identificado".
    pub cliente_id: Option<i32>,
    pub metodo_pagamento: String,
    pub itens: Vec<CheckoutItemInput>,
}

#[derive(Serialize, Debug)]
pub struct ItemVendaResponse {
    pub produto_id: i32,
    pub produto_nome: String,
    pub quantidade: i32,
    pub preco_unitario: BigDecimal,
    pub subtotal: BigDecimal,
}

#[derive(Serialize, Debug)]
pub struct CheckoutVendaResponse {
    pub id: i32,
    pub cliente_id: Option<i32>,
    pub vendedor_id: Uuid,
    pub metodo_pagamento: String,
    pub subtotal: BigDecimal,
    pub desconto_total: BigDecimal,
    /// Detalhamento para o resumo financeiro do PDV.
    pub desconto_cliente: BigDecimal,
    pub desconto_pagamento: BigDecimal,
    pub valor_final: BigDecimal,
    pub itens: Vec<ItemVendaResponse>,
    pub created_at: NaiveDateTime,
}
