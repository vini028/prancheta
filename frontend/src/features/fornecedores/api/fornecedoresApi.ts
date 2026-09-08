import { apiFetch } from '../../shared/api/shared.api';

export interface Fornecedor {
  id: number;
  nome: string;
  cnpj?: string | null;
  telefone?: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewFornecedor {
  nome: string;
  cnpj?: string | null;
  telefone?: string | null;
}

export interface UpdateFornecedor {
  nome?: string;
  cnpj?: string | null;
  telefone?: string | null;
}

// GET /api/fornecedores
export const getFornecedoresApi = (): Promise<Fornecedor[]> =>
  apiFetch<Fornecedor[]>('/fornecedores');

// POST /api/fornecedores
export const createFornecedorApi = (data: NewFornecedor): Promise<Fornecedor> =>
  apiFetch<Fornecedor>('/fornecedores', {
    method: 'POST',
    body: JSON.stringify(data),
  });

// PUT /api/fornecedores/:id
export const updateFornecedorApi = (id: number, data: UpdateFornecedor): Promise<Fornecedor> =>
  apiFetch<Fornecedor>(`/fornecedores/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

// DELETE /api/fornecedores/:id
export const deleteFornecedorApi = (id: number): Promise<void> =>
  apiFetch<void>(`/fornecedores/${id}`, {
    method: 'DELETE',
  });
