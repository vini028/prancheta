import React from 'react';
import { DataTable } from '../../shared/ui';
import type { Column } from '../../shared/ui';
import type { Fornecedor } from '../api/fornecedoresApi';

interface FornecedorTableProps {
  fornecedores: Fornecedor[];
  loading: boolean;
}

export const FornecedorTable: React.FC<FornecedorTableProps> = ({ fornecedores, loading }) => {
  const columns: Column<Fornecedor>[] = [
    { key: 'nome', header: 'Nome', render: (f) => f.nome },
    { key: 'cnpj', header: 'CNPJ', render: (f) => f.cnpj || '—' },
    { key: 'telefone', header: 'Telefone', render: (f) => f.telefone || '—' },
  ];

  return (
    <DataTable
      columns={columns}
      rows={fornecedores}
      getRowId={(f) => String(f.id)}
      searchKeys={['nome', 'cnpj']}
      searchPlaceholder="Buscar por nome ou CNPJ..."
      loading={loading}
      emptyTitle="Nenhum fornecedor cadastrado"
      emptyHint="Cadastre o primeiro fornecedor acima."
    />
  );
};
