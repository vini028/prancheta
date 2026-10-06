import React, { useCallback, useEffect, useState } from 'react';
import { AppShell, Modal, useToast } from '../../shared/ui';
import { ClienteForm } from '../components/ClienteForm';
import { ClienteTable } from '../components/ClienteTable';
import { getClientesApi } from '../api/clientesApi';
import type { Cliente } from '../types/cliente.types';

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export const ClientesPage: React.FC = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [clienteToEdit, setClienteToEdit] = useState<Cliente | null>(null);
  const { showToast } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getClientesApi();
      setClientes(data);
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Erro ao carregar clientes.'), 'error');
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
    <AppShell title="Clientes">
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <ClienteForm onSuccess={loadData} />
      </div>
      <ClienteTable
        clientes={clientes}
        loading={loading}
        onEdit={setClienteToEdit}
        onRefresh={loadData}
      />

      <Modal isOpen={!!clienteToEdit} onClose={() => setClienteToEdit(null)} title="Editar cliente">
        {clienteToEdit && (
          <ClienteForm
            key={clienteToEdit.id}
            cliente={clienteToEdit}
            onSuccess={() => {
              setClienteToEdit(null);
              loadData();
            }}
          />
        )}
      </Modal>
    </AppShell>
  );
};
