import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/auth.hook';
import { AppShell, Card, StatCard } from '../../shared/ui';
import { getFornecedoresApi } from '../../fornecedores/api/fornecedoresApi';
import { getPedidosApi } from '../../compras/api/comprasApi';

const icon = (path: string) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d={path} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const HomePage: React.FC = () => {
  const { user, isAdmin, role } = useAuth();
  const firstName = user?.name?.split(' ')[0] ?? '';
  const canSeeCompras = role === 'ADMIN' || role === 'BUYER';

  const [fornecedoresCount, setFornecedoresCount] = useState<number | null>(null);
  const [pedidosCount, setPedidosCount] = useState<number | null>(null);

  useEffect(() => {
    if (!canSeeCompras) return;
    getFornecedoresApi().then((data) => setFornecedoresCount(data.length)).catch(() => setFornecedoresCount(null));
    getPedidosApi().then((data) => setPedidosCount(data.length)).catch(() => setPedidosCount(null));
  }, [canSeeCompras]);

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
              hint="Módulo do Comprador"
              icon={icon('M3 3h2l2.4 12.2a2 2 0 0 0 2 1.8h7.2a2 2 0 0 0 2-1.6L21 8H6')}
            />
          </>
        )}
        <StatCard label="Estoque crítico" value="—" hint="Chega na Fase 3 · 08/11" tone="warning" icon={icon('M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z')} />
        <StatCard label="Faturamento" value="—" hint="Chega na Fase 4 · 01/12" tone="positive" icon={icon('M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6')} />
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
    </AppShell>
  );
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
