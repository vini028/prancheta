use anyhow::Result;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Json, Response};
use diesel::prelude::*;
use diesel::r2d2::{self, ConnectionManager};
use diesel_migrations::{MigrationHarness, embed_migrations};
use dotenvy::dotenv;
use std::env;

use serde_json::json;

pub type DbPool = r2d2::Pool<ConnectionManager<PgConnection>>;
pub type DbConnection = r2d2::PooledConnection<ConnectionManager<PgConnection>>;
pub const MIGRATIONS: diesel_migrations::EmbeddedMigrations = embed_migrations!();

/// Inicializa a pool de conexões com o PostgreSQL.
pub fn establish_connection_pool() -> DbPool {
    dotenv().ok();
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let manager = ConnectionManager::<PgConnection>::new(database_url);
    r2d2::Pool::builder()
        .build(manager)
        .expect("Failed to create pool")
}

/// Obtém uma conexão da pool ou devolve uma resposta 503 (quando a pool está
/// esgotada ou o banco está indisponível), em vez de `panic` como fazia o
/// antigo `get_connection`. Usar nos handlers:
/// `let mut conn = match conn_or_503(&pool) { Ok(c) => c, Err(r) => return r };`
pub fn conn_or_503(pool: &DbPool) -> Result<DbConnection, Response> {
    match pool.get() {
        Ok(conn) => Ok(conn),
        Err(_) => Err((
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({ "error": "Serviço indisponível temporariamente" })),
        )
            .into_response()),
    }
}

pub fn run_migrations(pool: &DbPool) -> Result<()> {
    let mut conn = pool.get()?;  // ou .expect() se preferir
    conn.run_pending_migrations(MIGRATIONS).expect("Erro ao executar a migração");
    Ok(())
}