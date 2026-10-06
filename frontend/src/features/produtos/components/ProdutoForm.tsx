import React, { useState } from 'react';
import { createProdutoApi, updateProdutoApi } from '../api/produtosApi';
import type { Produto } from '../types/produto.types';
import { calcularMargem, calcularPrecoVenda, margemInicial } from '../lib/margem';
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
  const [precoVenda, setPrecoVenda] = useState(produto ? String(produto.preco_venda) : '');
  const [margem, setMargem] = useState(
    produto ? margemInicial(produto.preco_compra, produto.preco_venda) : '',
  );
  const [quantidade, setQuantidade] = useState(produto?.quantidade_estoque ?? 0);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  // Sincronia bidirecional margem <-> venda. Cada handler recalcula apenas o
  // outro campo, então não há loop: compra nova revaloriza pela margem (se
  // preenchida) ou rederiva a margem da venda (se só ela estiver preenchida).
  const handleCompraChange = (valor: string) => {
    setPrecoCompra(valor);
    if (margem.trim() !== '') {
      const venda = calcularPrecoVenda(valor, margem);
      if (venda !== '') setPrecoVenda(venda);
    } else if (precoVenda.trim() !== '') {
      setMargem(calcularMargem(valor, precoVenda));
    }
  };

  const handleMargemChange = (valor: string) => {
    setMargem(valor);
    const venda = calcularPrecoVenda(precoCompra, valor);
    if (venda !== '') setPrecoVenda(venda);
  };

  const handleVendaChange = (valor: string) => {
    setPrecoVenda(valor);
    setMargem(calcularMargem(precoCompra, valor));
  };

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
    if (precoCompra === '' || Number(precoCompra) <= 0) {
      showToast('Informe um preço de compra maior que zero.', 'error');
      return;
    }
    if (precoVenda !== '' && Number(precoVenda) <= 0) {
      showToast('Informe um preço de venda maior que zero (ou deixe em branco para usar o padrão).', 'error');
      return;
    }
    if (quantidade < 0) {
      showToast('A quantidade em estoque não pode ser negativa.', 'error');
      return;
    }

    setLoading(true);
    try {
      const precoVendaPayload = precoVenda === '' ? undefined : Number(precoVenda).toFixed(2);
      if (produto) {
        await updateProdutoApi(produto.id, {
          nome: nome.trim(),
          preco_compra: Number(precoCompra).toFixed(2),
          // Na edição, o campo vem preenchido: o ADMIN ajusta o valor e ele
          // é persistido como preço individualizado.
          ...(precoVendaPayload !== undefined ? { preco_venda: precoVendaPayload } : {}),
          quantidade_estoque: quantidade,
        });
        showToast('Produto atualizado com sucesso.', 'success');
      } else {
        await createProdutoApi({
          nome: nome.trim(),
          ean: ean.trim(),
          preco_compra: Number(precoCompra).toFixed(2),
          // Em branco => backend aplica ROUND(preco_compra * 1.30, 2).
          ...(precoVendaPayload !== undefined ? { preco_venda: precoVendaPayload } : {}),
          quantidade_estoque: quantidade,
        });
        showToast('Produto cadastrado com sucesso.', 'success');
        setNome('');
        setEan('');
        setPrecoCompra('');
        setPrecoVenda('');
        setMargem('');
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
            min={0.01}
            step="0.01"
            value={precoCompra}
            onChange={(e) => handleCompraChange(e.target.value)}
            required
            fullWidth
            placeholder="Ex.: 10.50"
          />
          <Input
            label="Margem de Lucro (%)"
            type="number"
            step="0.01"
            value={margem}
            onChange={(e) => handleMargemChange(e.target.value)}
            fullWidth
            placeholder="Ex.: 30"
          />
          <Input
            label="Preço de Venda (R$)"
            type="number"
            min={0.01}
            step="0.01"
            value={precoVenda}
            onChange={(e) => handleVendaChange(e.target.value)}
            fullWidth
            placeholder="Ex.: 13.65"
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
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
          {produto
            ? 'Margem e preço de venda andam juntos: edite um e o outro recalcula na hora.'
            : 'Digite a margem (%) para calcular a venda, ou digite a venda para ver a margem. Em branco, o backend usa o padrão (compra × 1,30).'}
          {produto && (
            <> Ao registrar nova carga com outro valor, o preço de compra é atualizado para o mais recente (a venda é preservada).</>
          )}
        </p>
        <Button type="submit" isLoading={loading} loadingText="Salvando...">
          {produto ? 'Atualizar produto' : 'Salvar produto'}
        </Button>
      </form>
    </Card>
  );
};
