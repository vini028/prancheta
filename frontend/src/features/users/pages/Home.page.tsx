import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/auth.hook';
import { AppShell, Card, StatCard, Modal, DataTable, Badge } from '../../shared/ui';
import type { Column } from '../../shared/ui';
import { apiFetch } from '../../shared/api/shared.api';
import { getFornecedoresApi } from '../../fornecedores/api/fornecedoresApi';
import { getPedidosApi } from '../../compras/api/comprasApi';
import { getProdutosApi } from '../../produtos/api/produtosApi';
import type { Produto } from '../../produtos/types/produto.types';
import { getVendasApi } from '../../vendas/api/vendasApi';
import type { VendaResumo } from '../../vendas/types/venda.types';

const icon = (path: string) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d={path} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const formatCurrency = (value: number | string) =>
  Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface AdminDashboardData {
  produtos_baixo_estoque: number;
  total_vendas_mensal: number;
  total_compras_mensal: number;
  faturamento_liquido: number;
}

interface SellerDashboardData {
  total_vendas_count: number;
  total_vendas_valor: number;
  comissao_valor: number;
}

interface BuyerDashboardData {
  produtos_baixo_estoque: number;
  total_compras_mensal: number;
}

export const HomePage: React.FC = () => {
  const { user, isAdmin, role } = useAuth();
  const firstName = user?.name?.split(' ')[0] ?? '';
  const canSeeCompras = role === 'ADMIN' || role === 'BUYER';
  const isSeller = role === 'SELLER';
  const isBuyer = role === 'BUYER';

  const [fornecedoresCount, setFornecedoresCount] = useState<number | null>(null);
  const [pedidosCount, setPedidosCount] = useState<number | null>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [vendas, setVendas] = useState<VendaResumo[]>([]);

  // Dados dos endpoints de dashboard
  const [adminMetrics, setAdminMetrics] = useState<AdminDashboardData | null>(null);
  const [sellerMetrics, setSellerMetrics] = useState<SellerDashboardData | null>(null);
  const [buyerMetrics, setBuyerMetrics] = useState<BuyerDashboardData | null>(null);

  const [activeModal, setActiveModal] = useState<'estoque-critico' | 'faturamento' | 'vendas-vendedor' | null>(null);

  useEffect(() => {
    if (canSeeCompras) {
      getFornecedoresApi().then((data) => setFornecedoresCount(data.length)).catch(() => setFornecedoresCount(null));
      getPedidosApi().then((data) => setPedidosCount(data.length)).catch(() => setPedidosCount(null));
    }
    getProdutosApi().then((data) => setProdutos(data)).catch(() => setProdutos([]));
    getVendasApi().then((data) => setVendas(data)).catch(() => setVendas([]));

    // Consumir endpoints específicos de dashboard do backend
    if (role === 'ADMIN') {
      apiFetch<AdminDashboardData>('/dashboard/admin')
        .then((data) => setAdminMetrics(data))
        .catch(() => setAdminMetrics(null));
    } else if (role === 'SELLER') {
      apiFetch<SellerDashboardData>('/dashboard/seller')
        .then((data) => setSellerMetrics(data))
        .catch(() => setSellerMetrics(null));
    } else if (role === 'BUYER') {
      apiFetch<BuyerDashboardData>('/dashboard/buyer')
        .then((data) => setBuyerMetrics(data))
        .catch(() => setBuyerMetrics(null));
    }
  }, [canSeeCompras, role]);

  const produtosCriticos = produtos.filter((p) => p.quantidade_estoque <= 5);
  const vendasVendedor = vendas.filter((v) => v.vendedor_id === user?.id || v.vendedor_nome === user?.name);

  return (
    <AppShell title="Painel">
      <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
        Bem-vindo(a) de volta, {firstName}.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-6)',
        }}
      >
        {canSeeCompras && (
          <>
            <StatCard
              label="Fornecedores"
              value={fornecedoresCount === null ? '—' : String(fornecedoresCount)}
              hint="Módulo do Comprador"
              icon={icon('M3 9l9-5 9 5v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9Z')}
            />
            <StatCard
              label="Pedidos de compra"
              value={pedidosCount === null ? '—' : String(pedidosCount)}
              hint={isBuyer && buyerMetrics ? `Mensal: ${formatCurrency(buyerMetrics.total_compras_mensal)}` : 'Módulo do Comprador'}
              icon={icon('M3 3h2l2.4 12.2a2 2 0 0 0 2 1.8h7.2a2 2 0 0 0 2-1.6L21 8H6')}
            />
          </>
        )}

        {isSeller ? (
          <>
            <div onClick={() => setActiveModal('vendas-vendedor')} style={{ cursor: 'pointer', transition: 'transform 0.1s' }} title="Clique para ver detalhes das vendas">
              <StatCard
                label="Total vendido (Mês)"
                value={sellerMetrics ? formatCurrency(sellerMetrics.total_vendas_valor) : '—'}
                hint={`${sellerMetrics?.total_vendas_count ?? 0} venda(s) realizada(s)`}
                tone="positive"
                icon={icon('M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6')}
              />
            </div>
            <StatCard
              label="Comissão (5%)"
              value={sellerMetrics ? formatCurrency(sellerMetrics.comissao_valor) : '—'}
              hint="Sua comissão acumulada"
              tone="positive"
              icon={icon('M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6')}
            />
          </>
        ) : (
          <div onClick={() => setActiveModal('estoque-critico')} style={{ cursor: 'pointer', transition: 'transform 0.1s' }} title="Clique para ver itens críticos">
            <StatCard
              label="Estoque crítico"
              value={
                <span style={{ color: (adminMetrics?.produtos_baixo_estoque ?? produtosCriticos.length) > 0 ? 'var(--danger)' : 'inherit' }}>
                  {isAdmin && adminMetrics ? adminMetrics.produtos_baixo_estoque : isBuyer && buyerMetrics ? buyerMetrics.produtos_baixo_estoque : produtosCriticos.length}
                </span>
              }
              hint="Produtos com ≤ 5 unidades"
              tone={(adminMetrics?.produtos_baixo_estoque ?? produtosCriticos.length) > 0 ? 'warning' : 'positive'}
              icon={icon('M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z')}
            />
          </div>
        )}

        <div onClick={() => setActiveModal('faturamento')} style={{ cursor: 'pointer', transition: 'transform 0.1s' }} title="Clique para ver valores brutos">
          <StatCard
            label={isAdmin ? "Faturamento líquido (Mês)" : "Faturamento"}
            value={isAdmin && adminMetrics ? formatCurrency(adminMetrics.faturamento_liquido) : '—'}
            hint="Vendas — Compras — Comissão"
            tone="positive"
            icon={icon('M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6')}
          />
        </div>
      </div>

      <Card title="Sua conta" subtitle={`Perfil atual: ${user?.role}`}>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <Link to="/change-password" style={linkBtn}>
            Alterar senha
          </Link>
          {isAdmin && (
            <Link to="/users" style={linkBtnPrimary}>
              Gerenciar usuários
            </Link>
          )}
        </div>
      </Card>

      {/* Modais de Detalhes */}
      <Modal isOpen={activeModal === 'estoque-critico'} onClose={() => setActiveModal(null)} title="Produtos em Estoque Crítico (≤ 5 unidades)">
        <DataTable
          columns={colsCriticos}
          rows={produtosCriticos}
          getRowId={(p) => String(p.id)}
          searchKeys={['nome', 'ean']}
          searchPlaceholder="Filtrar produtos críticos..."
          emptyTitle="Nenhum produto em estoque crítico"
          emptyHint="Todos os produtos possuem estoque acima de 5 unidades."
        />
      </Modal>

      <Modal isOpen={activeModal === 'faturamento'} onClose={() => setActiveModal(null)} title="Detalhamento Mensal do Faturamento">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', padding: 'var(--space-2)' }}>
          <div style={breakdownRow}>
            <span>Vendas Totais do Mês:</span>
            <strong className="data" style={{ color: 'var(--positive)' }}>{formatCurrency(adminMetrics?.total_vendas_mensal ?? 0)}</strong>
          </div>
          <div style={breakdownRow}>
            <span>Compras Totais do Mês:</span>
            <strong className="data" style={{ color: 'var(--danger)' }}>{formatCurrency(adminMetrics?.total_compras_mensal ?? 0)}</strong>
          </div>
          <div style={breakdownRow}>
            <span>Comissão de Vendas (5%):</span>
            <strong className="data" style={{ color: 'var(--warning)' }}>{formatCurrency((adminMetrics?.total_vendas_mensal ?? 0) * 0.05)}</strong>
          </div>
          <hr style={{ border: '0', borderTop: '1px solid var(--border)', margin: 'var(--space-2) 0' }} />
          <div style={{ ...breakdownRow, fontSize: 'var(--text-lg)' }}>
            <span>Faturamento Líquido:</span>
            <strong className="data">{formatCurrency(adminMetrics?.faturamento_liquido ?? 0)}</strong>
          </div>
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'vendas-vendedor'} onClose={() => setActiveModal(null)} title="Suas Vendas Realizadas">
        <DataTable
          columns={colsVendasVendedor}
          rows={vendasVendedor}
          getRowId={(v) => String(v.id)}
          searchKeys={['cliente_nome', 'metodo_pagamento']}
          searchPlaceholder="Filtrar suas vendas..."
          emptyTitle="Nenhuma venda realizada por você"
          emptyHint="Suas vendas no PDV aparecerão aqui."
        />
      </Modal>
    </AppShell>
  );
};

