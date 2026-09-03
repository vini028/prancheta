import React, { useCallback, useEffect, useState } from 'react';
import { getUsersApi, updateUserRoleApi, deleteUserApi } from '../api/user.api';
import type { User } from '../types/user.types';
import { useAuth } from '../../auth/hooks/auth.hook';
import { AppShell, Badge, DataTable, useToast } from '../../shared/ui';
import type { Column } from '../../shared/ui';

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export const UsersManagementPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getUsersApi();
      setUsers(data);
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Erro ao carregar usuários.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await updateUserRoleApi(userId, newRole);
      await loadUsers();
      showToast('Perfil atualizado com sucesso.', 'success');
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Erro ao atualizar perfil.'), 'error');
      
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o usuário "${userName}"?`)) {
      return;
    }
    try {
      await deleteUserApi(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      showToast('Usuário excluído.', 'success');
      await loadUsers();
    } catch (err: unknown) {
      console.log(err)
      showToast(getErrorMessage(err, 'Erro ao excluir usuário.'), 'error');
    }
  };

  useEffect(() => {
    void Promise.resolve().then(loadUsers);
  }, [loadUsers]);

  const columns: Column<User>[] = [
    { key: 'name', header: 'Nome', render: (u) => u.name },
    { key: 'email', header: 'E-mail', render: (u) => u.email },
    { key: 'role', header: 'Cargo atual', render: (u) => <Badge role={u.role} /> },
    {
      key: 'change',
      header: 'Alterar cargo',
      render: (u) => {
        const isSelf = currentUser?.id !== undefined && String(currentUser.id) === String(u.id);
        return (
          <select
            value={u.role}
            onChange={(e) => handleRoleChange(u.id, e.target.value)}
            disabled={isSelf}
            style={{
              padding: '6px 8px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              fontSize: 'var(--text-sm)',
              background: isSelf ? 'var(--surface-sunken)' : 'var(--surface)',
            }}
          >
            <option value="BUYER">BUYER</option>
            <option value="SELLER">SELLER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        );
      },
    },
  ];

  return (
    <AppShell title="Gestão de usuários">
      <DataTable
        columns={columns}
        rows={users}
        getRowId={(u) => u.id}
        searchKeys={['name', 'email']}
        searchPlaceholder="Buscar por nome ou e-mail..."
        loading={loading}
        emptyTitle="Nenhum usuário cadastrado"
        rowActions={(u) => {
          const isSelf = currentUser?.id !== undefined && String(currentUser.id) === String(u.id);
          return (
            <button
              onClick={() => handleDeleteUser(u.id, u.name)}
              disabled={isSelf}
              title={isSelf ? 'Você não pode excluir sua própria conta' : 'Excluir usuário'}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: isSelf ? 'var(--surface-sunken)' : 'var(--danger-bg)',
                color: isSelf ? 'var(--text-muted)' : 'var(--danger)',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                cursor: isSelf ? 'not-allowed' : 'pointer',
              }}
            >
              Excluir
            </button>
          );
        }}
      />
    </AppShell>
  );
};
