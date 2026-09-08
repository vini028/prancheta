import React from 'react';
import { DataTable, Button, useToast } from '../../shared/ui';
import type { Column } from '../../shared/ui';
import type { Fornecedor } from '../api/fornecedoresApi';
import { deleteFornecedorApi } from '../api/fornecedoresApi';

interface FornecedorTableProps {
  fornecedores: Fornecedor[];
  loading: boolean;
  onEdit: (fornecedor: Fornecedor) => void;
  onRefresh: () => void;
}

export const FornecedorTable: React.FC<FornecedorTableProps> = ({ fornecedores, loading, onEdit, onRefresh }) => {
  const { showToast } = useToast();

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este fornecedor?')) return;
    try {
      await deleteFornecedorApi(id);
      showToast('Fornecedor excluído com sucesso.', 'success');
      onRefresh?.();
    } catch {
      showToast('Erro ao excluir fornecedor.', 'error');
    }
  };

  const columns: Column<Fornecedor>[] = [
    { key: 'nome', header: 'Nome', render: (f) => f.nome },
    { key: 'cnpj', header: 'CNPJ', render: (f) => f.cnpj || '—' },
    { key: 'telefone', header: 'Telefone', render: (f) => f.telefone || '—' },
    {
      key: 'actions',
      header: 'Ações',
      render: (f) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" onClick={() => onEdit(f)}>Editar</Button>
          <Button variant="danger" onClick={() => handleDelete(f.id)}>Excluir</Button>
        </div>
      ),
    },
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