const colsCriticos: Column<Produto>[] = [
  { key: 'nome', header: 'Nome', render: (p) => p.nome },
  { key: 'ean', header: 'EAN', render: (p) => p.ean, numeric: true },
  {
    key: 'quantidade_estoque',
    header: 'Estoque',
    render: (p) => (
      <span style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
        <strong style={{ color: 'var(--danger)' }}>{p.quantidade_estoque}</strong>
        <Badge tone="danger">Estoque Baixo</Badge>
      </span>
    ),
    numeric: true,
  },
  { key: 'preco_compra', header: 'Preço Compra', render: (p) => formatCurrency(p.preco_compra), numeric: true },
];

const colsVendasVendedor: Column<VendaResumo>[] = [
  { key: 'id', header: 'ID', render: (v) => `#${v.id}`, numeric: true },
  { key: 'created_at', header: 'Data/Hora', render: (v) => new Date(v.created_at).toLocaleString('pt-BR') },
  { key: 'cliente_nome', header: 'Cliente', render: (v) => v.cliente_nome ?? 'Consumidor Final' },
  { key: 'metodo_pagamento', header: 'Pagamento', render: (v) => v.metodo_pagamento },
  { key: 'valor_final', header: 'Valor Final', render: (v) => formatCurrency(v.valor_final), numeric: true },
];

const breakdownRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: 'var(--text-base)',
  color: 'var(--text-primary)',
};

const linkBtn: React.CSSProperties = {
  padding: '10px 16px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--text-primary)',
  textDecoration: 'none',
  fontSize: 'var(--text-sm)',
  fontWeight: 500,
};

const linkBtnPrimary: React.CSSProperties = {
  ...linkBtn,
  border: 'none',
  background: 'var(--brand)',
  color: '#fff',
};
