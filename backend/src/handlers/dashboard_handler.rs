use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use chrono::{Datelike, Utc};
use diesel::prelude::*;
use std::sync::Arc;

use crate::{
    auth::middleware::{AuthenticatedUser, require_role},
    db::DbPool,
    schema::{pedido_itens, pedidos_compra, produtos, vendas},
};

#[derive(serde::Serialize)]
pub struct AdminDashboardResponse {
    pub produtos_baixo_estoque: i64,
    pub total_vendas_mensal: f64,
    pub total_compras_mensal: f64,
    pub faturamento_liquido: f64,
}

#[derive(serde::Serialize)]
pub struct SellerDashboardResponse {
    pub total_vendas_count: i64,
    pub total_vendas_valor: f64,
    pub comissao_valor: f64,
}

#[derive(serde::Serialize)]
pub struct BuyerDashboardResponse {
    pub produtos_baixo_estoque: i64,
    pub total_compras_mensal: f64,
}

pub async fn admin_dashboard_handler(
    State(pool): State<Arc<DbPool>>,
    user: AuthenticatedUser,
) -> impl IntoResponse {
    if let Err(response) = require_role(&user.0, &["ADMIN"]) {
        return response;
    }

    let mut conn = match pool.get() {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro de conexão: {}", e)).into_response(),
    };

    let now = Utc::now().naive_utc();
    let cur_year = now.year();
    let cur_month = now.month();

    // Produtos baixo estoque (<= 5)
    let prod_list: Result<Vec<crate::models::produto_model::Produto>, _> = produtos::table.load(&mut conn);
    let produtos_baixo_estoque = match prod_list {
        Ok(prods) => prods.into_iter().filter(|p| p.quantidade_estoque <= 5).count() as i64,
        Err(_) => 0,
    };

    // Vendas do mês
    let vendas_list: Result<Vec<crate::models::venda_model::Venda>, _> = vendas::table.load(&mut conn);
    let total_vendas_mensal = match vendas_list {
        Ok(vs) => vs
            .into_iter()
            .filter(|v| v.created_at.year() == cur_year && v.created_at.month() == cur_month)
            .map(|v| v.valor_final.to_string().parse::<f64>().unwrap_or(0.0))
            .sum::<f64>(),
        Err(_) => 0.0,
    };

    // Compras do mês (pedido_itens JOIN pedidos_compra)
    let itens_compras: Result<Vec<(crate::models::pedido_model::PedidoItem, crate::models::pedido_model::PedidoCompra)>, _> = pedido_itens::table
        .inner_join(pedidos_compra::table)
        .load(&mut conn);

    let total_compras_mensal = match itens_compras {
        Ok(itens) => itens
            .into_iter()
            .filter(|(_, p)| p.created_at.year() == cur_year && p.created_at.month() == cur_month)
            .map(|(item, _)| {
                let qtd = item.quantidade as f64;
                let val = item.valor_unitario.to_string().parse::<f64>().unwrap_or(0.0);
                qtd * val
            })
            .sum::<f64>(),
        Err(_) => 0.0,
    };

    let comissao = total_vendas_mensal * 0.05;
    let faturamento_liquido = total_vendas_mensal - total_compras_mensal - comissao;

    Json(AdminDashboardResponse {
        produtos_baixo_estoque,
        total_vendas_mensal,
        total_compras_mensal,
        faturamento_liquido,
    }).into_response()
}

pub async fn seller_dashboard_handler(
    State(pool): State<Arc<DbPool>>,
    user: AuthenticatedUser,
) -> impl IntoResponse {
    if let Err(response) = require_role(&user.0, &["ADMIN", "SELLER"]) {
        return response;
    }

    let mut conn = match pool.get() {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro de conexão: {}", e)).into_response(),
    };

    let now = Utc::now().naive_utc();
    let cur_year = now.year();
    let cur_month = now.month();
    let seller_id = user.0.sub;

    let vendas_list: Result<Vec<crate::models::venda_model::Venda>, _> = vendas::table
        .filter(vendas::vendedor_id.eq(seller_id))
        .load(&mut conn);

    let (total_vendas_count, total_vendas_valor) = match vendas_list {
        Ok(vs) => {
            let filtered: Vec<_> = vs
                .into_iter()
                .filter(|v| v.created_at.year() == cur_year && v.created_at.month() == cur_month)
                .collect();
            let count = filtered.len() as i64;
            let valor = filtered
                .iter()
                .map(|v| v.valor_final.to_string().parse::<f64>().unwrap_or(0.0))
                .sum::<f64>();
            (count, valor)
        }
        Err(_) => (0, 0.0),
    };

    let comissao_valor = total_vendas_valor * 0.05;

    Json(SellerDashboardResponse {
        total_vendas_count,
        total_vendas_valor,
        comissao_valor,
    }).into_response()
}

pub async fn buyer_dashboard_handler(
    State(pool): State<Arc<DbPool>>,
    user: AuthenticatedUser,
) -> impl IntoResponse {
    if let Err(response) = require_role(&user.0, &["ADMIN", "BUYER"]) {
        return response;
    }

    let mut conn = match pool.get() {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro de conexão: {}", e)).into_response(),
    };

    let now = Utc::now().naive_utc();
    let cur_year = now.year();
    let cur_month = now.month();

    let prod_list: Result<Vec<crate::models::produto_model::Produto>, _> = produtos::table.load(&mut conn);
    let produtos_baixo_estoque = match prod_list {
        Ok(prods) => prods.into_iter().filter(|p| p.quantidade_estoque <= 5).count() as i64,
        Err(_) => 0,
    };

    let itens_compras: Result<Vec<(crate::models::pedido_model::PedidoItem, crate::models::pedido_model::PedidoCompra)>, _> = pedido_itens::table
        .inner_join(pedidos_compra::table)
        .load(&mut conn);

    let total_compras_mensal = match itens_compras {
        Ok(itens) => itens
            .into_iter()
            .filter(|(_, p)| p.created_at.year() == cur_year && p.created_at.month() == cur_month)
            .map(|(item, _)| {
                let qtd = item.quantidade as f64;
                let val = item.valor_unitario.to_string().parse::<f64>().unwrap_or(0.0);
                qtd * val
            })
            .sum::<f64>(),
        Err(_) => 0.0,
    };

    Json(BuyerDashboardResponse {
        produtos_baixo_estoque,
        total_compras_mensal,
    }).into_response()
}
