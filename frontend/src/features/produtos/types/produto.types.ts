export interface Produto {
  id: number;
  nome: string;
  ean: string;
  preco_compra: number | string;
  /** Desde a AC03: campo convencional editável pelo ADMIN (PUT /api/produtos/:id). */
  preco_venda: number | string;
  quantidade_estoque: number;
  created_at: string;
  updated_at: string;
}

export interface NewProduto {
  nome: string;
  ean: string;
  preco_compra: string;
  /** Opcional: omitido => backend assume ROUND(preco_compra * 1.30, 2). */
  preco_venda?: string;
  quantidade_estoque: number;
}

export interface UpdateProduto {
  nome?: string;
  preco_compra?: string;
  /** Apenas ADMIN: preço de venda individualizado. */
  preco_venda?: string;
  quantidade_estoque?: number;
}
