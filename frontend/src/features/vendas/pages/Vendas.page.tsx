import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell, Badge, Button, DataTable, Modal, useToast } from '../../shared/ui';
import type { Column } from '../../shared/ui';
import { useAuth } from '../../auth/hooks/auth.hook';
import { getVendaByIdApi, getVendasApi } from '../api/vendasApi';
import type { CheckoutVendaResponse, MetodoPagamento, VendaResumo } from '../types/venda.types';
import { METODO_PAGAMENTO_LABEL } from '../types/venda.types';
import { formatBRL, toCents } from '../lib/vendaCalc';
import { VendaDetalheModal } from '../components/VendaDetalheModal';

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

type FiltroPagamento = '' | MetodoPagamento;

const FILTROS: Array<{ value: FiltroPagamento; label: string }> = [
  { value: '', label: 'Todas' },
  { value: 'DINHEIRO', label: 'Dinheiro' },
  { value: 'PIX', label: 'Pix' },
  { value: 'CARTAO_CREDITO', label: 'Crédito' },
  { value: 'CARTAO_DEBITO', label: 'Débito' },
];

const eyeButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  gap: '6px',
  alignItems: 'center',
};

export const VendasPage: React.FC = () => {
  const [vendas, setVendas] = useState<VendaResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroPagamento, setFiltroPagamento] = useState<FiltroPagamento>('');
  const [selectedVenda, setSelectedVenda] = useState<CheckoutVendaResponse | null>(null);
  const [detalheLoading, setDetalheLoading] = useState(false);
  const { showToast } = useToast();
  const { isAdmin } = useAuth();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getVendasApi();
      setVendas(data);
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Erro ao carregar vendas.'), 'error');
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

  const openDetalhe = async (id: number) => {
    setSelectedVenda(null);
    setDetalheLoading(true);
    try {
      const data = await getVendaByIdApi(id);
      setSelectedVenda(data);
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Erro ao carregar detalhes da venda.'), 'error');
    } finally {
      setDetalheLoading(false);
    }
  };

  const closeDetalhe = () => setSelectedVenda(null);

  const vendasFiltradas = useMemo(
    () => (filtroPagamento === '' ? vendas : vendas.filter((v) => v.metodo_pagamento === filtroPagamento)),
    [vendas, filtroPagamento],
  );

  const totalPeriodo = useMemo(
    () => vendasFiltradas.reduce((acc, v) => acc + toCents(v.valor_final), 0),
    [vendasFiltradas],
  );

  const columns: Column<VendaResumo>[] = [
    { key: 'id', header: 'Código', render: (v) => `#${v.id}`, numeric: true },
    { key: 'created_at', header: 'Data/Hora', render: (v) => formatDateTime(v.created_at) },
    ...(isAdmin
      ? [{ key: 'vendedor', header: 'Vendedor', render: (v: VendaResumo) => v.vendedor_nome } as Column<VendaResumo>]
      : []),
    {
      key: 'cliente',
      header: 'Cliente',
      render: (v) => v.cliente_nome ?? <Badge tone="neutral">Não identificado</Badge>,
    },
    {
      key: 'pagamento',
      header: 'Pagamento',
      render: (v) => METODO_PAGAMENTO_LABEL[v.metodo_pagamento],
    },
    {
      key: 'desconto',
      header: 'Desconto',
      render: (v) => (toCents(v.desconto_total) > 0 ? `−${formatBRL(toCents(v.desconto_total))}` : '—'),
      numeric: true,
    },
    {
      key: 'total',
      header: 'Valor Total',
      render: (v) => <strong>{formatBRL(toCents(v.valor_final))}</strong>,
      numeric: true,
    },
  ];

  return (
    <AppShell title="Histórico de Vendas">
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: 'var(--space-4)', alignItems: 'center' }}>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Pagamento:</span>
        {FILTROS.map((f) => (
          <Button
            key={f.label}
            size="sm"
            variant={filtroPagamento === f.value ? 'primary' : 'secondary'}
            onClick={() => setFiltroPagamento(f.value)}
          >
            {f.label}
          </Button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
          Total no período: {formatBRL(totalPeriodo)}
        </span>
      </div>

      <DataTable
        columns={columns}
        rows={vendasFiltradas}
        getRowId={(v) => String(v.id)}
        searchKeys={['id', 'cliente_nome', 'vendedor_nome', 'metodo_pagamento']}
        searchPlaceholder="Buscar por código, cliente, vendedor ou pagamento..."
        loading={loading}
        emptyTitle="Nenhuma venda registrada"
        emptyHint={isAdmin ? 'As vendas do PDV aparecem aqui.' : 'Suas vendas do PDV aparecem aqui.'}
        rowActions={(v) => (
          <Button variant="secondary" size="sm" onClick={() => openDetalhe(v.id)} title={`Ver detalhes da venda #${v.id}`}>
            <span style={eyeButtonStyle}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Ver detalhes
            </span>
          </Button>
        )}
      />

      <Modal
        isOpen={selectedVenda !== null || detalheLoading}
        onClose={closeDetalhe}
        title={selectedVenda ? `Venda #${selectedVenda.id}` : 'Detalhes da venda'}
      >
        {detalheLoading && <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Carregando detalhes...</span>}
        {!detalheLoading && selectedVenda && (
          <VendaDetalheModal venda={selectedVenda} onClose={closeDetalhe} />
        )}
      </Modal>
    </AppShell>
  );
};
