export interface Cliente {
  id: number;
  nome: string;
  /** Somente dígitos (normalizado pelo backend). */
  cpf: string;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewCliente {
  nome: string;
  /** Aceita formatado (000.000.000-00); o backend normaliza. */
  cpf: string;
  email?: string;
}

export interface UpdateCliente {
  nome?: string;
  cpf?: string;
  email?: string;
}
