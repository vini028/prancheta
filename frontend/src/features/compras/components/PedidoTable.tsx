import React, { useMemo, useState, useEffect } from 'react';
import { DataTable, Button, useToast, Modal } from '../../shared/ui';
import type { Column } from '../../shared/ui';
import type { Pedido, PedidoItem } from '../api/comprasApi';
import type { Fornecedor } from '../../fornecedores/api/fornecedoresApi';
import { updatePedidoStatusApi, deletePedidoApi, getPedidoItensApi } from '../api/comprasApi';
import { PedidoForm } from './PedidoForm';

interface PedidoTableProps {
  pedidos: Pedido[];
  fornecedores: Fornecedor[];
  loading: boolean;
  onRefresh: () => void;
}

export const PedidoTable: React.FC<PedidoTableProps> = ({ pedidos, fornecedores, loading, onRefresh }) => {
  const { showToast } = useToast();
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [pedidoToEdit, setPedidoToEdit] = useState<Pedido | null>(null);
  const [itens, setItens] = useState<PedidoItem[]>([]);
  const [loadingItens, setLoadingItens] = useState(false);

  // Busca os itens do pedido ao abrir o popup
  useEffect(() => {
    if (!selectedPedido) {
      return;
    }

    let active = true;

    const carregarItens = async () => {
      setLoadingItens(true);
      try {
        const itensPedido = await getPedidoItensApi(selectedPedido.id);
        if (active) setItens(itensPedido);
      } catch {
        if (active) showToast('Erro ao carregar itens do pedido.', 'error');
      } finally {
        if (active) setLoadingItens(false);
      }
    };

    carregarItens();

    return () => {
      active = false;
    };
  }, [selectedPedido, showToast]);

  const fornecedorNome = useMemo(() => {
    const map = new Map(fornecedores.map((f) => [f.id, f.nome]));
    return (id: number) => map.get(id) ?? `#${id}`;
  }, [fornecedores]);

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await updatePedidoStatusApi(id, { status });
      showToast(`Pedido marcado como ${status}.`, 'success');
      onRefresh();
    } catch {
      showToast('Erro ao atualizar status.', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Deseja realmente excluir este pedido?')) return;
    try {
      await deletePedidoApi(id);
      showToast('Pedido excluído com sucesso.', 'success');
      onRefresh();
    } catch {
      showToast('Erro ao excluir pedido.', 'error');
    }
  };

  const columns: Column<Pedido>[] = [
    { key: 'fornecedor', header: 'Fornecedor', render: (p) => fornecedorNome(p.fornecedor_id) },
    { key: 'comprador', header: 'Comprador', render: (p) => p.comprador_nome },
    { 
      key: 'status', 
      header: 'Status', 
      render: (p) => (
        <select value={p.status} onChange={(e) => handleStatusChange(p.id, e.target.value)} style={{ padding: '4px', borderRadius: '4px' }}>
          <option value="PENDENTE">Pendente</option>
          <option value="APROVADO">Aprovado</option>
          <option value="CANCELADO">Cancelado</option>
        </select>
      )
    },
    { key: 'created_at', header: 'Data Criação', render: (p) => new Date(p.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) },
    { 
      key: 'actions', 
      header: 'Ações', 
      render: (p) => (
        <div style={{ display: 'flex', gap: '4px' }}>
          <Button size="sm" onClick={() => setSelectedPedido(p)}>Visualizar</Button>
          <Button size="sm" variant="secondary" onClick={() => setPedidoToEdit(p)}>Editar</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(p.id)}>Excluir</Button>
        </div>
      )
    }
  ];

  return (
    <>
      <DataTable
        columns={columns}
        rows={pedidos}
        getRowId={(p) => String(p.id)}
        loading={loading}
        emptyTitle="Nenhum pedido de compra"
      />

      {/* Popup de Informações do Pedido */}
      <Modal isOpen={!!selectedPedido} onClose={() => setSelectedPedido(null)} title={`Detalhes do Pedido #${selectedPedido?.id}`}>
        {selectedPedido && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div>
              <p><strong>Fornecedor:</strong> {fornecedorNome(selectedPedido.fornecedor_id)}</p>
              <p><strong>Comprador:</strong> {selectedPedido.comprador_nome}</p>
              <p><strong>Status:</strong> {selectedPedido.status}</p>
              <p><strong>Data de Criação:</strong> {new Date(selectedPedido.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
            </div>

            <h3 style={{ margin: 0 }}>Itens do Pedido</h3>

            {loadingItens ? (
              <p>Carregando itens...</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '8px' }}>Item</th>
                    <th style={{ padding: '8px' }}>EAN</th>
                    <th style={{ padding: '8px' }}>Qtd</th>
                    <th style={{ padding: '8px' }}>Valor Unit.</th>
                    <th style={{ padding: '8px' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px' }}>{item.item}</td>
                      <td style={{ padding: '8px' }}>{item.ean || '-'}</td>
                      <td style={{ padding: '8px' }}>{item.quantidade}</td>
                      <td style={{ padding: '8px' }}>R$ {Number(item.valor_unitario).toFixed(2)}</td>
                      <td style={{ padding: '8px' }}>R$ {(Number(item.valor_unitario) * item.quantidade).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </Modal>

      <Modal isOpen={!!pedidoToEdit} onClose={() => setPedidoToEdit(null)} title="Editar pedido">
        {pedidoToEdit && <PedidoForm pedido={pedidoToEdit} onSuccess={() => { setPedidoToEdit(null); onRefresh(); }} />}
      </Modal>
    </>
  );
};