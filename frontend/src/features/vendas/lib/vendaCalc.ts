import type { MetodoPagamento } from '../types/venda.types';

/**
 * Aritmética do resumo financeiro do PDV em centavos inteiros.
 *
 * Espelha exatamente o cálculo do backend (`money.rs` + `venda_handler.rs`):
 * preços têm 2 casas, percentuais de 5% são arredondados "metade para cima"
 * por etapa (cliente sobre o subtotal; pagamento à vista sobre o restante).
 * Como os valores nunca são negativos, `Math.round` equivale ao
 * `MidpointAwayFromZero` do backend — o total exibido é idêntico ao
 * persistido, sem surpresas de ponto flutuante.
 */

export const toCents = (value: number | string): number =>
  Math.round(Number(value) * 100);

export const formatBRL = (cents: number): string =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export interface CartItem {
  produtoId: number;
  precoVenda: number | string;
  quantidade: number;
}

export interface ResumoVenda {
  subtotal: number;
  descontoCliente: number;
  descontoPagamento: number;
  descontoTotal: number;
  valorFinal: number;
  temDescontoCliente: boolean;
  temDescontoPagamento: boolean;
}

export const isAvista = (metodo: MetodoPagamento | ''): boolean =>
  metodo === 'DINHEIRO' || metodo === 'PIX';

export function calcularResumo(
  itens: CartItem[],
  clienteId: number | null,
  metodo: MetodoPagamento | '',
): ResumoVenda {
  const subtotal = itens.reduce((acc, item) => acc + toCents(item.precoVenda) * item.quantidade, 0);
  const temDescontoCliente = clienteId !== null && subtotal > 0;
  const descontoCliente = temDescontoCliente ? Math.round((subtotal * 5) / 100) : 0;
  const restante = subtotal - descontoCliente;
  const temDescontoPagamento = isAvista(metodo) && restante > 0;
  const descontoPagamento = temDescontoPagamento ? Math.round((restante * 5) / 100) : 0;
  const descontoTotal = descontoCliente + descontoPagamento;
  return {
    subtotal,
    descontoCliente,
    descontoPagamento,
    descontoTotal,
    valorFinal: subtotal - descontoTotal,
    temDescontoCliente,
    temDescontoPagamento,
  };
}
