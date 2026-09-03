import { apiFetch } from '../../shared/api/shared.api';

export interface Fornecedor {
  id: number;
  nome: string;
  cnpj?: string | null;
  telefone?: string | null;
  created_at: string;
}

export interface NewFornecedor {
  nome: string;
  cnpj?: string | null;
  telefone?: string | null;
}

// GET /api/fornecedores — Comprador ou Admin (auth via apiFetch)
export const getFornecedoresApi = (): Promise<Fornecedor[]> =>
  apiFetch<Fornecedor[]>('/fornecedores');

// POST /api/fornecedores — Comprador ou Admin (auth via apiFetch)
export const createFornecedorApi = (data: NewFornecedor): Promise<Fornecedor> =>
  apiFetch<Fornecedor>('/fornecedores', {
    method: 'POST',
    body: JSON.stringify(data),
  });
