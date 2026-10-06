---

### 🗺️ `ROADMAP.md`

# 🗺️ Roadmap de Desenvolvimento — Prancheta

Este documento mapeia o desenvolvimento incremental do **Prancheta**, dividido em Sprints que correspondem às Atividades Continuadas (ACs) e à Prova Final da disciplina.

---

## 📌 Sprint 0: Base e Autenticação (Concluído)
- [x] Configuração da estrutura Docker Compose (PostgreSQL, Axum, React/Vite).
- [x] Modelagem inicial e migration da tabela `users` com campo `role` (`comprador`, `vendedor`, `admin`).
- [x] Endpoints de Registro (`/auth/register`) e Login com geração de JWT (`/auth/login`).
- [x] Interface de Login, Registro e Alteração de Senha no React.
- [x] Componentes base da UI (AppShell, Button, Input, Card, Badge, DataTable).

---

## 📦 Sprint 1: AC1 — Módulo do Comprador (Data Limite: 14/09/2026)
> **Foco:** Entrada de fornecedores e controle de compras de insumos para a papelaria.

### Back-end (Rust/Axum/Diesel)
- [x] Migration e model para a tabela `fornecedores` (`id`, `nome`, `cnpj`, `telefone`).
- [x] Migration e model para a tabela `pedidos_compra` (`id`, `fornecedor_id`, `item`, `quantidade`, `valor_total`, `comprador_id`).
- [x] Middleware para validação do perfil (`Comprador` ou `Admin`).
- [x] Handlers REST: `POST/GET /fornecedores` e `POST/GET /pedidos-compra`.

### Front-end (React/Vite)
- [x] Form/Modal de cadastro e tabela de listagem de fornecedores.
- [x] Tela de registro de Pedidos de Compra.
- [x] Integração com os novos endpoints e controle de visibilidade por perfil.

### Entregáveis Ágeis
- [x] Atualização do Board no GitHub.
- [x] Gravação e publicação do vídeo da funcionalidade da AC1.
- [x] Submissão individual no Google Classroom.

---

## 📦 Sprint 2: AC2 — Módulo do Admin e Inventário (Data Limite: 13/10/2026)
> **Foco:** Cadastro/Gestão de produtos no estoque e Fluxo de Aprovação de Pedidos de Compra.

### Back-end (Rust/Axum/Diesel)
- [x] Migration e model para a tabela `produtos` (`id`, `nome`, `ean` UNIQUE, `preco_compra`, `quantidade_estoque`) + índice `idx_produtos_ean`.
- [x] Preços de compra/venda: `preco_compra` + `preco_venda` gerada no Postgres (`ROUND(preco_compra * 1.30, 2)` STORED) — migration `0004`.
- [x] Handlers REST para produtos: CRUD completo (`POST/GET /api/produtos`, `PUT/DELETE /api/produtos/:id` — escrita só ADMIN, leitura ADMIN/BUYER/SELLER).
- [x] Fluxo de aprovação do pedido pelo Admin: `PATCH /api/pedidos-compra/:id/aprovar` (PENDENTE → APROVADO + `status_envio` = CONFIRMADO), `/rejeitar` (→ REJEITADO), `/cancelar` (→ CANCELADO).
- [x] Fluxo logístico e atualização transacional do estoque: `PATCH /api/pedidos-compra/:id/status-envio` (CONFIRMADO → ENVIADO → RECEBIDO → CONFERIDO → CONCLUIDO) com atualização automática e idempotente do estoque e preço de compra ao concluir.
- [x] Conferência item a item: `PUT /api/pedidos-compra/:id/conferencia` (`quantidade_recebida`, status OK/PROBLEMA e observações por item).

### Front-end (React/Vite)
- [x] Tela de cadastro e manutenção do inventário de produtos (`/inventory`: `ProdutoForm` + modal de edição).
- [x] Tabela de estoque com busca por EAN/Nome, exibição lado a lado dos preços de compra/venda e alertas visuais de estoque baixo.
- [x] Tabela de Pedidos de Compra com ações de aprovação/rejeição/cancelamento pelo Admin e stepper do status logístico.
- [x] Tela de Conferência de Itens (`/compras/:id/conferencia`) para validação do recebimento antes do lançamento no estoque.

### Entregáveis Ágeis
- [ ] Gravação do vídeo com perfil `Admin` cadastrando produtos no estoque e aprovando pedidos de compra.
- [ ] Submissão no Google Classroom.

---

## 📦 Sprint 3: AC3 — Módulo do Vendedor e PDV (Data Limite: 08/11/2026)
> **Foco:** Atendimento ao cliente, criação de pedidos de venda e baixa em estoque.

### Back-end (Rust/Axum/Diesel)
- [ ] Migration e model para a tabela `clientes` (`id`, `nome`, `cpf`, `email`).
- [ ] Migration e model para tabelas `vendas` e `itens_venda`.
- [ ] Transação na rota de checkout (`POST /vendas`): registrar a venda, vincular o cliente/vendedor e decrementar a quantidade na tabela `produtos`.

### Front-end (React/Vite)
- [ ] Form/Tabela de Gestão de Clientes.
- [ ] Interface de Ponto de Venda (PDV / Carrinho): seleção de produtos, atribuição de cliente e conclusão da venda.

### Entregáveis Ágeis
- [ ] Gravação do vídeo do fluxo de venda completo com baixa automática de estoque.
- [ ] Submissão no Google Classroom.

---

## 🏁 Sprint Final: Prova — Gestão de Usuários, Diagramas UML e Refinamentos (Data Limite: 22/11/2026)
> **Foco:** Painel de Usuários, documentação arquitetural e melhorias visuais.

### Módulo do Administrador — Gestão de Usuários
- [ ] Painel de Administração de Usuários (`/users`):
  - Rota `PATCH /api/admin/users/:id/role` para alteração de privilégios (`ADMIN`, `BUYER`, `SELLER`).
  - Rota `PATCH /api/admin/users/:id/active` para habilitação/desabilitação de contas (`is_active`).
  - Rota `DELETE /api/admin/users/:id` para exclusão definitiva de cadastros.

### Documentação Arquitetural
- [ ] **Diagrama de Casos de Uso:** Mapeamento dos atores (`Comprador`, `Vendedor`, `Administrador`) e suas interações com o sistema.
- [ ] **Diagrama de Classes:** Mapeamento da estrutura das entidades (`User`, `Fornecedor`, `PedidoCompra`, `Produto`, `Cliente`, `Venda`).
- [ ] Exportação e inclusão dos diagramas na pasta `/docs` do repositório.

### Funcionalidades Visuais e Dashboard
- [ ] Destaque/Alerta em vermelho na interface para produtos com estoque baixo (ex: < 5 unidades).
- [ ] Dashboard com indicadores agregados (Total de Compras x Total de Vendas).

### Entregáveis Ágeis
- [ ] Gravação do vídeo final apresentando o sistema completo e os diagramas UML.
- [ ] Submissão final no Google Classroom com lista dos participantes.