import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, Button, Badge, Input, useToast, Modal } from '../../shared/ui';
import type { Column } from '../../shared/ui';
import type { Pedido, PedidoItem } from '../api/comprasApi';
import type { Fornecedor } from '../../fornecedores/api/fornecedoresApi';
import {
  deletePedidoApi,
  getPedidoItensApi,
  aprovarPedidoApi,
  rejeitarPedidoApi,
  cancelarPedidoApi,
  atualizarStatusEnvioApi,
} from '../api/comprasApi';
import { useAuth } from '../../auth/hooks/auth.hook';
import { PedidoForm } from './PedidoForm';
import styles from './PedidoTable.module.css';

interface PedidoTableProps {
  pedidos: Pedido[];
  fornecedores: Fornecedor[];
  loading: boolean;
  onRefresh: () => void;
}

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const APROVACAO_LABEL: Record<string, string> = {
  PENDENTE: 'Pendente',
  APROVADO: 'Aprovado',
  REJEITADO: 'Rejeitado',
  CANCELADO: 'Cancelado',
};

const APROVACAO_TONE: Record<string, 'warning' | 'positive' | 'danger' | 'neutral'> = {
  PENDENTE: 'warning',
  APROVADO: 'positive',
  REJEITADO: 'danger',
  CANCELADO: 'danger',
};

const ENVIO_LABEL: Record<string, string> = {
  CONFIRMADO: 'Confirmado',
  ENVIADO: 'Enviado',
  RECEBIDO: 'Recebido',
  CONFERIDO: 'Conferido',
  CONCLUIDO: 'Concluído',
  COM_PROBLEMA: 'Com problema',
};

const ENVIO_TONE: Record<string, 'positive' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  CONFIRMADO: 'info',
  ENVIADO: 'info',
  RECEBIDO: 'warning',
  CONFERIDO: 'warning',
  CONCLUIDO: 'positive',
  COM_PROBLEMA: 'danger',
};

/** Próxima etapa do fluxo feliz: CONFIRMADO -> ENVIADO -> RECEBIDO -> CONFERIDO -> CONCLUIDO */
const PROXIMA_ETAPA: Record<string, string> = {
  CONFIRMADO: 'ENVIADO',
  ENVIADO: 'RECEBIDO',
  RECEBIDO: 'CONFERIDO',
  CONFERIDO: 'CONCLUIDO',
};

const ETAPAS_COM_PROBLEMA = ['CONFIRMADO', 'ENVIADO', 'RECEBIDO', 'CONFERIDO'];

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

const CheckIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const XIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const BanIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="m4.9 4.9 14.2 14.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ArrowRightIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 12h14m-6-6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const AlertIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 9v4m0 4h.01" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const RetryIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 3v5h5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ClipboardCheckIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
    <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="m9 14 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const PedidoTable: React.FC<PedidoTableProps> = ({ pedidos, fornecedores, loading, onRefresh }) => {
  const { showToast } = useToast();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [pedidoToEdit, setPedidoToEdit] = useState<Pedido | null>(null);
  const [pedidoProblema, setPedidoProblema] = useState<Pedido | null>(null);
  const [observacao, setObservacao] = useState('');
  const [savingProblema, setSavingProblema] = useState(false);
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

  const isOwner = (p: Pedido) => user?.id === p.comprador_id;
  /** Quem pode mexer no envio: ADMIN (override) ou BUYER dono do pedido. */
  const canManageEnvio = (p: Pedido) => isAdmin || isOwner(p);

  const handleAprovar = async (id: number) => {
    try {
      await aprovarPedidoApi(id);
      showToast('Pedido aprovado e confirmado para envio.', 'success');
      onRefresh();
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Erro ao aprovar pedido.'), 'error');
    }
  };

  const handleRejeitar = async (id: number) => {
    if (!confirm('Deseja realmente rejeitar este pedido?')) return;
    try {
      await rejeitarPedidoApi(id);
      showToast('Pedido rejeitado.', 'success');
      onRefresh();
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Erro ao rejeitar pedido.'), 'error');
    }
  };

  const handleCancelar = async (id: number) => {
    if (!confirm('Deseja realmente cancelar este pedido?')) return;
    try {
      await cancelarPedidoApi(id);
      showToast('Pedido cancelado.', 'success');
      onRefresh();
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Erro ao cancelar pedido.'), 'error');
    }
  };

  const handleAvancarEnvio = async (p: Pedido) => {
    const proximo = p.status_envio ? PROXIMA_ETAPA[p.status_envio] : undefined;
    if (!proximo) return;
    const concluir = proximo === 'CONCLUIDO';
    if (concluir && !confirm('Concluir o pedido? Os itens subirão para o estoque.')) return;
    try {
      await atualizarStatusEnvioApi(p.id, proximo);
      showToast(
        concluir ? 'Pedido concluído e estoque atualizado.' : `Pedido marcado como ${ENVIO_LABEL[proximo]}.`,
        'success',
      );
      onRefresh();
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Erro ao atualizar envio.'), 'error');
    }
  };

  const handleRelatarProblema = async () => {
    if (!pedidoProblema) return;
    if (!observacao.trim()) {
      showToast('Descreva o problema (avaria, extravio, divergência...).', 'error');
      return;
    }
    setSavingProblema(true);
    try {
      await atualizarStatusEnvioApi(pedidoProblema.id, 'COM_PROBLEMA', observacao.trim());
      showToast('Problema registrado no pedido.', 'success');
      setPedidoProblema(null);
      setObservacao('');
      onRefresh();
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Erro ao registrar problema.'), 'error');
    } finally {
      setSavingProblema(false);
    }
  };

  const handleRetomarEnvio = async (p: Pedido, destino: string) => {
    try {
      await atualizarStatusEnvioApi(p.id, destino);
      showToast(`Pedido retomado em ${ENVIO_LABEL[destino]}.`, 'success');
      onRefresh();
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Erro ao retomar envio.'), 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Deseja realmente excluir este pedido?')) return;
    try {
      await deletePedidoApi(id);
      showToast('Pedido excluído com sucesso.', 'success');
      onRefresh();
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Erro ao excluir pedido.'), 'error');
    }
  };

  const columns: Column<typeof pedidosComFornecedor[number]>[] = [
    { key: 'id', header: 'Pedido', render: (p) => p.id },
    { key: 'fornecedor_nome', header: 'Fornecedor', render: (p) => p.fornecedor_nome },
    { key: 'comprador_nome', header: 'Comprador', render: (p) => p.comprador_nome },
    {
      key: 'status',
      header: 'Aprovação',
      render: (p) => (
        <Badge tone={APROVACAO_TONE[p.status] ?? 'neutral'}>
          {APROVACAO_LABEL[p.status] ?? p.status}
        </Badge>
      ),
    },
    {
      key: 'status_envio',
      header: 'Envio',
      render: (p) =>
        p.status_envio ? (
          <Badge tone={ENVIO_TONE[p.status_envio] ?? 'neutral'}>
            {ENVIO_LABEL[p.status_envio] ?? p.status_envio}
          </Badge>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>—</span>
        ),
    },
    { key: 'created_at', header: 'Data Criação', render: (p) => formatDateTime(p.created_at) },
    {
      key: 'actions',
      header: 'Ações',
      render: (p) => {
        const proximo = p.status_envio ? PROXIMA_ETAPA[p.status_envio] : undefined;
        const podeAvancar = p.status === 'APROVADO' && proximo && canManageEnvio(p);
        const podeRelatar = p.status === 'APROVADO' && p.status_envio && ETAPAS_COM_PROBLEMA.includes(p.status_envio) && canManageEnvio(p);
        const podeRetomar = p.status === 'APROVADO' && p.status_envio === 'COM_PROBLEMA' && canManageEnvio(p);
        const podeConferir = p.status === 'APROVADO' && p.status_envio === 'RECEBIDO' && canManageEnvio(p);
        // Pedido concluído já subiu ao estoque: imutável (sem cancelar nem excluir).
        const concluido = p.status_envio === 'CONCLUIDO';

        return (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {isAdmin && p.status === 'PENDENTE' && (
              <>
                <Button size="sm" variant="success" className={styles.iconButton} onClick={() => handleAprovar(p.id)} title="Aprovar pedido" aria-label="Aprovar pedido">
                  <CheckIcon />
                </Button>
                <Button size="sm" variant="secondary" className={styles.iconButton} onClick={() => handleRejeitar(p.id)} title="Rejeitar pedido" aria-label="Rejeitar pedido">
                  <XIcon />
                </Button>
              </>
            )}
            {isAdmin && p.status === 'APROVADO' && !concluido && (
              <Button size="sm" variant="danger" className={styles.iconButton} onClick={() => handleCancelar(p.id)} title="Cancelar pedido" aria-label="Cancelar pedido">
                <BanIcon />
              </Button>
            )}
            {podeConferir && (
              <Button size="sm" variant="secondary" className={styles.iconButton} onClick={() => navigate(`/compras/${p.id}/conferencia`)} title="Conferir itens recebidos" aria-label="Conferir itens recebidos">
                <ClipboardCheckIcon />
              </Button>
            )}
            {podeAvancar && (
              <Button size="sm" variant="secondary" className={styles.iconButton} onClick={() => handleAvancarEnvio(p)} title={`Avançar para ${ENVIO_LABEL[proximo!]}`} aria-label={`Avançar para ${ENVIO_LABEL[proximo!]}`}>
                <ArrowRightIcon />
              </Button>
            )}
            {podeRelatar && (
              <Button
                size="sm"
                variant="danger"
                className={styles.iconButton}
                onClick={() => { setPedidoProblema(p); setObservacao(''); }}
                title="Relatar problema no envio"
                aria-label="Relatar problema no envio"
              >
                <AlertIcon />
              </Button>
            )}
            {podeRetomar && (
              <Button size="sm" variant="secondary" className={styles.iconButton} onClick={() => handleRetomarEnvio(p, 'ENVIADO')} title="Retomar envio após problema" aria-label="Retomar envio após problema">
                <RetryIcon />
              </Button>
            )}
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
              title={concluido ? 'Pedidos concluídos não podem ser excluídos' : 'Excluir pedido'}
              aria-label="Excluir pedido"
              disabled={concluido}
            >
              <TrashIcon />
            </Button>
          </div>
        );
      },
    },
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
                <span className={styles.detailLabel}>Aprovação</span>
                <span>
                  <Badge tone={APROVACAO_TONE[selectedPedido.status] ?? 'neutral'}>
                    {APROVACAO_LABEL[selectedPedido.status] ?? selectedPedido.status}
                  </Badge>
                </span>
              </div>
              <div className={styles.detailField}>
                <span className={styles.detailLabel}>Envio</span>
                <span>
                  {selectedPedido.status_envio ? (
                    <Badge tone={ENVIO_TONE[selectedPedido.status_envio] ?? 'neutral'}>
                      {ENVIO_LABEL[selectedPedido.status_envio] ?? selectedPedido.status_envio}
                    </Badge>
                  ) : (
                    '—'
                  )}
                </span>
              </div>
              {selectedPedido.observacao_problema && (
                <div className={styles.detailField} style={{ gridColumn: '1 / -1' }}>
                  <span className={styles.detailLabel}>Problema relatado</span>
                  <span className={styles.detailValue}>{selectedPedido.observacao_problema}</span>
                </div>
              )}
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

      {/* Modal para relatar problema no envio */}
      <Modal isOpen={!!pedidoProblema} onClose={() => setPedidoProblema(null)} title={`Relatar problema — Pedido #${pedidoProblema?.id}`}>
        <p style={{ marginBottom: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>
          Descreva o problema (avaria, extravio, divergência de quantidade/EAN...). O pedido ficará com status de envio COM_PROBLEMA.
        </p>
        <Input
          label="Observação do problema"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Ex.: 2 unidades chegaram avariadas"
          fullWidth
        />
        <div style={{ display: 'flex', gap: '8px', marginTop: 'var(--space-4)' }}>
          <Button variant="danger" onClick={handleRelatarProblema} isLoading={savingProblema} loadingText="Salvando...">
            Confirmar problema
          </Button>
          <Button variant="secondary" onClick={() => setPedidoProblema(null)}>
            Voltar
          </Button>
        </div>
      </Modal>

      <Modal isOpen={!!pedidoToEdit} onClose={() => setPedidoToEdit(null)} title="Editar pedido">
        {pedidoToEdit && <PedidoForm pedido={pedidoToEdit} onSuccess={() => { setPedidoToEdit(null); onRefresh(); }} />}
      </Modal>
    </>
  );
};
