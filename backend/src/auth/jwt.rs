use jsonwebtoken::{decode, encode};
use jsonwebtoken::{Header, Validation};
use jsonwebtoken::{DecodingKey, EncodingKey};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: Uuid,      // User ID
    pub name: String,   // Nome do usuário
    pub email: String,  // E-mail
    pub role: String,   // Papel (ADMIN, BUYER, SELLER)
    pub exp: usize,     // Data/hora de expiração (Unix Timestamp)
}

pub fn create_jwt(user_id: Uuid, name: &str, email: &str, role: &str) -> Result<String, String> {
    let jwt_secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "secret_padrao_dev".to_string());
    // Define a expiração para 8 horas (8 * 3600 segundos)
    let expiration = chrono::Utc::now()
        .checked_add_signed(chrono::Duration::hours(8))
        .expect("Timestamp inválido")
        .timestamp() as usize;

    let claims = Claims {
        sub: user_id,
        name: name.to_string(),
        email: email.to_string(),
        role: role.to_string(),
        exp: expiration,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(jwt_secret.as_bytes()),
    )
    .map_err(|e| format!("Erro ao criar token JWT: {}", e))
}

/// Valida a assinatura e a expiração do token JWT
pub fn decode_jwt(token: &str) -> Result<Claims, String> {
    let jwt_secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "secret_padrao_dev".to_string());

    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(jwt_secret.as_bytes()),
        &Validation::default(),
    )
    .map_err(|_| "Token inválido ou expirado".to_string())?;

    Ok(token_data.claims)
}