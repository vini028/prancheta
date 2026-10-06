import React, { useCallback, useEffect, useState } from 'react';
import { AppShell, Modal, useToast } from '../../shared/ui';
import { useAuth } from '../../auth/hooks/auth.hook';
import { ProdutoForm } from '../components/ProdutoForm';
import { ProdutoTable } from '../components/ProdutoTable';
import { getProdutosApi } from '../api/produtosApi';
import type { Produto } from '../types/produto.types';

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export const InventoryPage: React.FC = () => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [produtoToEdit, setProdutoToEdit] = useState<Produto | null>(null);
  const { showToast } = useToast();
  const { isAdmin } = useAuth();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getProdutosApi();
      setProdutos(data);
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Erro ao carregar inventário.'), 'error');
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
    <AppShell title="Estoque">
      {isAdmin && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <ProdutoForm onSuccess={loadData} />
        </div>
      )}
      <ProdutoTable
        produtos={produtos}
        loading={loading}
        canEdit={isAdmin}
        onEdit={setProdutoToEdit}
        onRefresh={loadData}
      />

      <Modal isOpen={!!produtoToEdit} onClose={() => setProdutoToEdit(null)} title="Editar produto">
        {produtoToEdit && (
          <ProdutoForm
            key={produtoToEdit.id}
            produto={produtoToEdit}
            onSuccess={() => {
              setProdutoToEdit(null);
              loadData();
            }}
          />
        )}
      </Modal>
    </AppShell>
  );
};
