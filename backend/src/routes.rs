// src/routes.rs
use axum::{
    Router, routing::{delete, get, patch, post, put},
};
use std::sync::Arc;

use crate::{db::DbPool, handlers};

pub fn create_router() -> Router<Arc<DbPool>> {
    Router::new()
        // Rotas públicas
        .route("/api/auth/register", post(handlers::auth_handler::register_handler))
        .route("/api/auth/login", post(handlers::auth_handler::login_handler))
        
        // Rotas protegidas (qualquer usuário autenticado)
        .route("/api/me", get(handlers::auth_handler::me_handler))
        .route(
            "/api/me/password",
            put(handlers::user_handler::update_password_handler),
        )
        
        // Rotas administrativas (apenas ADMIN)
        .route("/api/admin", get(handlers::auth_handler::admin_handler))
        .route("/api/admin/users", get(handlers::user_handler::list_users_handler))
        .route(
            "/api/admin/users/:id/role",
            patch(handlers::user_handler::update_role_handler),
        )
        .route(
            "/api/admin/users/:id",
            delete(handlers::user_handler::delete_user_handler),
        )

        // Rotas de compras (ADMIN ou BUYER)
        .route("/api/fornecedores", post(handlers::fornecedor_handler::create_fornecedor_handler).get(handlers::fornecedor_handler::list_fornecedores_handler))
        .route("/api/fornecedores/:id", put(handlers::fornecedor_handler::update_fornecedor_handler).delete(handlers::fornecedor_handler::delete_fornecedor_handler))
        .route("/api/pedidos-compra", post(handlers::pedido_handler::create_pedido_handler).get(handlers::pedido_handler::list_pedidos_handler))
        .route("/api/pedidos-compra/:id", put(handlers::pedido_handler::update_pedido_handler).delete(handlers::pedido_handler::delete_pedido_handler))
        .route("/api/pedidos-compra/:id/status", patch(handlers::pedido_handler::update_pedido_status_handler))
        .route("/api/pedidos-compra/:id/itens", get(handlers::pedido_handler::get_pedido_itens_handler))
}