// src/handlers/auth_handler.rs
use axum::{
    extract::State, http::StatusCode, response::{IntoResponse, Json, Response},
};
use serde_json::json;
use std::sync::Arc;
use diesel::prelude::*;

use crate::{
    auth::{
        jwt::create_jwt, middleware::{AuthenticatedUser, require_role}, password::{hash_password, verify_password}, validation::{validate_email, validate_password}
    }, db::{self, DbPool}, models::{
        login_model::{LoginRequest, LoginResponse},
        register_model::{RegisterRequest, RegisterResponse},
        user_model::{NewUser, User},
    }, schema::users::dsl::*,
};

// ------------------------
//  Handler: Registro
// ------------------------
pub async fn register_handler(
    State(pool): State<Arc<DbPool>>,
    Json(payload): Json<RegisterRequest>,
) -> impl IntoResponse {
    // 1. Validar role: apenas "BUYER" ou "SELLER"
    let allowed_roles = vec!["BUYER", "SELLER"];
    if !allowed_roles.contains(&payload.role.to_uppercase().as_str()) {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Role deve ser 'BUYER' ou 'SELLER'" })),
        );
    }

    // 2. Validar senha
    if !validate_password(&payload.password) {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Senha deve ter no mínimo 8 caracteres, incluindo maiúscula, minúscula e número" })),
        );
    }

    if !validate_email(&payload.email) {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Formato de e-mail inválido" })),
        );
    }

    // 3. Verificar se e-mail já existe
    let mut conn = db::get_connection(&pool);
    let existing = users
        .filter(email.eq(&payload.email))
        .first::<User>(&mut conn)
        .optional();

    if let Ok(Some(_)) = existing {
        return (
            StatusCode::CONFLICT,
            Json(json!({ "error": "E-mail já cadastrado" })),
        );
    }

    // 4. Hash da senha (variável renomeada para evitar conflito)
    let hashed_password = match hash_password(&payload.password) {
        Ok(hash) => hash,
        Err(err) => {
            eprintln!("Erro ao gerar hash: {}", err);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Erro ao processar senha" })),
            );
        }
    };

    // 5. Inserir novo usuário
    let new_user = NewUser {
        name: payload.name,
        email: payload.email,
        password_hash: hashed_password, // agora usa a variável renomeada
        role: payload.role.to_uppercase(),
    };

    let inserted = diesel::insert_into(users)
        .values(&new_user)
        .returning(User::as_returning())
        .get_result::<User>(&mut conn);

    match inserted {
        Ok(user) => {
            let response = RegisterResponse {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                created_at: user.created_at,
            };
            (StatusCode::CREATED, Json(json!(response)))
        }
        Err(e) => {
            eprintln!("Erro ao inserir usuário: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Erro ao criar usuário" })),
            )
        }
    }
}

// ------------------------
//  Handler: Login
// ------------------------
pub async fn login_handler(
    State(pool): State<Arc<DbPool>>,
    Json(payload): Json<LoginRequest>,
) -> impl IntoResponse {
    let mut conn = db::get_connection(&pool);

    // 1. Buscar usuário
    let user = match users
        .filter(email.eq(&payload.email))
        .first::<User>(&mut conn)
        .optional()
    {
        Ok(Some(u)) => u,
        Ok(None) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(json!({ "error": "Credenciais inválidas" })),
            );
        }
        Err(e) => {
            eprintln!("Erro ao buscar usuário: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Erro ao processar login" })),
            );
        }
    };

    // 2. Verificar senha
    if !verify_password(&payload.password, &user.password_hash) {
        return (
            StatusCode::UNAUTHORIZED,
            Json(json!({ "error": "Credenciais inválidas" })),
        );
    }

    // 3. Gerar JWT
    let token = match create_jwt(user.id, &user.name, &user.email, &user.role) {
        Ok(t) => t,
        Err(e) => {
            eprintln!("Erro ao gerar JWT: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Erro ao gerar token" })),
            );
        }
    };

    let response = LoginResponse {
        token,
        user_id: user.id,
        role: user.role,
    };

    (StatusCode::OK, Json(json!(response)))
}

// ------------------------
//  Handler: /api/me (protegido)
// ------------------------
pub async fn me_handler(
    auth_user: AuthenticatedUser,
) -> impl IntoResponse {
    let claims = auth_user.0;
    Json(json!({
        "id": claims.sub,
        "name": claims.name,
        "email": claims.email,
        "role": claims.role
    }))
}

// ------------------------
//  Handler: /api/admin (protegido + RBAC)
// ------------------------
pub async fn admin_handler(
    auth_user: AuthenticatedUser,
) -> Result<impl IntoResponse, Response> {
    let claims = auth_user.0;
    require_role(&claims, &["ADMIN"])?; // agora funciona

    Ok((
        StatusCode::OK,
        Json(json!({
            "message": "Área administrativa",
            "user": {
                "id": claims.sub,
                "name": claims.name,
                "email": claims.email,
                "role": claims.role
            }
        })),
    ))
}
