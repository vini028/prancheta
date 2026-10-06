import React from 'react';
import { DataTable, Button, useToast } from '../../shared/ui';
import type { Column } from '../../shared/ui';
import type { Cliente } from '../types/cliente.types';
import { deleteClienteApi } from '../api/clientesApi';
import { formatCpf } from '../lib/clienteFormat';
import { useAuth } from '../../auth/hooks/auth.hook';

interface ClienteTableProps {
  clientes: Cliente[];
  loading: boolean;
  onEdit: (cliente: Cliente) => void;
  onRefresh: () => void;
}

export const ClienteTable: React.FC<ClienteTableProps> = ({ clientes, loading, onEdit, onRefresh }) => {
  const { showToast } = useToast();
  const { isAdmin } = useAuth();

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este cliente? As vendas vinculadas serão preservadas.')) return;
    try {
      await deleteClienteApi(id);
      showToast('Cliente excluído com sucesso.', 'success');
      onRefresh?.();
    } catch {
      showToast('Erro ao excluir cliente.', 'error');
    }
  };

  const columns: Column<Cliente>[] = [
    { key: 'nome', header: 'Nome', render: (c) => c.nome },
    { key: 'cpf', header: 'CPF', render: (c) => formatCpf(c.cpf), numeric: true },
    { key: 'email', header: 'E-mail', render: (c) => c.email ?? '—' },
    {
      key: 'actions',
      header: 'Ações',
      render: (c) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" size="sm" onClick={() => onEdit(c)}>Editar</Button>
          {isAdmin && <Button variant="danger" size="sm" onClick={() => handleDelete(c.id)}>Excluir</Button>}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={clientes}
      getRowId={(c) => String(c.id)}
      searchKeys={['nome', 'cpf', 'email']}
      searchPlaceholder="Buscar por nome, CPF ou e-mail..."
      loading={loading}
      emptyTitle="Nenhum cliente cadastrado"
      emptyHint="Cadastre o primeiro cliente acima para liberar o desconto fidelidade no PDV."
    />
  );
};
