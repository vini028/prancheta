import React, { useState } from 'react';
import { createProdutoApi, updateProdutoApi } from '../api/produtosApi';
import type { Produto } from '../types/produto.types';
import { Button, Card, Input, useToast } from '../../shared/ui';

interface ProdutoFormProps {
  onSuccess: () => void;
  produto?: Produto;
}

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export const ProdutoForm: React.FC<ProdutoFormProps> = ({ onSuccess, produto }) => {
  const [nome, setNome] = useState(produto?.nome ?? '');
  const [ean, setEan] = useState(produto?.ean ?? '');
  const [precoCompra, setPrecoCompra] = useState(produto ? String(produto.preco_compra) : '');
  const [quantidade, setQuantidade] = useState(produto?.quantidade_estoque ?? 0);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim()) {
      showToast('Informe o nome do produto.', 'error');
      return;
    }
    if (!ean.trim()) {
      showToast('Informe o EAN do produto (13 dígitos).', 'error');
      return;
    }
    if (Number(precoCompra) < 0 || precoCompra === '') {
      showToast('Informe um preço de compra válido.', 'error');
      return;
    }
    if (quantidade < 0) {
      showToast('A quantidade em estoque não pode ser negativa.', 'error');
      return;
    }

    setLoading(true);
    try {
      if (produto) {
        await updateProdutoApi(produto.id, {
          nome: nome.trim(),
          preco_compra: Number(precoCompra).toFixed(2),
          quantidade_estoque: quantidade,
        });
        showToast('Produto atualizado com sucesso.', 'success');
      } else {
        await createProdutoApi({
          nome: nome.trim(),
          ean: ean.trim(),
          preco_compra: Number(precoCompra).toFixed(2),
          quantidade_estoque: quantidade,
        });
        showToast('Produto cadastrado com sucesso.', 'success');
        setNome('');
        setEan('');
        setPrecoCompra('');
        setQuantidade(0);
      }
      onSuccess();
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Erro ao salvar produto.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title={produto ? 'Editar produto' : 'Novo produto'}>
      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: 'grid',
            gap: 'var(--space-3)',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            marginBottom: 'var(--space-4)',
          }}
        >
          <Input label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required fullWidth />
          <Input
            label="EAN"
            value={ean}
            maxLength={13}
            onChange={(e) => setEan(e.target.value)}
            required
            fullWidth
            disabled={!!produto}
            placeholder="Código de barras (13 dígitos)"
          />
          <Input
            label="Preço de Compra (R$)"
            type="number"
            min={0}
            step="0.01"
            value={precoCompra}
            onChange={(e) => setPrecoCompra(e.target.value)}
            required
            fullWidth
          />
          <Input
            label="Qtd. em estoque"
            type="number"
            min={0}
            value={quantidade}
            onChange={(e) => setQuantidade(Number(e.target.value))}
            required
            fullWidth
          />
        </div>
        <Button type="submit" isLoading={loading} loadingText="Salvando...">
          {produto ? 'Atualizar produto' : 'Salvar produto'}
        </Button>
      </form>
    </Card>
  );
};
