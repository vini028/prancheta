export interface Produto {
  id: number;
  nome: string;
  ean: string;
  preco_compra: number | string;
  /** Calculado pelo banco (preco_compra * 1.30): somente leitura. */
  preco_venda: number | string;
  quantidade_estoque: number;
  created_at: string;
  updated_at: string;
}

export interface NewProduto {
  nome: string;
  ean: string;
  preco_compra: string;
  quantidade_estoque: number;
}

export interface UpdateProduto {
  nome?: string;
  preco_compra?: string;
  quantidade_estoque?: number;
}
