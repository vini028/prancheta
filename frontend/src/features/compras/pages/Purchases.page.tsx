import React, { useCallback, useEffect, useState } from 'react';
import { AppShell, useToast } from '../../shared/ui';
import { PedidoForm } from '../components/PedidoForm';
import { PedidoTable } from '../components/PedidoTable';
import { getPedidosApi } from '../api/comprasApi';
import type { Pedido } from '../api/comprasApi';
import { getFornecedoresApi } from '../../fornecedores/api/fornecedoresApi';
import type { Fornecedor } from '../../fornecedores/api/fornecedoresApi';

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export const PurchasesPage: React.FC = () => {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [pedidosData, fornecedoresData] = await Promise.all([getPedidosApi(), getFornecedoresApi()]);
      setPedidos(pedidosData);
      setFornecedores(fornecedoresData);
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Erro ao carregar pedidos de compra.'), 'error');
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

  return (
    <AppShell title="Pedidos de Compra">
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <PedidoForm onSuccess={loadData} />
      </div>
      <PedidoTable pedidos={pedidos} fornecedores={fornecedores} loading={loading} />
    </AppShell>
  );
};
