export type MetodoPagamento = 'DINHEIRO' | 'PIX' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO';

export const METODOS_PAGAMENTO: Array<{ value: MetodoPagamento; label: string; avista: boolean }> = [
  { value: 'DINHEIRO', label: 'Dinheiro', avista: true },
  { value: 'PIX', label: 'Pix', avista: true },
  { value: 'CARTAO_CREDITO', label: 'Cartão de crédito', avista: false },
  { value: 'CARTAO_DEBITO', label: 'Cartão de débito', avista: false },
];

export const METODO_PAGAMENTO_LABEL: Record<MetodoPagamento, string> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'Pix',
  CARTAO_CREDITO: 'Cartão de crédito',
  CARTAO_DEBITO: 'Cartão de débito',
};

export interface CheckoutItemInput {
  produto_id: number;
  quantidade: number;
}

export interface CheckoutVendaInput {
  /** null = "cliente não identificado" (sem desconto fidelidade). */
  cliente_id: number | null;
  metodo_pagamento: MetodoPagamento;
  itens: CheckoutItemInput[];
}

export interface ItemVendaResponse {
  produto_id: number;
  produto_nome: string;
  quantidade: number;
  preco_unitario: number | string;
  subtotal: number | string;
}

export interface CheckoutVendaResponse {
  id: number;
  cliente_id: number | null;
  cliente_nome: string | null;
  vendedor_id: string;
  vendedor_nome: string;
  metodo_pagamento: MetodoPagamento;
  subtotal: number | string;
  desconto_total: number | string;
  desconto_cliente: number | string;
  desconto_pagamento: number | string;
  valor_final: number | string;
  itens: ItemVendaResponse[];
  created_at: string;
}

export interface VendaResumo {
  id: number;
  cliente_id: number | null;
  cliente_nome: string | null;
  vendedor_id: string;
  vendedor_nome: string;
  metodo_pagamento: MetodoPagamento;
  subtotal: number | string;
  desconto_total: number | string;
  valor_final: number | string;
  created_at: string;
  updated_at: string;
}
