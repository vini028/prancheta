use axum::{extract::{State, Path}, Json, response::IntoResponse, http::StatusCode};
use diesel::prelude::*;
use std::sync::Arc;
use std::str::FromStr;
use std::collections::HashMap;
use chrono::Utc;
use bigdecimal::{BigDecimal, Zero};

use crate::{
    db::DbPool,
    auth::middleware::{AuthenticatedUser, require_role},
    money::{arredondar_2, percentual, zero2},
    models::produto_model::Produto,
    models::venda_model::{
        CheckoutVendaInput, CheckoutVendaResponse, ItemVenda, ItemVendaResponse,
        NewItemVenda, NewVenda, Venda,
        DESCONTO_CLIENTE_PCT, DESCONTO_PAGAMENTO_PCT, METODOS_PAGAMENTO_VALIDOS,
    },
    schema::{clientes, itens_venda, produtos, vendas, users},
};

/// Falha de negócio dentro da transação de checkout (gera rollback).
enum CheckoutFail {
    Diesel(diesel::result::Error),
    Negocio { status: StatusCode, msg: String },
}

impl From<diesel::result::Error> for CheckoutFail {
    fn from(e: diesel::result::Error) -> Self {
        CheckoutFail::Diesel(e)
    }
}

fn negocio(status: StatusCode, msg: impl Into<String>) -> CheckoutFail {
    CheckoutFail::Negocio { status, msg: msg.into() }
}

fn metodo_eh_avista(metodo: &str) -> bool {
    metodo == "DINHEIRO" || metodo == "PIX"
}

