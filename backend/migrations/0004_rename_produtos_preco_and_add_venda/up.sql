ALTER TABLE produtos RENAME COLUMN preco TO preco_compra;

ALTER TABLE produtos ADD COLUMN preco_venda NUMERIC(10,2)
    GENERATED ALWAYS AS (ROUND(preco_compra * 1.30, 2)) STORED;
