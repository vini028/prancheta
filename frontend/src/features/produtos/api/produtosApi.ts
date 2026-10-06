import { apiFetch } from '../../shared/api/shared.api';
import type { NewProduto, Produto, UpdateProduto } from '../types/produto.types';

export type { NewProduto, Produto, UpdateProduto };

export interface EntradaEstoqueInput {
  ean?: string;
  produto_id?: number;
  preco_compra: string;
  quantidade: number;
}

// GET /api/produtos
export const getProdutosApi = (): Promise<Produto[]> =>
  apiFetch<Produto[]>('/produtos');

// POST /api/produtos (ADMIN)
export const createProdutoApi = (data: NewProduto): Promise<Produto> =>
  apiFetch<Produto>('/produtos', {
    method: 'POST',
    body: JSON.stringify(data),
  });

// PUT /api/produtos/:id (ADMIN)
export const updateProdutoApi = (id: number, data: UpdateProduto): Promise<Produto> =>
  apiFetch<Produto>(`/produtos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

// DELETE /api/produtos/:id (ADMIN)
export const deleteProdutoApi = (id: number): Promise<void> =>
  apiFetch<void>(`/produtos/${id}`, {
    method: 'DELETE',
  });

// POST /api/produtos/entrada (ADMIN) — nova carga de estoque em produto
// existente: soma a quantidade e atualiza o preco_compra para o valor
// mais recente (o preco_venda é recalculado sozinho pelo banco).
export const entradaEstoqueApi = (data: EntradaEstoqueInput): Promise<Produto> =>
  apiFetch<Produto>('/produtos/entrada', {
    method: 'POST',
    body: JSON.stringify(data),
  });
