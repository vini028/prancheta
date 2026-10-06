import React from 'react';
import { DataTable, Button, Badge, useToast } from '../../shared/ui';
import type { Column } from '../../shared/ui';
import type { Produto } from '../types/produto.types';
import { deleteProdutoApi } from '../api/produtosApi';

interface ProdutoTableProps {
  produtos: Produto[];
  loading: boolean;
  canEdit: boolean;
  onEdit: (produto: Produto) => void;
  onRefresh: () => void;
}

const formatCurrency = (value: number | string) =>
  Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const ProdutoTable: React.FC<ProdutoTableProps> = ({ produtos, loading, canEdit, onEdit, onRefresh }) => {
  const { showToast } = useToast();

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    try {
      await deleteProdutoApi(id);
      showToast('Produto excluído com sucesso.', 'success');
      onRefresh?.();
    } catch {
      showToast('Erro ao excluir produto.', 'error');
    }
  };

  const columns: Column<Produto>[] = [
    { key: 'nome', header: 'Nome', render: (p) => p.nome },
    { key: 'ean', header: 'EAN', render: (p) => p.ean, numeric: true },
    { key: 'preco_compra', header: 'Preço de Compra', render: (p) => formatCurrency(p.preco_compra), numeric: true },
    {
      key: 'preco_venda',
      header: 'Preço de Venda',
      render: (p) => {
        const compra = Number(p.preco_compra);
        const venda = Number(p.preco_venda);
        const padrao = Math.abs(venda - compra * 1.3) < 0.015;
        return (
          <span style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
            {formatCurrency(p.preco_venda)}
            {padrao ? <Badge tone="positive">+30%</Badge> : <Badge tone="info">Individual</Badge>}
          </span>
        );
      },
      numeric: true,
    },
    {
      key: 'quantidade_estoque',
      header: 'Estoque',
      render: (p) =>
        p.quantidade_estoque < 5 ? (
          <span style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
            {p.quantidade_estoque}
            <Badge tone="danger">Estoque baixo</Badge>
          </span>
        ) : (
          p.quantidade_estoque
        ),
      numeric: true,
    },
  ];

  if (canEdit) {
    columns.push({
      key: 'actions',
      header: 'Ações',
      render: (p) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" size="sm" onClick={() => onEdit(p)}>Editar</Button>
          <Button variant="danger" size="sm" onClick={() => handleDelete(p.id)}>Excluir</Button>
        </div>
      ),
    });
  }

  return (
    <DataTable
      columns={columns}
      rows={produtos}
      getRowId={(p) => String(p.id)}
      searchKeys={['nome', 'ean']}
      searchPlaceholder="Buscar por Nome ou EAN..."
      loading={loading}
      emptyTitle="Nenhum produto em estoque"
      emptyHint="Cadastre o primeiro produto acima ou conclua um pedido de compra."
    />
  );
};
