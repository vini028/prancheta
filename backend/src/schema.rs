// src/schema.rs
diesel::table! {
    users (id) {
        id -> Uuid,
        #[max_length = 100]
        name -> Varchar,
        #[max_length = 150]
        email -> Varchar,
        #[max_length = 255]
        password_hash -> Varchar,
        #[max_length = 20]
        role -> Varchar,
        is_active -> Bool,
        created_at -> Timestamp,
        updated_at -> Timestamp,
    }
}

diesel::table! {
    fornecedores (id) {
        id -> Int4,
        #[max_length = 100]
        nome -> Varchar,
        #[max_length = 20]
        cnpj -> Nullable<Varchar>,
        #[max_length = 20]
        telefone -> Nullable<Varchar>,
        created_at -> Timestamp,
        updated_at -> Timestamp,
    }
}

diesel::table! {
    pedidos_compra (id) {
        id -> Int4,
        fornecedor_id -> Int4,
        #[max_length = 20]
        status -> Varchar,
        comprador_id -> Uuid,
        #[max_length = 20]
        status_envio -> Nullable<Varchar>,
        observacao_problema -> Nullable<Text>,
        created_at -> Timestamp,
        updated_at -> Timestamp,
    }
}

diesel::table! {
    pedido_itens (id) {
        id -> Int4,
        pedido_id -> Int4,
        #[max_length = 150]
        item -> Varchar,
        #[max_length = 13]
        ean -> Nullable<Varchar>,
        quantidade -> Int4,
        valor_unitario -> Numeric,
        quantidade_recebida -> Nullable<Int4>,
        #[max_length = 20]
        status_item -> Varchar,
        observacao_item -> Nullable<Text>,
        created_at -> Timestamp,
        updated_at -> Timestamp,
    }
}

diesel::table! {
    produtos (id) {
        id -> Int4,
        #[max_length = 150]
        nome -> Varchar,
        #[max_length = 13]
        ean -> Varchar,
        preco_compra -> Numeric,
        preco_venda -> Numeric,
        quantidade_estoque -> Int4,
        created_at -> Timestamp,
        updated_at -> Timestamp,
    }
}

diesel::table! {
    clientes (id) {
        id -> Int4,
        #[max_length = 150]
        nome -> Varchar,
        #[max_length = 14]
        cpf -> Varchar,
        #[max_length = 150]
        email -> Nullable<Varchar>,
        created_at -> Timestamp,
        updated_at -> Timestamp,
    }
}

diesel::table! {
    vendas (id) {
        id -> Int4,
        cliente_id -> Nullable<Int4>,
        vendedor_id -> Uuid,
        #[max_length = 20]
        metodo_pagamento -> Varchar,
        subtotal -> Numeric,
        desconto_total -> Numeric,
        valor_final -> Numeric,
        created_at -> Timestamp,
        updated_at -> Timestamp,
    }
}

diesel::table! {
    itens_venda (id) {
        id -> Int4,
        venda_id -> Int4,
        produto_id -> Int4,
        quantidade -> Int4,
        preco_unitario -> Numeric,
        subtotal -> Numeric,
        created_at -> Timestamp,
        updated_at -> Timestamp,
    }
}

diesel::joinable!(pedidos_compra -> fornecedores (fornecedor_id));
diesel::joinable!(pedidos_compra -> users (comprador_id));
diesel::joinable!(pedido_itens -> pedidos_compra (pedido_id));
diesel::joinable!(vendas -> clientes (cliente_id));
diesel::joinable!(vendas -> users (vendedor_id));
diesel::joinable!(itens_venda -> vendas (venda_id));
diesel::joinable!(itens_venda -> produtos (produto_id));

diesel::allow_tables_to_appear_in_same_query!(
    users,
    fornecedores,
    pedidos_compra,
    pedido_itens,
    produtos,
    clientes,
    vendas,
    itens_venda,
);