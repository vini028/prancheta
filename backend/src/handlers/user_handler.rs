// src/handlers/user_handler.rs
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Json},
};
use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use uuid::Uuid;

use crate::{
    auth::{
        middleware::AuthenticatedUser, 
        password::{hash_password, verify_password}, 
        validation::validate_password
    }, 
    db::{self, DbPool}, 
    models::user_model::{UpdatePasswordRequest, User}, 
    schema::users::dsl::*,
};

// ------------------------
//  Struct para alteração de role (entrada)
// ------------------------
#[derive(Debug, Deserialize)]
pub struct UpdateRoleRequest {
    pub role: String,
}

// ------------------------
//  Struct para resposta de listagem (sem senha)
// ------------------------
#[derive(Debug, Serialize)]
pub struct UserResponse {
    pub id: Uuid,
    pub name: String,
    pub email: String,
    pub role: String,
    pub created_at: chrono::NaiveDateTime,
}

impl From<User> for UserResponse {
    fn from(user: User) -> Self {
        Self {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            created_at: user.created_at,
        }
    }
}

// ------------------------
//  Handler: Listar todos os usuários (apenas ADMIN)
// ------------------------
pub async fn list_users_handler(
    auth_user: AuthenticatedUser,
    State(pool): State<Arc<DbPool>>,
) -> impl IntoResponse {
    // Verifica se é ADMIN (redundante, mas garantia extra)
    if auth_user.0.role != "ADMIN" {
        return (
            StatusCode::FORBIDDEN,
            Json(json!({ "error": "Acesso negado: requer role ADMIN" })),
        );
    }

    let mut conn = db::get_connection(&pool);

    match users.load::<User>(&mut conn) {
        Ok(user_list) => {
            let response: Vec<UserResponse> = user_list.into_iter().map(|u| u.into()).collect();
            (StatusCode::OK, Json(json!(response)))
        }
        Err(e) => {
            eprintln!("Erro ao listar usuários: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Erro ao buscar usuários" })),
            )
        }
    }
}

// ------------------------
//  Handler: Alterar role de um usuário (apenas ADMIN)
// ------------------------
pub async fn update_role_handler(
    auth_user: AuthenticatedUser,
    State(pool): State<Arc<DbPool>>,
    Path(user_id): Path<Uuid>,
    Json(payload): Json<UpdateRoleRequest>,
) -> impl IntoResponse {
    // Verifica se é ADMIN
    if auth_user.0.role != "ADMIN" {
        return (
            StatusCode::FORBIDDEN,
            Json(json!({ "error": "Acesso negado: requer role ADMIN" })),
        );
    }

    // Valida a nova role (apenas ADMIN, BUYER, SELLER)
    let allowed_roles = vec!["ADMIN", "BUYER", "SELLER"];
    let new_role = payload.role.to_uppercase();
    if !allowed_roles.contains(&new_role.as_str()) {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Role inválida. Use ADMIN, BUYER ou SELLER" })),
        );
    }

    // Impede que o próprio ADMIN rebaixe a si mesmo (opcional, mas recomendado)
    if auth_user.0.sub == user_id {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Não é possível alterar sua própria role" })),
        );
    }

    let mut conn = db::get_connection(&pool);

    // Atualiza a role do usuário
    match diesel::update(users.filter(id.eq(user_id)))
        .set(role.eq(new_role))
        .returning(User::as_returning())
        .get_result::<User>(&mut conn)
    {
        Ok(updated_user) => {
            let response = UserResponse::from(updated_user);
            (StatusCode::OK, Json(json!(response)))
        }
        Err(diesel::NotFound) => {
            (StatusCode::NOT_FOUND, Json(json!({ "error": "Usuário não encontrado" })))
        }
        Err(e) => {
            eprintln!("Erro ao atualizar role: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Erro ao atualizar role" })),
            )
        }
    }
}

// ------------------------
//  Handler: Excluir usuário (apenas ADMIN)
// ------------------------
pub async fn delete_user_handler(
    auth_user: AuthenticatedUser,
    State(pool): State<Arc<DbPool>>,
    Path(user_id): Path<Uuid>,
) -> impl IntoResponse {
    // Verifica se é ADMIN
    if auth_user.0.role != "ADMIN" {
        return (
            StatusCode::FORBIDDEN,
            Json(json!({ "error": "Acesso negado: requer role ADMIN" })),
        );
    }

    // Impede que o próprio ADMIN se exclua
    if auth_user.0.sub == user_id {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Não é possível excluir a si mesmo" })),
        );
    }

    let mut conn = db::get_connection(&pool);

    match diesel::delete(users.filter(id.eq(user_id))).execute(&mut conn) {
        Ok(rows_deleted) if rows_deleted > 0 => {
            (StatusCode::NO_CONTENT, Json(json!({}))) // 204 sem corpo
        }
        Ok(_) => {
            (StatusCode::NOT_FOUND, Json(json!({ "error": "Usuário não encontrado" })))
        }
        Err(e) => {
            eprintln!("Erro ao excluir usuário: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Erro ao excluir usuário" })),
            )
        }
    }
}

// ------------------------
//  Handler: Alterar a própria senha (qualquer usuário autenticado)
// ------------------------
pub async fn update_password_handler(
    auth_user: AuthenticatedUser,
    State(pool): State<Arc<DbPool>>,
    Json(payload): Json<UpdatePasswordRequest>,
) -> impl IntoResponse {
    // 1. Valida a força da nova senha (mínimo 8 caracteres, maiúscula, minúscula, número)
    if !validate_password(&payload.new_password) {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({
                "error": "A nova senha não atende aos requisitos de segurança (mínimo 8 caracteres, contendo letra maiúscula, minúscula e número)"
            })),
        );
    }

    let mut conn = db::get_connection(&pool);

    // 2. Busca o usuário atual no banco de dados
    let user_record = match users
        .filter(id.eq(auth_user.0.sub))
        .first::<User>(&mut conn)
    {
        Ok(u) => u,
        Err(diesel::NotFound) => {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({ "error": "Usuário não encontrado" })),
            );
        }
        Err(e) => {
            eprintln!("Erro ao buscar usuário: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Erro ao processar a requisição" })),
            );
        }
    };

    // 3. Verifica se a senha atual está correta
    if !verify_password(&payload.current_password, &user_record.password_hash) {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "A senha atual incorreta" })),
        );
    }

    // 4. Gera o novo hash para a nova senha
    let new_password_hash = match hash_password(&payload.new_password) {
        Ok(h) => h,
        Err(e) => {
            eprintln!("Erro ao gerar hash da nova senha: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Erro ao processar a nova senha" })),
            );
        }
    };

    // 5. Atualiza o hash no banco de dados
    match diesel::update(users.filter(id.eq(auth_user.0.sub)))
        .set(password_hash.eq(new_password_hash))
        .execute(&mut conn)
    {
        Ok(_) => (
            StatusCode::OK,
            Json(json!({ "message": "Senha alterada com sucesso!" })),
        ),
        Err(e) => {
            eprintln!("Erro ao atualizar a senha no banco: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Erro ao salvar a nova senha" })),
            )
        }
    }
}