import React, { useCallback, useEffect, useState } from 'react';
import { AppShell, useToast } from '../../shared/ui';
import { FornecedorForm } from '../components/FornecedorForm';
import { FornecedorTable } from '../components/FornecedorTable';
import { getFornecedoresApi } from '../api/fornecedoresApi';
import type { Fornecedor } from '../api/fornecedoresApi';

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export const SuppliersPage: React.FC = () => {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const loadFornecedores = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getFornecedoresApi();
      setFornecedores(data);
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Erro ao carregar fornecedores.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadFornecedores();
    });
  }, [loadFornecedores]);

  return (
    <AppShell title="Fornecedores">
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <FornecedorForm onSuccess={loadFornecedores} />
      </div>
      <FornecedorTable fornecedores={fornecedores} loading={loading} />
    </AppShell>
  );
};
