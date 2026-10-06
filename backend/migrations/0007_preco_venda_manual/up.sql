-- AC03: preco_venda deixa de ser coluna gerada fixa (STORED) e passa a ser
-- um campo DECIMAL(10,2) convencional, editável pelo ADMIN.
-- Os valores atuais (compra * 1.30) são preservados na conversão.
ALTER TABLE produtos ALTER COLUMN preco_venda DROP EXPRESSION;

-- Garante a invariante de domínio: preço de venda sempre preenchido.
ALTER TABLE produtos ALTER COLUMN preco_venda SET NOT NULL;

-- Rede de segurança no banco: se preco_venda chegar NULL no INSERT/UPDATE,
-- assume o padrão histórico ROUND(preco_compra * 1.30, 2).
-- (O backend também calcula esse default na camada de aplicação; o trigger
-- cobre escritas diretas e impede NULL de vazar para a constraint acima.)
CREATE OR REPLACE FUNCTION trg_produtos_preco_venda_default()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.preco_venda IS NULL THEN
        NEW.preco_venda := ROUND(NEW.preco_compra * 1.30, 2);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS produtos_preco_venda_default ON produtos;
CREATE TRIGGER produtos_preco_venda_default
    BEFORE INSERT OR UPDATE OF preco_compra, preco_venda ON produtos
    FOR EACH ROW
    EXECUTE FUNCTION trg_produtos_preco_venda_default();
