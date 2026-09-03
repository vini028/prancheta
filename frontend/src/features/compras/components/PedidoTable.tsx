import React, { useMemo } from 'react';
import { DataTable } from '../../shared/ui';
import type { Column } from '../../shared/ui';
import type { Pedido } from '../api/comprasApi';
import type { Fornecedor } from '../../fornecedores/api/fornecedoresApi';

interface PedidoTableProps {
  pedidos: Pedido[];
  fornecedores: Fornecedor[];
  loading: boolean;
}

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export const PedidoTable: React.FC<PedidoTableProps> = ({ pedidos, fornecedores, loading }) => {
  const fornecedorNome = useMemo(() => {
    const map = new Map(fornecedores.map((f) => [f.id, f.nome]));
    return (id: number) => map.get(id) ?? `#${id}`;
  }, [fornecedores]);

  const columns: Column<Pedido>[] = [
    { key: 'fornecedor', header: 'Fornecedor', render: (p) => fornecedorNome(p.fornecedor_id) },
    { key: 'item', header: 'Item', render: (p) => p.item },
    { key: 'quantidade', header: 'Quantidade', render: (p) => p.quantidade, numeric: true },
    { key: 'valor_total', header: 'Valor total', render: (p) => currency.format(Number(p.valor_total)), numeric: true },
  ];

  return (
    <DataTable
      columns={columns}
      rows={pedidos}
      getRowId={(p) => String(p.id)}
      searchKeys={['item']}
      searchPlaceholder="Buscar por item..."
      loading={loading}
      emptyTitle="Nenhum pedido de compra registrado"
      emptyHint="Registre o primeiro pedido acima."
    />
  );
};
