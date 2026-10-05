import React, { useCallback, useEffect, useState } from 'react';
import {
  getUsersApi,
  updateUserRoleApi,
  deleteUserApi,
  toggleUserActiveStatus,
} from '../api/user.api';
import type { User } from '../types/user.types';
import { useAuth } from '../../auth/hooks/auth.hook';
import { AppShell, Badge, Button, DataTable, Modal, useToast } from '../../shared/ui';
import type { Column } from '../../shared/ui';

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export const UsersManagementPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
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

  const handleToggleActive = async (target: User) => {
    const nextActive = !target.is_active;
    setTogglingId(target.id);
    try {
      const updated = await toggleUserActiveStatus(target.id, nextActive);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      showToast(
        nextActive ? `Usuário "${target.name}" ativado.` : `Usuário "${target.name}" desativado.`,
        'success',
      );
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Erro ao alterar status do usuário.'), 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    try {
      await deleteUserApi(userToDelete.id);
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      showToast('Usuário excluído definitivamente.', 'success');
      setUserToDelete(null);
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Erro ao excluir usuário.'), 'error');
    } finally {
      setDeleting(false);
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
      key: 'status',
      header: 'Status',
      render: (u) => (
        <Badge tone={u.is_active ? 'positive' : 'danger'}>
          {u.is_active ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
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
              minWidth: '110px', // Define uma largura mínima para a coluna não esmagar
              cursor: isSelf ? 'not-allowed' : 'pointer',
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
          const isToggling = togglingId === u.id;
          return (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'flex-end' }}>
              <button
                onClick={() => handleToggleActive(u)}
                disabled={isSelf || isToggling}
                title={
                  isSelf
                    ? 'Você não pode desativar sua própria conta'
                    : u.is_active
                      ? 'Desativar usuário (mantém a conta)'
                      : 'Ativar usuário'
                }
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  background: isSelf ? 'var(--surface-sunken)' : u.is_active ? 'var(--warning-bg)' : 'var(--positive-bg)',
                  color: isSelf ? 'var(--text-muted)' : u.is_active ? '#8a5108' : '#106b34',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  cursor: isSelf || isToggling ? 'not-allowed' : 'pointer',
                  opacity: isToggling ? 0.6 : 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {isToggling ? 'Aguarde...' : u.is_active ? 'Desativar' : 'Ativar'}
              </button>
              <button
                onClick={() => setUserToDelete(u)}
                disabled={isSelf}
                title={isSelf ? 'Você não pode excluir sua própria conta' : 'Excluir usuário definitivamente'}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: isSelf ? 'var(--surface-sunken)' : 'var(--danger-bg)',
                  color: isSelf ? 'var(--text-muted)' : 'var(--danger)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  cursor: isSelf ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Excluir
              </button>
            </div>
          );
        }}
      />

      <Modal
        isOpen={!!userToDelete}
        onClose={() => (deleting ? undefined : setUserToDelete(null))}
        title="Excluir usuário definitivamente"
      >
        {userToDelete && (
          <div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              Tem certeza que deseja excluir definitivamente o usuário{' '}
              <strong>"{userToDelete.name}"</strong> ({userToDelete.email})?
              <br />
              Esta ação remove a conta do banco de dados e não pode ser desfeita. Prefira{' '}
              <strong>Desativar</strong> se quiser apenas bloquear o acesso.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
              <Button variant="secondary" size="sm" onClick={() => setUserToDelete(null)} disabled={deleting}>
                Cancelar
              </Button>
              <Button variant="danger" size="sm" onClick={handleConfirmDelete} isLoading={deleting} loadingText="Excluindo...">
                Excluir definitivamente
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
};
