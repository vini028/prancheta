ALTER TABLE pedido_itens ADD COLUMN quantidade_recebida INTEGER NULL;
ALTER TABLE pedido_itens ADD COLUMN status_item VARCHAR(20) NOT NULL DEFAULT 'PENDENTE';
ALTER TABLE pedido_itens ADD COLUMN observacao_item TEXT NULL;

ALTER TABLE pedido_itens ADD CONSTRAINT chk_pedido_itens_status_item
    CHECK (status_item IN ('PENDENTE', 'OK', 'PROBLEMA'));
