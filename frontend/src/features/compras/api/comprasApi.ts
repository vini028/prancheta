import { apiFetch } from '../../shared/api/shared.api';

export interface PedidoItem {
  id: number;
  pedido_id: number;
  item: string;
  ean?: string | null;
  quantidade: number;
  valor_unitario: number | string;
  quantidade_recebida?: number | null;
  status_item: string;
  observacao_item?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Pedido {
  id: number;
  fornecedor_id: number;
  status: string;
  comprador_id: string;
  comprador_nome: string;
  status_envio?: string | null;
  observacao_problema?: string | null;
  created_at: string;
  updated_at: string;
  itens?: PedidoItem[]; // Opcional, para quando carregado com JOIN/include
}

export interface CreatePedidoItemInput {
  item: string;
  ean?: string | null;
  quantidade: number;
  valor_unitario: string;
}

export interface CreatePedidoInput {
  fornecedor_id: number;
  itens: CreatePedidoItemInput[];
}

export interface UpdatePedidoStatusInput {
  status: string;
}

export interface ConferenciaItemInput {
  item_id: number;
  quantidade_recebida: number;
  status_item: string;
  observacao_item?: string | null;
}

export interface ConferenciaPedidoInput {
  itens: ConferenciaItemInput[];
}

// GET /api/pedidos-compra
export const getPedidosApi = (): Promise<Pedido[]> =>
  apiFetch<Pedido[]>('/pedidos-compra');

// POST /api/pedidos-compra
export const createPedidoApi = (data: CreatePedidoInput): Promise<Pedido> =>
  apiFetch<Pedido>('/pedidos-compra', {
    method: 'POST',
    body: JSON.stringify(data),
  });

// PUT /api/pedidos-compra/:id
export const updatePedidoApi = (id: number, data: CreatePedidoInput): Promise<void> =>
  apiFetch<void>(`/pedidos-compra/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

// DELETE /api/pedidos-compra/:id
export const deletePedidoApi = (id: number): Promise<void> =>
  apiFetch<void>(`/pedidos-compra/${id}`, {
    method: 'DELETE',
  });

// PATCH /api/pedidos-compra/:id/status
export const updatePedidoStatusApi = (id: number, data: UpdatePedidoStatusInput): Promise<Pedido> =>
  apiFetch<Pedido>(`/pedidos-compra/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

// GET /api/pedidos-compra/:id/itens
export const getPedidoItensApi = (id: number): Promise<PedidoItem[]> =>
  apiFetch<PedidoItem[]>(`/pedidos-compra/${id}/itens`);

// PUT /api/pedidos-compra/:id/conferencia (BUYER dono ou ADMIN, só em RECEBIDO)
export const salvarConferenciaApi = (id: number, data: ConferenciaPedidoInput): Promise<PedidoItem[]> =>
  apiFetch<PedidoItem[]>(`/pedidos-compra/${id}/conferencia`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

// PATCH /api/pedidos-compra/:id/aprovar (ADMIN)
export const aprovarPedidoApi = (id: number): Promise<Pedido> =>
  apiFetch<Pedido>(`/pedidos-compra/${id}/aprovar`, {
    method: 'PATCH',
  });

// PATCH /api/pedidos-compra/:id/rejeitar (ADMIN)
export const rejeitarPedidoApi = (id: number): Promise<Pedido> =>
  apiFetch<Pedido>(`/pedidos-compra/${id}/rejeitar`, {
    method: 'PATCH',
  });

// PATCH /api/pedidos-compra/:id/cancelar (ADMIN)
export const cancelarPedidoApi = (id: number): Promise<Pedido> =>
  apiFetch<Pedido>(`/pedidos-compra/${id}/cancelar`, {
    method: 'PATCH',
  });

// PATCH /api/pedidos-compra/:id/status-envio (BUYER dono ou ADMIN)
export const atualizarStatusEnvioApi = (
  id: number,
  status_envio: string,
  observacao_problema?: string,
): Promise<Pedido> =>
  apiFetch<Pedido>(`/pedidos-compra/${id}/status-envio`, {
    method: 'PATCH',
    body: JSON.stringify({ status_envio, observacao_problema: observacao_problema ?? null }),
  });