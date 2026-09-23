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
- [ ] Gravação e publicação do vídeo da funcionalidade da AC1.
- [ ] Submissão individual no Google Classroom.

---

## 📦 Sprint 2: AC2 — Módulo do Admin e Inventário (Data Limite: 13/10/2026)
> **Foco:** Gestão de produtos no estoque e administração de usuários.

### Back-end (Rust/Axum/Diesel)
- [x] Migration e model para a tabela `produtos` (`id`, `nome`, `ean` UNIQUE, `preco`, `quantidade_estoque`) + índice `idx_produtos_ean`.
- [x] Handlers REST para produtos: CRUD completo (`POST/GET /api/produtos`, `PUT/DELETE /api/produtos/:id` — escrita só ADMIN, leitura ADMIN/BUYER/SELLER).
- [x] Rota administrativa: `PUT /users/:id/role` (para alteração de privilégios) e `DELETE /users/:id`. *(já existiam como `PATCH /api/admin/users/:id/role` e `DELETE /api/admin/users/:id`)*
- [x] Fluxo de aprovação do pedido: `PATCH /api/pedidos-compra/:id/aprovar` (PENDENTE → APROVADO + `status_envio` = CONFIRMADO, só ADMIN), `/rejeitar` (→ REJEITADO, só ADMIN), `/cancelar` (→ CANCELADO a partir de APROVADO/COM_PROBLEMA, só ADMIN).
- [x] Fluxo logístico: `PATCH /api/pedidos-compra/:id/status-envio` (BUYER dono ou ADMIN override) com máquina CONFIRMADO → ENVIADO → RECEBIDO → CONFERIDO → CONCLUIDO, exceção COM_PROBLEMA (+ `observacao_problema` obrigatória) e entrada em estoque transacional e idempotente na conclusão.
- [x] Edição de pedido (`PUT /api/pedidos-compra/:id`) bloqueada fora de PENDENTE (409).
- [x] Preços de compra/venda: `preco_compra` + `preco_venda` gerada no Postgres (`ROUND(preco_compra * 1.30, 2)` STORED) — migration `0004`, nunca dessincroniza.
- [x] Conferência item a item: `quantidade_recebida`, `status_item` (PENDENTE/OK/PROBLEMA), `observacao_item` em `pedido_itens` (migration `0005`) + `PUT /api/pedidos-compra/:id/conferencia` (BUYER dono ou ADMIN, só em RECEBIDO, 409 fora disso, 400 p/ PROBLEMA sem observação).
- [x] Regras de envio reforçadas: CONFERIDO exige conferência completa sem PROBLEMA (409); COM_PROBLEMA reaproveita observações da conferência; CONCLUIDO sobe ao estoque pela quantidade recebida (`quantidade_recebida ?? quantidade`).

### Front-end (React/Vite)
- [x] Tela de cadastro e manutenção do inventário de produtos (`/inventory`: `ProdutoForm` + edição em modal).
- [x] Tabela com busca (nome/EAN) e filtro do estoque (`ProdutoTable`), com alerta de estoque baixo (< 5).
- [x] Painel de Administração de Usuários (para o Admin alterar Roles e remover cadastros). *(já existia em `/users`)*
- [x] Pedidos com colunas Aprovação + Envio, botões Aprovar/Rejeitar/Cancelar (ADMIN), stepper de envio + modal "Relatar problema" (BUYER dono), override de envio (ADMIN).
- [x] Tabela de produtos com colunas "Preço de Compra" e "Preço de Venda" (+30%) lado a lado; form edita só o preço de compra (venda recalcula no banco).
- [x] Tela de Conferência (`/compras/:id/conferencia`, botão "Conferir itens" em pedidos RECEBIDOS): qtd. recebida, seletor OK/Problema, observação obrigatória p/ Problema, "Salvar conferência" + "Confirmar conferência" (→ CONFERIDO, só sem Problema) / "Reportar problema no pedido" (→ COM_PROBLEMA).

### Entregáveis Ágeis
- [ ] Gravação do vídeo com perfil `Admin` cadastrando produtos e alterando roles.
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

## 🏁 Sprint Final: Prova — Diagramas UML e Refinamentos (Data Limite: 22/11/2026)
> **Foco:** Documentação arquitetural completa e melhorias visuais.

### Documentação Arquitetural
- [ ] **Diagrama de Casos de Uso:** Mapeamento dos atores (`Comprador`, `Vendedor`, `Administrador`) e suas interações com o sistema.
- [ ] **Diagrama de Classes:** Mapeamento da estrutura das entidades (`User`, `Fornecedor`, `PedidoCompra`, `Produto`, `Cliente`, `Venda`).
- [ ] Exportação e inclusão dos diagramas na pasta `/docs` do repositório.

### Funcionalidade Visual Extra
- [ ] Destaque/Alerta em vermelho na interface para produtos com estoque baixo (ex: < 5 unidades).
- [ ] Dashboard com indicadores agregados (Total de Compras x Total de Vendas).

### Entregáveis Ágeis
- [ ] Gravação do vídeo final apresentando o sistema completo e os diagramas UML.
- [ ] Submissão final no Google Classroom com lista dos participantes.