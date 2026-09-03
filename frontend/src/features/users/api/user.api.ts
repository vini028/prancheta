import { apiFetch } from '../../shared/api/shared.api';
import type { User, ChangePasswordDto } from '../types/user.types';

// Buscar lista de usuários (Apenas Admin)
export const getUsersApi = async (): Promise<User[]> => {
  return apiFetch<User[]>('/admin/users');
};

// Atualizar cargo do usuário (Apenas Admin)
export const updateUserRoleApi = async (id: string, role: string): Promise<User> => {
  return apiFetch<User>(`/admin/users/${id}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
};

// 🌟 NOVO: Deletar usuário (Apenas Admin)
export const deleteUserApi = async (id: string): Promise<void> => {
  return apiFetch<void>(`/admin/users/${id}`, {
    method: 'DELETE',
  });
};

// 🌟 NOVO: Alterar própria senha (Disponível para qualquer usuário autenticado)
export const changePasswordApi = async (dto: ChangePasswordDto): Promise<{ message: string }> => {
  return apiFetch<{ message: string }>('/me/password', {
    method: 'PUT',
    body: JSON.stringify(dto),
  });
};