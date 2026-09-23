ALTER TABLE pedidos_compra ADD COLUMN status_envio VARCHAR(20) NULL;
ALTER TABLE pedidos_compra ADD COLUMN observacao_problema TEXT NULL;

ALTER TABLE pedidos_compra ADD CONSTRAINT chk_pedidos_status_envio
    CHECK (status_envio IS NULL OR status_envio IN ('CONFIRMADO', 'ENVIADO', 'RECEBIDO', 'CONFERIDO', 'CONCLUIDO', 'COM_PROBLEMA'));

ALTER TABLE pedidos_compra ADD CONSTRAINT chk_pedidos_status
    CHECK (status IN ('PENDENTE', 'APROVADO', 'REJEITADO', 'CANCELADO'));
