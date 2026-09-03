use axum::{
    async_trait,
    extract::FromRequestParts,
    http::{header, request::Parts, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

use crate::auth::jwt::{Claims, decode_jwt};

pub struct AuthenticatedUser(pub Claims);

#[async_trait]
impl<S> FromRequestParts<S> for AuthenticatedUser
where
    S: Send + Sync,
{
    type Rejection = Response;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        // 1. Obtém o header Authorization
        let auth_header = parts
            .headers
            .get(header::AUTHORIZATION)
            .and_then(|value| value.to_str().ok());

        let auth_header = match auth_header {
            Some(header) => header,
            None => {
                let body = Json(json!({ "error": "Cabeçalho de autorização ausente" }));
                return Err((StatusCode::UNAUTHORIZED, body).into_response());
            }
        };

        // 2. Valida o prefixo "Bearer "
        if !auth_header.starts_with("Bearer ") {
            let body = Json(json!({ "error": "Formato de token inválido. Use 'Bearer <token>'" }));
            return Err((StatusCode::UNAUTHORIZED, body).into_response());
        }

        let token = &auth_header[7..];

        // 3. Valida e decodifica o token
        match decode_jwt(token) {
            Ok(claims) => Ok(AuthenticatedUser(claims)),
            Err(err_msg) => {
                let body = Json(json!({ "error": err_msg }));
                Err((StatusCode::UNAUTHORIZED, body).into_response())
            }
        }
    }
}

/// Função utilitária para centralizar autorização por role (RBAC)
pub fn require_role(claims: &Claims, allowed_roles: &[&str]) -> Result<(), Response> {
    if allowed_roles.contains(&claims.role.as_str()) {
        Ok(())
    } else {
        let body = Json(json!({ "error": "Acesso negado: permissão insuficiente" }));
        Err((StatusCode::FORBIDDEN, body).into_response())
    }
}