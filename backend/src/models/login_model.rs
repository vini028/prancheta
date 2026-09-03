use serde::{Deserialize, Serialize};
use uuid::Uuid;

// Estrutura para login (via JSON)
#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

// Estrutura para resposta de login
#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub token: String,
    pub user_id: Uuid,
    pub role: String,
}