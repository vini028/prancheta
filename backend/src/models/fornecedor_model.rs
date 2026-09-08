use serde::{Deserialize, Serialize};
use diesel::prelude::*;
use crate::schema::fornecedores;
use chrono::NaiveDateTime;

#[derive(Queryable, Selectable, Serialize, Debug, AsChangeset)]
#[diesel(table_name = fornecedores)]
pub struct Fornecedor {
    pub id: i32,
    pub nome: String,
    pub cnpj: Option<String>,
    pub telefone: Option<String>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Insertable, Deserialize, Debug)]
#[diesel(table_name = fornecedores)]
pub struct NewFornecedor {
    pub nome: String,
    pub cnpj: Option<String>,
    pub telefone: Option<String>,
}

#[derive(Deserialize, Debug, AsChangeset)]
#[diesel(table_name = fornecedores)]
pub struct UpdateFornecedor {
    pub nome: Option<String>,
    pub cnpj: Option<String>,
    pub telefone: Option<String>,
}
