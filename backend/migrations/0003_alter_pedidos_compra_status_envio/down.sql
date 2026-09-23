ALTER TABLE pedidos_compra DROP CONSTRAINT IF EXISTS chk_pedidos_status;
ALTER TABLE pedidos_compra DROP CONSTRAINT IF EXISTS chk_pedidos_status_envio;
ALTER TABLE pedidos_compra DROP COLUMN IF EXISTS observacao_problema;
ALTER TABLE pedidos_compra DROP COLUMN IF EXISTS status_envio;
