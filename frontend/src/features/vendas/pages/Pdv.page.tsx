import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell, Badge, Button, Card, Input, useToast } from '../../shared/ui';
import { getProdutosApi } from '../../produtos/api/produtosApi';
import type { Produto } from '../../produtos/types/produto.types';
import { getClientesApi } from '../../clientes/api/clientesApi';
import type { Cliente } from '../../clientes/types/cliente.types';
import { formatCpf } from '../../clientes/lib/clienteFormat';
import { checkoutVendaApi } from '../api/vendasApi';
import type {
  CheckoutVendaResponse,
  MetodoPagamento,
} from '../types/venda.types';
import { METODOS_PAGAMENTO } from '../types/venda.types';
import { calcularResumo, formatBRL, toCents } from '../lib/vendaCalc';

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

interface CartLine {
  produto: Produto;
  quantidade: number;
}

export const PdvPage: React.FC = () => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [metodo, setMetodo] = useState<MetodoPagamento | ''>('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [venda, setVenda] = useState<CheckoutVendaResponse | null>(null);
  const { showToast } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [prods, clis] = await Promise.all([getProdutosApi(), getClientesApi()]);
      setProdutos(prods);
      setClientes(clis);
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Erro ao carregar dados do PDV.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadData]);

  const termo = busca.trim().toLowerCase();
  const produtosFiltrados = useMemo(() => {
    if (!termo) return produtos;
    return produtos.filter(
      (p) => p.nome.toLowerCase().includes(termo) || p.ean.toLowerCase().includes(termo),
    );
  }, [produtos, termo]);

  const resumo = useMemo(
    () =>
      calcularResumo(
        cart.map((l) => ({ produtoId: l.produto.id, precoVenda: l.produto.preco_venda, quantidade: l.quantidade })),
        clienteId,
        metodo,
      ),
    [cart, clienteId, metodo],
  );

  const addToCart = (produto: Produto) => {
    if (produto.quantidade_estoque <= 0) {
      showToast(`"${produto.nome}" está sem estoque.`, 'error');
      return;
    }
    setVenda(null);
    setCart((prev) => {
      const line = prev.find((l) => l.produto.id === produto.id);
      const emCarrinho = line?.quantidade ?? 0;
      if (emCarrinho + 1 > produto.quantidade_estoque) {
        showToast(`Estoque insuficiente para "${produto.nome}" (disponível: ${produto.quantidade_estoque}).`, 'error');
        return prev;
      }
      if (line) {
        return prev.map((l) => (l.produto.id === produto.id ? { ...l, quantidade: l.quantidade + 1 } : l));
      }
      return [...prev, { produto, quantidade: 1 }];
    });
  };

  const setQuantidade = (produtoId: number, quantidade: number) => {
    setVenda(null);
    setCart((prev) => {
      if (quantidade <= 0) return prev.filter((l) => l.produto.id !== produtoId);
      return prev.map((l) => {
        if (l.produto.id !== produtoId) return l;
        if (quantidade > l.produto.quantidade_estoque) {
          showToast(`Estoque insuficiente para "${l.produto.nome}" (disponível: ${l.produto.quantidade_estoque}).`, 'error');
          return l;
        }
        return { ...l, quantidade };
      });
    });
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      showToast('Adicione ao menos um produto ao carrinho.', 'error');
      return;
    }
    if (!metodo) {
      showToast('Selecione a forma de pagamento.', 'error');
      return;
    }
    setCheckoutLoading(true);
    try {
      const resp = await checkoutVendaApi({
        cliente_id: clienteId,
        metodo_pagamento: metodo,
        itens: cart.map((l) => ({ produto_id: l.produto.id, quantidade: l.quantidade })),
      });
      setVenda(resp);
      setCart([]);
      showToast(`Venda #${resp.id} registrada com sucesso.`, 'success');
      void loadData();
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Erro ao finalizar venda.'), 'error');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const novaVenda = () => {
    setVenda(null);
    setCart([]);
    setMetodo('');
  };

  const clienteSelecionado = clientes.find((c) => c.id === clienteId) ?? null;

  return (
    <AppShell title="Ponto de Venda (PDV)">
      {venda && (
        <Card title={`Venda #${venda.id} concluída`}>
          <div style={{ display: 'grid', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            {venda.itens.map((item) => (
              <div key={item.produto_id} style={rowStyle}>
                <span>{item.quantidade}× {item.produto_nome}</span>
                <span>{formatBRL(toCents(item.subtotal))}</span>
              </div>
            ))}
            <div style={rowStyle}>
              <span>Subtotal</span>
              <span>{formatBRL(toCents(venda.subtotal))}</span>
            </div>
            <div style={rowStyle}>
              <span>Desconto total</span>
              <span>−{formatBRL(toCents(venda.desconto_total))}</span>
            </div>
            <div style={{ ...rowStyle, fontWeight: 700, fontSize: 'var(--text-lg)' }}>
              <span>Valor final ({venda.metodo_pagamento})</span>
              <span>{formatBRL(toCents(venda.valor_final))}</span>
            </div>
          </div>
          <Button variant="secondary" onClick={novaVenda}>Nova venda</Button>
        </Card>
      )}

      <div style={gridStyle}>
        <Card title="Produtos">
          <Input
            label="Buscar por nome ou EAN"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            fullWidth
            placeholder="Ex.: caneta ou 789..."
          />
          <div style={{ display: 'grid', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
            {loading && <span style={mutedStyle}>Carregando produtos...</span>}
            {!loading && produtosFiltrados.length === 0 && (
              <span style={mutedStyle}>Nenhum produto encontrado.</span>
            )}
            {produtosFiltrados.map((p) => {
              const semEstoque = p.quantidade_estoque <= 0;
              return (
                <div key={p.id} style={productRowStyle}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{p.nome}</div>
                    <div style={mutedStyle}>
                      EAN {p.ean} · {formatBRL(toCents(p.preco_venda))} · estoque: {p.quantidade_estoque}
                    </div>
                  </div>
                  <Button size="sm" disabled={semEstoque} onClick={() => addToCart(p)}>
                    {semEstoque ? 'Sem estoque' : 'Adicionar'}
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>

        <div style={{ display: 'grid', gap: 'var(--space-4)', alignContent: 'start' }}>
          <Card title="Carrinho">
            {cart.length === 0 && <span style={mutedStyle}>Carrinho vazio.</span>}
            {cart.map((l) => (
              <div key={l.produto.id} style={productRowStyle}>
                <div>
                  <div style={{ fontWeight: 600 }}>{l.produto.nome}</div>
                  <div style={mutedStyle}>{formatBRL(toCents(l.produto.preco_venda))} / un.</div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Button size="sm" variant="secondary" onClick={() => setQuantidade(l.produto.id, l.quantidade - 1)}>−</Button>
                  <span style={{ minWidth: '24px', textAlign: 'center' }}>{l.quantidade}</span>
                  <Button size="sm" variant="secondary" onClick={() => setQuantidade(l.produto.id, l.quantidade + 1)}>+</Button>
                </div>
              </div>
            ))}
          </Card>

          <Card title="Cliente e pagamento">
            <label style={labelStyle} htmlFor="pdv-cliente">Cliente (opcional)</label>
            <select
              id="pdv-cliente"
              value={clienteId === null ? '' : String(clienteId)}
              onChange={(e) => {
                setVenda(null);
                setClienteId(e.target.value === '' ? null : Number(e.target.value));
              }}
              style={selectStyle}
            >
              <option value="">Cliente não identificado (sem desconto)</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} · {formatCpf(c.cpf)}
                </option>
              ))}
            </select>

            <span style={{ ...labelStyle, marginTop: 'var(--space-3)', display: 'block' }}>Forma de pagamento</span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {METODOS_PAGAMENTO.map((m) => (
                <Button
                  key={m.value}
                  size="sm"
                  variant={metodo === m.value ? 'primary' : 'secondary'}
                  onClick={() => {
                    setVenda(null);
                    setMetodo(m.value);
                  }}
                >
                  {m.label}{m.avista ? ' −5%' : ''}
                </Button>
              ))}
            </div>
          </Card>

          <Card title="Resumo financeiro">
            <div style={{ display: 'grid', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              <div style={rowStyle}>
                <span>Subtotal</span>
                <span>{formatBRL(resumo.subtotal)}</span>
              </div>
              <div style={rowStyle}>
                <span style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                  Desconto cliente (5%)
                  {resumo.temDescontoCliente
                    ? <Badge tone="positive">fidelidade</Badge>
                    : <Badge tone="neutral">sem cliente</Badge>}
                </span>
                <span>−{formatBRL(resumo.descontoCliente)}</span>
              </div>
              <div style={rowStyle}>
                <span style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                  Desconto pagamento (5%)
                  {resumo.temDescontoPagamento
                    ? <Badge tone="positive">à vista</Badge>
                    : <Badge tone="neutral">não aplicado</Badge>}
                </span>
                <span>−{formatBRL(resumo.descontoPagamento)}</span>
              </div>
              <div style={{ ...rowStyle, fontWeight: 700, fontSize: 'var(--text-lg)' }}>
                <span>Valor final</span>
                <span>{formatBRL(resumo.valorFinal)}</span>
              </div>
            </div>
            {clienteSelecionado && (
              <p style={{ ...mutedStyle, marginBottom: 'var(--space-3)' }}>
                Cliente: {clienteSelecionado.nome} ({formatCpf(clienteSelecionado.cpf)})
              </p>
            )}
            <Button
              onClick={handleCheckout}
              isLoading={checkoutLoading}
              loadingText="Registrando..."
              disabled={cart.length === 0}
              fullWidth
            >
              Finalizar venda
            </Button>
          </Card>
        </div>
      </div>
    </AppShell>
  );
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gap: 'var(--space-4)',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  alignItems: 'start',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 'var(--space-3)',
};

const productRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 'var(--space-3)',
  padding: 'var(--space-2) 0',
  borderBottom: '1px solid var(--border)',
};

const mutedStyle: React.CSSProperties = {
  fontSize: 'var(--text-xs)',
  color: 'var(--text-muted)',
};

const labelStyle: React.CSSProperties = {
  fontSize: 'var(--text-sm)',
  fontWeight: 500,
  marginBottom: 'var(--space-1)',
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--text-primary)',
  fontSize: 'var(--text-sm)',
};
