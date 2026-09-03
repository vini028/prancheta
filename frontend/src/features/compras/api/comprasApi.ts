import { apiFetch } from '../../shared/api/shared.api';

export interface Pedido {
  id: number;
  fornecedor_id: number;
  item: string;
  quantidade: number;
  valor_total: number | string;
  comprador_id: string;
  created_at: string;
}

export interface NewPedido {
  fornecedor_id: number;
  item: string;
  quantidade: number;
  valor_total: number;
}

// GET /api/pedidos-compra — Comprador ou Admin (auth via apiFetch)
export const getPedidosApi = (): Promise<Pedido[]> =>
  apiFetch<Pedido[]>('/pedidos-compra');

// POST /api/pedidos-compra — Comprador ou Admin (auth via apiFetch)
// comprador_id é preenchido pelo back-end a partir do token, não é enviado aqui.
export const createPedidoApi = (data: NewPedido): Promise<Pedido> =>
  apiFetch<Pedido>('/pedidos-compra', {
    method: 'POST',
    body: JSON.stringify(data),
  });
