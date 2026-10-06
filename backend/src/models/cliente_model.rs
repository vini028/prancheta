use serde::{Deserialize, Serialize};
use diesel::prelude::*;
use crate::schema::clientes;
use chrono::NaiveDateTime;

#[derive(Queryable, Selectable, Serialize, Debug)]
#[diesel(table_name = clientes)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct Cliente {
    pub id: i32,
    pub nome: String,
    pub cpf: String,
    pub email: Option<String>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Insertable, Deserialize, Debug)]
#[diesel(table_name = clientes)]
pub struct NewCliente {
    pub nome: String,
    pub cpf: String,
    pub email: Option<String>,
}

#[derive(Deserialize, Debug, AsChangeset)]
#[diesel(table_name = clientes)]
pub struct UpdateCliente {
    pub nome: Option<String>,
    pub cpf: Option<String>,
    pub email: Option<String>,
}
