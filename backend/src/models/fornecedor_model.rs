use serde::{Deserialize, Serialize};
use diesel::prelude::*;
use crate::schema::fornecedores;
use chrono::NaiveDateTime;

#[derive(Queryable, Selectable, Serialize, Debug)]
#[diesel(table_name = fornecedores)]
pub struct Fornecedor {
    pub id: i32,
    pub nome: String,
    pub cnpj: Option<String>,
    pub telefone: Option<String>,
    pub created_at: NaiveDateTime,
}

#[derive(Insertable, Deserialize, Debug)]
#[diesel(table_name = fornecedores)]
pub struct NewFornecedor {
    pub nome: String,
    pub cnpj: Option<String>,
    pub telefone: Option<String>,
}