/// POST /api/vendas — checkout do PDV (ADMIN ou SELLER).
///
/// Tudo ocorre numa única transação PostgreSQL:
/// 1. valida método de pagamento, itens e cliente;
/// 2. trava as linhas dos produtos (`SELECT ... FOR UPDATE`, em ordem de id)
///    para impedir race condition entre dois caixas;
/// 3. valida existência e saldo de estoque de cada item;
/// 4. calcula subtotal a partir do `preco_venda` vigente e aplica os
///    descontos acumulativos (5% cliente cadastrado + 5% DINHEIRO/PIX sobre
///    o valor restante), com arredondamento de 2 casas a cada etapa;
/// 5. registra `vendas` + `itens_venda` e decrementa o estoque.
pub async fn checkout_venda_handler(
    State(pool): State<Arc<DbPool>>,
    user: AuthenticatedUser,
    Json(payload): Json<CheckoutVendaInput>,
) -> impl IntoResponse {
    if let Err(response) = require_role(&user.0, &["ADMIN", "SELLER"]) {
        return response;
    }

    let metodo = payload.metodo_pagamento.trim().to_uppercase();
    if !METODOS_PAGAMENTO_VALIDOS.contains(&metodo.as_str()) {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "metodo_pagamento inválido. Valores aceitos: DINHEIRO, PIX, CARTAO_CREDITO, CARTAO_DEBITO." }))).into_response();
    }
    if payload.itens.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "A venda deve conter ao menos um item." }))).into_response();
    }
    for item in &payload.itens {
        if item.quantidade <= 0 {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": format!("O produto {} deve ter quantidade maior que zero.", item.produto_id) }))).into_response();
        }
    }

    let mut conn = pool.get().expect("Erro ao obter conexão do pool");

    let resultado = conn.transaction::<CheckoutVendaResponse, CheckoutFail, _>(|conn| {
        // Cliente informado precisa existir (None = não identificado, sem desconto).
        // O nome já vem daqui para compor a resposta.
        let cliente_nome: Option<String> = match payload.cliente_id {
            Some(cliente_id) => Some(
                clientes::table
                    .find(cliente_id)
                    .select(clientes::nome)
                    .first::<String>(conn)
                    .map_err(|e| match e {
                        diesel::result::Error::NotFound => negocio(StatusCode::UNPROCESSABLE_ENTITY, "Cliente não encontrado."),
                        outro => CheckoutFail::Diesel(outro),
                    })?,
            ),
            None => None,
        };

        // Agrega quantidades por produto (o carrinho pode repetir o mesmo id)
        // e trava as linhas em ordem crescente de id (anti-deadlock).
        let mut qtd_por_produto: HashMap<i32, i32> = HashMap::new();
        for item in &payload.itens {
            *qtd_por_produto.entry(item.produto_id).or_insert(0) += item.quantidade;
        }
        let mut ids: Vec<i32> = qtd_por_produto.keys().cloned().collect();
        ids.sort_unstable();

        let produtos_travados = produtos::table
            .filter(produtos::id.eq_any(&ids))
            .order(produtos::id.asc())
            .for_update()
            .select(Produto::as_select())
            .load::<Produto>(conn)?;

        if produtos_travados.len() != ids.len() {
            let encontrados: std::collections::HashSet<i32> =
                produtos_travados.iter().map(|p| p.id).collect();
            let ausente = ids.iter().find(|id| !encontrados.contains(id)).cloned().unwrap_or(0);
            return Err(negocio(StatusCode::UNPROCESSABLE_ENTITY, format!("Produto {} não encontrado.", ausente)));
        }

        // Valida saldo ANTES de qualquer escrita (rollback limpo em falta).
        for p in &produtos_travados {
            let qtd = qtd_por_produto.get(&p.id).cloned().unwrap_or(0);
            if p.quantidade_estoque < qtd {
                return Err(negocio(
                    StatusCode::CONFLICT,
                    format!("Estoque insuficiente para '{}': disponível {}, solicitado {}.", p.nome, p.quantidade_estoque, qtd),
                ));
            }
        }

        // Subtotal a partir do preco_venda vigente (snapshot do preço no item).
        let mut subtotal = BigDecimal::zero();
        let mut linhas: Vec<(Produto, i32, BigDecimal, BigDecimal)> = Vec::with_capacity(produtos_travados.len());
        for p in &produtos_travados {
            let qtd = qtd_por_produto.get(&p.id).cloned().unwrap_or(0);
            let linha = arredondar_2(&(&p.preco_venda * BigDecimal::from(qtd)));
            subtotal += &linha;
            linhas.push((Produto {
                id: p.id,
                nome: p.nome.clone(),
                ean: p.ean.clone(),
                preco_compra: p.preco_compra.clone(),
                preco_venda: p.preco_venda.clone(),
                quantidade_estoque: p.quantidade_estoque,
                created_at: p.created_at,
                updated_at: p.updated_at,
            }, qtd, p.preco_venda.clone(), linha));
        }
        subtotal = arredondar_2(&subtotal);

        // Descontos acumulativos, arredondados por etapa (igual ao Postgres).
        let pct_cliente = BigDecimal::from_str(DESCONTO_CLIENTE_PCT).expect("constante válida");
        let pct_pagto = BigDecimal::from_str(DESCONTO_PAGAMENTO_PCT).expect("constante válida");

        let desconto_cliente = if payload.cliente_id.is_some() {
            percentual(&subtotal, &pct_cliente)
        } else {
            zero2()
        };
        let restante = arredondar_2(&(&subtotal - &desconto_cliente));
        let desconto_pagamento = if metodo_eh_avista(&metodo) {
            percentual(&restante, &pct_pagto)
        } else {
            zero2()
        };
        let desconto_total = arredondar_2(&(&desconto_cliente + &desconto_pagamento));
        let valor_final = arredondar_2(&(&subtotal - &desconto_total));

        let venda = diesel::insert_into(vendas::table)
            .values(&NewVenda {
                cliente_id: payload.cliente_id,
                vendedor_id: user.0.sub,
                metodo_pagamento: metodo.clone(),
                subtotal: subtotal.clone(),
                desconto_total: desconto_total.clone(),
                valor_final: valor_final.clone(),
            })
            .get_result::<Venda>(conn)?;

        let novos_itens: Vec<NewItemVenda> = linhas.iter().map(|(p, qtd, preco, linha)| NewItemVenda {
            venda_id: venda.id,
            produto_id: p.id,
            quantidade: *qtd,
            preco_unitario: preco.clone(),
            subtotal: linha.clone(),
        }).collect();

        diesel::insert_into(itens_venda::table)
            .values(&novos_itens)
            .execute(conn)?;

        // Baixa no estoque (linhas já travadas por FOR UPDATE: sem oversell).
        for (p, qtd, _, _) in &linhas {
            diesel::update(produtos::table.find(p.id))
                .set((
                    produtos::quantidade_estoque.eq(produtos::quantidade_estoque - *qtd),
                    produtos::updated_at.eq(Utc::now().naive_utc()),
                ))
                .execute(conn)?;
        }

        let itens_resp = linhas.into_iter().map(|(p, qtd, preco, linha)| ItemVendaResponse {
            produto_id: p.id,
            produto_nome: p.nome,
            quantidade: qtd,
            preco_unitario: preco,
            subtotal: linha,
        }).collect();

        Ok(CheckoutVendaResponse {
            id: venda.id,
            cliente_id: venda.cliente_id,
            cliente_nome,
            vendedor_id: venda.vendedor_id,
            // Nome do vendedor direto do JWT: sem query extra no checkout.
            vendedor_nome: user.0.name.clone(),
            metodo_pagamento: venda.metodo_pagamento,
            subtotal,
            desconto_total,
            desconto_cliente,
            desconto_pagamento,
            valor_final,
            itens: itens_resp,
            created_at: venda.created_at,
        })
    });

    match resultado {
        Ok(resp) => (StatusCode::CREATED, Json(resp)).into_response(),
        Err(CheckoutFail::Negocio { status, msg }) => (status, Json(serde_json::json!({ "error": msg }))).into_response(),
        Err(CheckoutFail::Diesel(e)) => (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao registrar venda: {}", e)).into_response(),
    }
}

