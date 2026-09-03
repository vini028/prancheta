# ✏️ Prancheta — Sistema de Gestão de Papelaria

O **Prancheta** é um sistema completo para gestão de papelarias, desenvolvido como projeto prático para a disciplina de **Projeto de Software**. O sistema segue o manifesto ágil e é construído com uma arquitetura dividida em 3 camadas (Front-end, Back-end e Banco de Dados), implementando controle de acesso baseado em papéis (**RBAC**).

---

## 👥 Integrante do Grupo
* **Vinicius Nacimento Santos** - RA: 2403415

---

## 🛠️ Tecnologias Utilizadas

* **Front-end:** React, Vite, TypeScript, CSS Modules
* **Back-end:** Rust, Axum, Diesel ORM, JWT Authentication
* **Banco de Dados:** PostgreSQL
* **Infraestrutura:** Docker, Docker Compose

---

## 👤 Perfis de Acesso & Atores do Sistema

O sistema é protegido por autenticação JWT e segmentado em três níveis de permissão (`roles`):

| Perfil | Ações Permissões |
| :--- | :--- |
| **🛍️ Comprador** | Gestão de Fornecedores, Registro e Acompanhamento de Pedidos de Compra. |
| **🏷️ Vendedor** | Cadastro de Clientes, Execução de Pedidos de Venda no PDV e Consulta de Estoque. |
| **👑 Administrador** | Acesso irrestrito a todas as funções, Gestão/Cadastro de Produtos no Estoque, Alteração de Perfil de Usuários e Exclusão de Registros. |

---

## 🗓️ Cronograma de Entregas (ACs e Prova)

| Entrega | Data Limite | Escopo Principal / Entregável |
| :--- | :--- | :--- |
| **AC1** | **14/09/2026** | **Módulo do Comprador:** Cadastro de Fornecedores e Pedidos de Compra + Vídeo de apresentação. |
| **AC2** | **13/10/2026** | **Módulo do Administrador:** Cadastro e Inventário de Produtos + Gestão de Roles de Usuários + Vídeo. |
| **AC3** | **08/11/2026** | **Módulo do Vendedor:** Cadastro de Clientes e Ponto de Venda (PDV) com baixa de estoque + Vídeo. |
| **Prova Final** | **22/11/2026** | **Documentação & Refinamentos:** Diagrama de Casos de Uso, Diagrama de Classes e Alerta Visual de Estoque Baixo + Vídeo. |

---

## 🚀 Como executar o projeto

### Pré-requisitos

É necessário ter instalado:

- [Git](https://git-scm.com/);
- [Docker](https://www.docker.com/);
- [Docker Compose](https://docs.docker.com/compose/).

### 1. Clonar o repositório

```bash
git clone https://github.com/vini028/prancheta.git
```
```bash
cd prancheta
```

### 2. Iniciar os contêineres

```bash
docker compose up --build
```

O comando irá construir as imagens e iniciar o front-end, o back-end e o banco de dados.

Para executar em segundo plano, use:

```bash
docker compose up --build -d
```

### 3. Verificar os serviços

```bash
docker compose ps
```

### 4. Acessar o sistema

Depois que os contêineres forem iniciados, acesse:

- **Front-end:** [http://localhost](http://localhost)
- **Back-end:** [http://localhost:3000](http://localhost:3000)
- **PostgreSQL:** `localhost:5432`