use axum::{
    async_trait,
    extract::{FromRequestParts, FromRef},
    http::{header, request::Parts, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use std::sync::Arc;
use diesel::prelude::*;

use crate::{
    auth::jwt::{Claims, decode_jwt},
    db::DbPool,
    schema::users,
    models::user_model::User,
};

pub struct AuthenticatedUser(pub Claims);

#[async_trait]
impl<S> FromRequestParts<S> for AuthenticatedUser
where
    S: Send + Sync,
    Arc<DbPool>: FromRef<S>,
{
    type Rejection = Response;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
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
        let claims = match decode_jwt(token) {
            Ok(c) => c,
            Err(err_msg) => {
                let body = Json(json!({ "error": err_msg }));
                return Err((StatusCode::UNAUTHORIZED, body).into_response());
            }
        };

        // 4. Consulta o banco para garantir que o usuário existe, está ativo e pegar a role atualizada
        let pool = Arc::<DbPool>::from_ref(state);

        let mut conn = match pool.get() {
            Ok(c) => c,
            Err(_) => {
                let body = Json(json!({ "error": "Serviço indisponível temporariamente" }));
                return Err((StatusCode::SERVICE_UNAVAILABLE, body).into_response());
            }
        };

        let db_user: Result<User, _> = users::table.find(claims.sub).first(&mut conn);
        let user_record = match db_user {
            Ok(u) => u,
            Err(_) => {
                let body = Json(json!({ "error": "Usuário não encontrado ou token inválido" }));
                return Err((StatusCode::UNAUTHORIZED, body).into_response());
            }
        };

        if !user_record.is_active {
            let body = Json(json!({ "error": "Conta desativada. Acesso negado." }));
            return Err((StatusCode::FORBIDDEN, body).into_response());
        }

        let mut verified_claims = claims;
        verified_claims.role = user_record.role;

        Ok(AuthenticatedUser(verified_claims))
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
