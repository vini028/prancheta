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
}