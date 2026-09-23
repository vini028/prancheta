ALTER TABLE produtos DROP COLUMN IF EXISTS preco_venda;

ALTER TABLE produtos RENAME COLUMN preco_compra TO preco;
