/**
 * Calculadora de margem de venda (AC03).
 *
 * Sincronia bidirecional entre "Margem de Lucro (%)" e "Preço de Venda (R$)":
 * - margem -> venda:  venda = compra * (1 + margem / 100)
 * - venda  -> margem: margem = ((venda - compra) / compra) * 100
 *
 * O preço de venda é calculado em centavos inteiros para que o valor exibido
 * e enviado no payload seja idêntico ao `ROUND(x, 2)` do Postgres/backend,
 * sem surpresas de ponto flutuante (ex.: 10.50 com 30% = 13.65 exatos).
 */

const toCents = (value: string): number | null => {
  if (value.trim() === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
};

/** Margem (%) -> preço de venda em reais com 2 casas. Retorna '' se inválido. */
export function calcularPrecoVenda(precoCompra: string, margemPct: string): string {
  if (margemPct.trim() === '') return '';
  const compraCents = toCents(precoCompra);
  const margem = Number(margemPct);
  if (compraCents === null || compraCents <= 0 || !Number.isFinite(margem)) return '';
  const vendaCents = Math.round((compraCents * (100 + margem)) / 100);
  if (vendaCents <= 0) return '';
  return (vendaCents / 100).toFixed(2);
}

/** Preço de venda (R$) -> margem (%) com até 2 casas, sem zeros à direita. Retorna '' se inválido. */
export function calcularMargem(precoCompra: string, precoVenda: string): string {
  const compraCents = toCents(precoCompra);
  const vendaCents = toCents(precoVenda);
  if (compraCents === null || compraCents <= 0 || vendaCents === null || vendaCents <= 0) return '';
  const margem = ((vendaCents - compraCents) / compraCents) * 100;
  const arredondada = Math.round(margem * 100) / 100;
  return String(arredondada);
}

/** Margem inicial para o modo edição (derivada dos valores persistidos). */
export function margemInicial(precoCompra: number | string, precoVenda: number | string): string {
  return calcularMargem(String(precoCompra), String(precoVenda));
}
