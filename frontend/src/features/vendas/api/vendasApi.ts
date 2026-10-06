import { apiFetch } from '../../shared/api/shared.api';
import type { CheckoutVendaInput, CheckoutVendaResponse, VendaResumo } from '../types/venda.types';

export type { CheckoutVendaInput, CheckoutVendaResponse, VendaResumo };

// POST /api/vendas — checkout do PDV (ADMIN, SELLER)
export const checkoutVendaApi = (data: CheckoutVendaInput): Promise<CheckoutVendaResponse> =>
  apiFetch<CheckoutVendaResponse>('/vendas', {
    method: 'POST',
    body: JSON.stringify(data),
  });

// GET /api/vendas (ADMIN, SELLER)
export const getVendasApi = (): Promise<VendaResumo[]> =>
  apiFetch<VendaResumo[]>('/vendas');

// GET /api/vendas/:id (ADMIN, SELLER)
export const getVendaByIdApi = (id: number): Promise<CheckoutVendaResponse> =>
  apiFetch<CheckoutVendaResponse>(`/vendas/${id}`);
