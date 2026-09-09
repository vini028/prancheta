import React, { useMemo, useState, useEffect } from 'react';
import { DataTable, Button, Badge, useToast, Modal } from '../../shared/ui';
import type { Column } from '../../shared/ui';
import type { Pedido, PedidoItem } from '../api/comprasApi';
import type { Fornecedor } from '../../fornecedores/api/fornecedoresApi';
import { updatePedidoStatusApi, deletePedidoApi, getPedidoItensApi } from '../api/comprasApi';
import { PedidoForm } from './PedidoForm';
import styles from './PedidoTable.module.css';

interface PedidoTableProps {
  pedidos: Pedido[];
  fornecedores: Fornecedor[];
  loading: boolean;
  onRefresh: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  PENDENTE: 'Pendente',
  APROVADO: 'Aprovado',
  CANCELADO: 'Cancelado',
};

const STATUS_TONE: Record<string, 'warning' | 'positive' | 'danger' | 'neutral'> = {
  PENDENTE: 'warning',
  APROVADO: 'positive',
  CANCELADO: 'danger',
};

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const EyeIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const TrashIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const PedidoTable: React.FC<PedidoTableProps> = ({ pedidos, fornecedores, loading, onRefresh }) => {
  const { showToast } = useToast();
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [pedidoToEdit, setPedidoToEdit] = useState<Pedido | null>(null);
  const [itens, setItens] = useState<PedidoItem[]>([]);
  const [loadingItens, setLoadingItens] = useState(false);

  // Mapeia e enriquece os pedidos com o nome do fornecedor para permitir busca textual por nome
  const pedidosComFornecedor = useMemo(() => {
    const map = new Map(fornecedores.map((f) => [f.id, f.nome]));
    return pedidos.map((p) => ({
      ...p,
      fornecedor_nome: map.get(p.fornecedor_id) ?? `#${p.fornecedor_id}`,
    }));
  }, [pedidos, fornecedores]);

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

  const totalPedido = useMemo(
    () => itens.reduce((sum, item) => sum + Number(item.valor_unitario) * item.quantidade, 0),
    [itens]
  );

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

  const columns: Column<typeof pedidosComFornecedor[number]>[] = [
    { key: 'id', header: 'Pedido', render: (p) => p.id },
    { key: 'fornecedor_nome', header: 'Fornecedor', render: (p) => p.fornecedor_nome },
    { key: 'comprador_nome', header: 'Comprador', render: (p) => p.comprador_nome },
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
    { key: 'created_at', header: 'Data Criação', render: (p) => formatDateTime(p.created_at) },
    {
      key: 'actions',
      header: 'Ações',
      render: (p) => (
        <div style={{ display: 'flex', gap: '4px' }}>
          <Button
            size="sm"
            className={styles.iconButton}
            onClick={() => setSelectedPedido(p)}
            title="Visualizar itens do pedido"
            aria-label="Visualizar itens do pedido"
          >
            <EyeIcon />
          </Button>
          <Button
            size="sm"
            variant="danger"
            className={styles.iconButton}
            onClick={() => handleDelete(p.id)}
            title="Excluir pedido"
            aria-label="Excluir pedido"
          >
            <TrashIcon />
          </Button>
        </div>
      )
    }
  ];

  return (
    <>
      {/* Contêiner com estilo ajustado para expandir o campo de busca em 100% da largura */}
      <div style={{ width: '100%' }}>
        <DataTable
          columns={columns}
          rows={pedidosComFornecedor}
          getRowId={(p) => String(p.id)}
          searchKeys={['id', 'status', 'comprador_nome', 'fornecedor_nome']}
          searchPlaceholder="Buscar por Número, Fornecedor, Comprador, Status..."
          loading={loading}
          emptyTitle="Nenhum pedido de compra"
        />
      </div>

      {/* Popup de Informações do Pedido */}
      <Modal isOpen={!!selectedPedido} onClose={() => setSelectedPedido(null)} title={`Detalhes do Pedido #${selectedPedido?.id}`}>
        {selectedPedido && (
          <div>
            <div className={styles.detailGrid}>
              <div className={styles.detailField}>
                <span className={styles.detailLabel}>Fornecedor</span>
                <span className={styles.detailValue} title={fornecedorNome(selectedPedido.fornecedor_id)}>
                  {fornecedorNome(selectedPedido.fornecedor_id)}
                </span>
              </div>
              <div className={styles.detailField}>
                <span className={styles.detailLabel}>Comprador</span>
                <span className={styles.detailValue} title={selectedPedido.comprador_nome}>
                  {selectedPedido.comprador_nome}
                </span>
              </div>
              <div className={styles.detailField}>
                <span className={styles.detailLabel}>Status</span>
                <span>
                  <Badge tone={STATUS_TONE[selectedPedido.status] ?? 'neutral'}>
                    {STATUS_LABEL[selectedPedido.status] ?? selectedPedido.status}
                  </Badge>
                </span>
              </div>
              <div className={styles.detailField}>
                <span className={styles.detailLabel}>Criado em</span>
                <span className={styles.detailValue}>{formatDateTime(selectedPedido.created_at)}</span>
              </div>
              <div className={styles.detailField}>
                <span className={styles.detailLabel}>Atualizado em</span>
                <span className={styles.detailValue}>{formatDateTime(selectedPedido.updated_at)}</span>
              </div>
            </div>

            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Itens do pedido</h3>
              {!loadingItens && <Badge tone="neutral">{itens.length} {itens.length === 1 ? 'item' : 'itens'}</Badge>}
            </div>

            <div className={styles.itemsWrapper}>
              <table className={styles.itemsTable}>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>EAN</th>
                    <th className={styles.numericHead}>Qtd</th>
                    <th className={styles.numericHead}>Valor Unit.</th>
                    <th className={styles.numericHead}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingItens ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={5}>
                          <div className={styles.skeletonRow} />
                        </td>
                      </tr>
                    ))
                  ) : itens.length === 0 ? (
                    <tr>
                      <td colSpan={5} className={styles.emptyItems}>Nenhum item neste pedido.</td>
                    </tr>
                  ) : (
                    itens.map((item) => (
                      <tr key={item.id}>
                        <td>{item.item}</td>
                        <td className={item.ean ? styles.numeric : `${styles.numeric} ${styles.mutedCell}`}>
                          {item.ean || '—'}
                        </td>
                        <td className={styles.numeric}>{item.quantidade}</td>
                        <td className={styles.numeric}>{formatCurrency(Number(item.valor_unitario))}</td>
                        <td className={styles.numeric}>{formatCurrency(Number(item.valor_unitario) * item.quantidade)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {!loadingItens && itens.length > 0 && (
                  <tfoot>
                    <tr className={styles.totalRow}>
                      <td colSpan={4} className={styles.totalLabel}>Total do pedido</td>
                      <td className={styles.numeric}>{formatCurrency(totalPedido)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!pedidoToEdit} onClose={() => setPedidoToEdit(null)} title="Editar pedido">
        {pedidoToEdit && <PedidoForm pedido={pedidoToEdit} onSuccess={() => { setPedidoToEdit(null); onRefresh(); }} />}
      </Modal>
    </>
  );
};