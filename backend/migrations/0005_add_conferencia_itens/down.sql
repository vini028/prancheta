ALTER TABLE pedido_itens DROP CONSTRAINT IF EXISTS chk_pedido_itens_status_item;
ALTER TABLE pedido_itens DROP COLUMN IF EXISTS observacao_item;
ALTER TABLE pedido_itens DROP COLUMN IF EXISTS status_item;
ALTER TABLE pedido_itens DROP COLUMN IF EXISTS quantidade_recebida;
