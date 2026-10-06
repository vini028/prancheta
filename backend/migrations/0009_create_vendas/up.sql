-- AC03: vendas do PDV e seus itens.
CREATE TABLE vendas (
    id SERIAL PRIMARY KEY,
    -- Cliente opcional: NULL = "cliente não identificado" (sem desconto fidelidade).
    cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
    vendedor_id UUID NOT NULL REFERENCES users(id),
    metodo_pagamento VARCHAR(20) NOT NULL
        CHECK (metodo_pagamento IN ('DINHEIRO', 'PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO')),
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
    desconto_total NUMERIC(10, 2) NOT NULL DEFAULT 0,
    valor_final NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE itens_venda (
    id SERIAL PRIMARY KEY,
    venda_id INTEGER NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
    produto_id INTEGER NOT NULL REFERENCES produtos(id),
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    preco_unitario NUMERIC(10, 2) NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vendas_cliente_id ON vendas(cliente_id);
CREATE INDEX idx_vendas_vendedor_id ON vendas(vendedor_id);
CREATE INDEX idx_itens_venda_venda_id ON itens_venda(venda_id);
