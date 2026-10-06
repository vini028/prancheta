-- Rollback da AC03 (parte 1): restaura preco_venda como coluna gerada fixa.
-- ATENÇÃO: preços individualizados pelo ADMIN são perdidos no rollback
-- (tudo é recalculado como ROUND(preco_compra * 1.30, 2)).
UPDATE produtos SET preco_venda = ROUND(preco_compra * 1.30, 2);

DROP TRIGGER IF EXISTS produtos_preco_venda_default ON produtos;
DROP FUNCTION IF EXISTS trg_produtos_preco_venda_default();

ALTER TABLE produtos ALTER COLUMN preco_venda
    ADD GENERATED ALWAYS AS (ROUND(preco_compra * 1.30, 2)) STORED;
