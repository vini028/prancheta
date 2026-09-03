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
- [ ] Migration e model para a tabela `fornecedores` (`id`, `nome`, `cnpj`, `telefone`).
- [ ] Migration e model para a tabela `pedidos_compra` (`id`, `fornecedor_id`, `item`, `quantidade`, `valor_total`, `comprador_id`).
- [ ] Middleware para validação do perfil (`Comprador` ou `Admin`).
- [ ] Handlers REST: `POST/GET /fornecedores` e `POST/GET /pedidos-compra`.

### Front-end (React/Vite)
- [ ] Form/Modal de cadastro e tabela de listagem de fornecedores.
- [ ] Tela de registro de Pedidos de Compra.
- [ ] Integração com os novos endpoints e controle de visibilidade por perfil.

### Entregáveis Ágeis
- [ ] Atualização do Board no GitHub.
- [ ] Gravação e publicação do vídeo da funcionalidade da AC1.
- [ ] Submissão individual no Google Classroom.

---

## 📦 Sprint 2: AC2 — Módulo do Admin e Inventário (Data Limite: 13/10/2026)
> **Foco:** Gestão de produtos no estoque e administração de usuários.

### Back-end (Rust/Axum/Diesel)
- [ ] Migration e model para a tabela `produtos` (`id`, `nome`, `codigo_barras`, `preco`, `quantidade_estoque`).
- [ ] Handlers REST para produtos: CRUD completo.
- [ ] Rota administrativa: `PUT /users/:id/role` (para alteração de privilégios) e `DELETE /users/:id`.

### Front-end (React/Vite)
- [ ] Tela de cadastro e manutenção do inventário de produtos.
- [ ] Tabela com busca e filtro do estoque.
- [ ] Painel de Administração de Usuários (para o Admin alterar Roles e remover cadastros).

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