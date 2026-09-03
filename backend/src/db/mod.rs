use anyhow::Result;
use diesel::prelude::*;
use diesel::r2d2::{self, ConnectionManager};
use diesel_migrations::{MigrationHarness, embed_migrations};
use dotenvy::dotenv;
use std::env;

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

/// Obtém uma conexão da pool (para uso em funções de repositório).
pub fn get_connection(pool: &DbPool) -> DbConnection {
    pool.get().expect("Failed to get DB connection from pool")
}

pub fn run_migrations(pool: &DbPool) -> Result<()> {
    let mut conn = pool.get()?;  // ou .expect() se preferir
    conn.run_pending_migrations(MIGRATIONS).expect("Erro ao executar a migração");
    Ok(())
}