/// GET /api/vendas — ADMIN vê tudo; SELLER vê só as próprias.
/// BUYER é barrado com 403 pelo `require_role`.
pub async fn list_vendas_handler(
    State(pool): State<Arc<DbPool>>,
    user: AuthenticatedUser,
) -> impl IntoResponse {
    if let Err(response) = require_role(&user.0, &["ADMIN", "SELLER"]) {
        return response;
    }

    let mut conn = pool.get().expect("Erro ao obter conexão do pool");

    let mut query = vendas::table
        .inner_join(users::table)
        .left_join(clientes::table)
        .select((Venda::as_select(), users::name, clientes::nome.nullable()))
        .order(vendas::id.desc())
        .into_boxed();

    // Vendedor só lista o que ele mesmo vendeu (RBAC por ownership).
    if user.0.role == "SELLER" {
        query = query.filter(vendas::vendedor_id.eq(user.0.sub));
    }

    match query.load::<(Venda, String, Option<String>)>(&mut conn) {
        Ok(lista) => {
            let resp: Vec<serde_json::Value> = lista.into_iter().map(|(v, vendedor_nome, cliente_nome)| serde_json::json!({
                "id": v.id,
                "cliente_id": v.cliente_id,
                "cliente_nome": cliente_nome,
                "vendedor_id": v.vendedor_id,
                "vendedor_nome": vendedor_nome,
                "metodo_pagamento": v.metodo_pagamento,
                "subtotal": v.subtotal,
                "desconto_total": v.desconto_total,
                "valor_final": v.valor_final,
                "created_at": v.created_at,
                "updated_at": v.updated_at,
            })).collect();
            Json(resp).into_response()
        }
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao listar vendas: {}", e)).into_response(),
    }
}

