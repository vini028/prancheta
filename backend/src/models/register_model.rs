use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::NaiveDateTime;

// Estrutura para receber dados de registro (via JSON)
#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub name: String,
    pub email: String,
    pub password: String,
    pub role: String,
}

// Estrutura para resposta de registro (não inclui hash)
#[derive(Debug, Serialize)]
pub struct RegisterResponse {
    pub id: Uuid,
    pub name: String,
    pub email: String,
    pub role: String,
    pub created_at: NaiveDateTime,
}