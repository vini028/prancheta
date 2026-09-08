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
        created_at -> Timestamp,
        updated_at -> Timestamp,
    }
}

diesel::joinable!(pedidos_compra -> fornecedores (fornecedor_id));
diesel::joinable!(pedidos_compra -> users (comprador_id));
diesel::joinable!(pedido_itens -> pedidos_compra (pedido_id));

diesel::allow_tables_to_appear_in_same_query!(
    users,
    fornecedores,
    pedidos_compra,
    pedido_itens,
);