// src/main.rs
use std::{net::SocketAddr, sync::Arc};
use anyhow::Result;
use axum::{Router, http::{HeaderValue, Method, header::{AUTHORIZATION, CONTENT_TYPE}}, routing::get};
use dotenvy::dotenv;
use tower_http::cors::{Any, CorsLayer};

mod db;
mod auth;
mod handlers;
mod routes;
mod models;
mod schema;

#[tokio::main]
async fn main() -> Result<()> {
    dotenv().ok();

    // Garantir que JWT_SECRET existe
    std::env::var("JWT_SECRET").expect("JWT_SECRET must be set");

    let pool = db::establish_connection_pool();
    db::run_migrations(&pool).expect("Erro nas migrations");

    let pool = Arc::new(pool);

    let cors = CorsLayer::new()
        .allow_origin("http://localhost:5173".parse::<HeaderValue>().unwrap())
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::PATCH,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_headers([AUTHORIZATION, CONTENT_TYPE])  // <-- explícito
    .expose_headers(Any); // opcional, mas pode ser mantido

    let app = Router::new()
        .route("/", get(|| async { "API Simples-ERP funcionando!" }))
        .merge(routes::create_router())
        .with_state(pool)
        .layer(cors);

    let addr = SocketAddr::from(([0, 0, 0, 0], 3000));
    let listener = tokio::net::TcpListener::bind(addr).await?;

    println!("🚀 Servidor rodando em http://localhost:3000");

    axum::serve(listener, app).await?;

    Ok(())
}