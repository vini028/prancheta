import { apiFetch } from '../../shared/api/shared.api';
import type { Cliente, NewCliente, UpdateCliente } from '../types/cliente.types';

export type { Cliente, NewCliente, UpdateCliente };

// GET /api/clientes (ADMIN, SELLER)
export const getClientesApi = (): Promise<Cliente[]> =>
  apiFetch<Cliente[]>('/clientes');

// GET /api/clientes/:id (ADMIN, SELLER)
export const getClienteByIdApi = (id: number): Promise<Cliente> =>
  apiFetch<Cliente>(`/clientes/${id}`);

// POST /api/clientes (ADMIN, SELLER)
export const createClienteApi = (data: NewCliente): Promise<Cliente> =>
  apiFetch<Cliente>('/clientes', {
    method: 'POST',
    body: JSON.stringify(data),
  });

// PUT /api/clientes/:id (ADMIN, SELLER)
export const updateClienteApi = (id: number, data: UpdateCliente): Promise<Cliente> =>
  apiFetch<Cliente>(`/clientes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

// DELETE /api/clientes/:id (ADMIN)
export const deleteClienteApi = (id: number): Promise<void> =>
  apiFetch<void>(`/clientes/${id}`, {
    method: 'DELETE',
  });