/// GET /api/vendas/:id — detalhe com itens.
/// SELLER só visualiza as próprias vendas (403 nas de outros vendedores);
/// BUYER é barrado com 403 pelo `require_role`.
pub async fn get_venda_handler(
    State(pool): State<Arc<DbPool>>,
    user: AuthenticatedUser,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    if let Err(response) = require_role(&user.0, &["ADMIN", "SELLER"]) {
        return response;
    }

    let mut conn = pool.get().expect("Erro ao obter conexão do pool");

    let venda = match vendas::table
        .find(id)
        .select(Venda::as_select())
        .first::<Venda>(&mut conn)
    {
        Ok(v) => v,
        Err(diesel::result::Error::NotFound) => return (StatusCode::NOT_FOUND, Json(serde_json::json!({ "error": "Venda não encontrada." }))).into_response(),
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao buscar venda: {}", e)).into_response(),
    };

    // Ownership: vendedor não espia a venda do colega (nem por ID direto).
    if user.0.role == "SELLER" && venda.vendedor_id != user.0.sub {
        return (StatusCode::FORBIDDEN, Json(serde_json::json!({ "error": "Você só pode visualizar as suas próprias vendas." }))).into_response();
    }

    let vendedor_nome = match users::table
        .find(venda.vendedor_id)
        .select(users::name)
        .first::<String>(&mut conn)
    {
        Ok(n) => n,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao buscar vendedor da venda: {}", e)).into_response(),
    };

    let cliente_nome: Option<String> = match venda.cliente_id {
        Some(cid) => match clientes::table
            .find(cid)
            .select(clientes::nome)
            .first::<String>(&mut conn)
            .optional()
        {
            Ok(n) => n,
            Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao buscar cliente da venda: {}", e)).into_response(),
        },
        None => None,
    };

    let itens = match itens_venda::table
        .filter(itens_venda::venda_id.eq(id))
        .inner_join(produtos::table)
        .select((ItemVenda::as_select(), produtos::nome))
        .load::<(ItemVenda, String)>(&mut conn)
    {
        Ok(lista) => lista,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao buscar itens da venda: {}", e)).into_response(),
    };

    // Recompõe o detalhamento dos descontos a partir dos totais persistidos.
    let desconto_cliente = if venda.cliente_id.is_some() {
        let pct = BigDecimal::from_str(DESCONTO_CLIENTE_PCT).expect("constante válida");
        percentual(&venda.subtotal, &pct)
    } else {
        zero2()
    };
    let desconto_pagamento = arredondar_2(&(&venda.desconto_total - &desconto_cliente));

    let itens_resp: Vec<ItemVendaResponse> = itens.into_iter().map(|(i, nome)| ItemVendaResponse {
        produto_id: i.produto_id,
        produto_nome: nome,
        quantidade: i.quantidade,
        preco_unitario: i.preco_unitario,
        subtotal: i.subtotal,
    }).collect();

    (StatusCode::OK, Json(CheckoutVendaResponse {
        id: venda.id,
        cliente_id: venda.cliente_id,
        cliente_nome,
        vendedor_id: venda.vendedor_id,
        vendedor_nome,
        metodo_pagamento: venda.metodo_pagamento,
        subtotal: venda.subtotal,
        desconto_total: venda.desconto_total,
        desconto_cliente,
        desconto_pagamento,
        valor_final: venda.valor_final,
        itens: itens_resp,
        created_at: venda.created_at,
    })).into_response()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn bd(s: &str) -> BigDecimal {
        BigDecimal::from_str(s).unwrap()
    }

    /// Simula o cálculo do checkout sem banco: subtotal 2×50 + 1×99.99,
    /// com cliente + PIX → 5% sobre 199.99 (=10.00) e 5% sobre 189.99 (=9.50).
    fn calcular(subtotal: &BigDecimal, com_cliente: bool, metodo: &str) -> (BigDecimal, BigDecimal, BigDecimal) {
        let pct_c = bd(DESCONTO_CLIENTE_PCT);
        let pct_p = bd(DESCONTO_PAGAMENTO_PCT);
        let dc = if com_cliente { percentual(subtotal, &pct_c) } else { zero2() };
        let restante = arredondar_2(&(subtotal - &dc));
        let dp = if metodo_eh_avista(metodo) { percentual(&restante, &pct_p) } else { zero2() };
        let total = arredondar_2(&(&dc + &dp));
        let final_ = arredondar_2(&(subtotal - &total));
        (dc, dp, final_)
    }

    #[test]
    fn desconto_acumulativo_cliente_mais_pix() {
        let subtotal = arredondar_2(&(&bd("100.00") + &bd("99.99"))); // 199.99
        let (dc, dp, final_) = calcular(&subtotal, true, "PIX");
        assert_eq!(dc, bd("10.00"));   // 199.99 * 5% = 9.9995 -> 10.00
        assert_eq!(dp, bd("9.50"));    // 189.99 * 5% = 9.4995 -> 9.50
        assert_eq!(final_, bd("180.49"));
    }

    #[test]
    fn sem_cliente_e_cartao_nao_tem_desconto() {
        let (dc, dp, final_) = calcular(&bd("199.99"), false, "CARTAO_CREDITO");
        assert_eq!(dc, zero2());
        assert_eq!(dp, zero2());
        assert_eq!(final_, bd("199.99"));
    }

    #[test]
    fn so_dinheiro_sem_cliente() {
        let (dc, dp, final_) = calcular(&bd("100.00"), false, "DINHEIRO");
        assert_eq!(dc, zero2());
        assert_eq!(dp, bd("5.00"));
        assert_eq!(final_, bd("95.00"));
    }

    #[test]
    fn so_cliente_no_debito() {
        let (dc, dp, final_) = calcular(&bd("100.00"), true, "CARTAO_DEBITO");
        assert_eq!(dc, bd("5.00"));
        assert_eq!(dp, zero2());
        assert_eq!(final_, bd("95.00"));
    }

    #[test]
    fn metodos_validos_reconhecidos() {
        assert!(METODOS_PAGAMENTO_VALIDOS.contains(&"DINHEIRO"));
        assert!(METODOS_PAGAMENTO_VALIDOS.contains(&"CARTAO_CREDITO"));
        assert!(metodo_eh_avista("PIX"));
        assert!(!metodo_eh_avista("CARTAO_DEBITO"));
    }
}
