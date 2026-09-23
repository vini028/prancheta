import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell, Button, Card, useToast } from '../../shared/ui';
import { useAuth } from '../../auth/hooks/auth.hook';
import { ConferenciaItensTable } from '../components/ConferenciaItensTable';
import {
  atualizarStatusEnvioApi,
  getPedidoItensApi,
  getPedidosApi,
  type Pedido,
  type PedidoItem,
} from '../api/comprasApi';

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export const ConferenciaPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const pedidoId = Number(id);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user, isAdmin } = useAuth();

  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [itens, setItens] = useState<PedidoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);

  const loadData = useCallback(async () => {
    if (!Number.isFinite(pedidoId)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [pedidos, itensPedido] = await Promise.all([getPedidosApi(), getPedidoItensApi(pedidoId)]);
      setPedido(pedidos.find((p) => p.id === pedidoId) ?? null);
      setItens(itensPedido);
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Erro ao carregar conferência.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [pedidoId, showToast]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadData]);

  const isOwner = pedido != null && user?.id === pedido.comprador_id;
  const podeConferir = isAdmin || isOwner;
  const emRecebido = pedido?.status_envio === 'RECEBIDO';
  const readOnly = !podeConferir || !emRecebido;

  const temProblema = itens.some((i) => i.status_item === 'PROBLEMA');
  const podeConfirmar = emRecebido && itens.length > 0 && !temProblema;

  const handleAvancar = async (destino: 'CONFERIDO' | 'COM_PROBLEMA') => {
    try {
      setAdvancing(true);
      await atualizarStatusEnvioApi(pedidoId, destino);
      showToast(
        destino === 'CONFERIDO' ? 'Conferência confirmada.' : 'Problema reportado no pedido.',
        'success',
      );
      navigate('/purchases');
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Erro ao atualizar envio.'), 'error');
    } finally {
      setAdvancing(false);
    }
  };

  return (
    <AppShell title={`Conferência do Pedido #${id}`}>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <Button variant="secondary" onClick={() => navigate('/purchases')}>
          ← Voltar para pedidos
        </Button>
      </div>

      {loading ? (
        <Card title="Carregando...">
          <p>Buscando itens do pedido.</p>
        </Card>
      ) : pedido == null ? (
        <Card title="Pedido não encontrado">
          <p>Verifique o número do pedido e tente novamente.</p>
        </Card>
      ) : !podeConferir ? (
        <Card title="Acesso negado">
          <p>Somente o comprador responsável pelo pedido (ou um ADMIN) pode fazer a conferência.</p>
        </Card>
      ) : (
        <Card
          title={
            emRecebido
              ? `Itens recebidos (${itens.length})`
              : `Conferência indisponível — pedido está ${pedido.status_envio ?? pedido.status}`
          }
        >
          {!emRecebido && (
            <p style={{ marginBottom: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>
              A conferência só pode ser preenchida quando o envio está RECEBIDO.
            </p>
          )}
          {itens.length === 0 ? (
            <p>Nenhum item neste pedido.</p>
          ) : (
            <>
              <ConferenciaItensTable
                pedidoId={pedidoId}
                itens={itens}
                disabled={readOnly}
                onSaved={setItens}
              />
              {emRecebido && (
                <div style={{ display: 'flex', gap: '8px', marginTop: 'var(--space-4)', flexWrap: 'wrap' }}>
                  <Button
                    onClick={() => handleAvancar('CONFERIDO')}
                    disabled={!podeConfirmar || advancing}
                    isLoading={advancing}
                    loadingText="Confirmando..."
                    title={
                      temProblema
                        ? 'Resolva os itens com problema antes de confirmar'
                        : 'Avançar envio para CONFERIDO'
                    }
                  >
                    Confirmar conferência
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => handleAvancar('COM_PROBLEMA')}
                    disabled={!temProblema || advancing}
                    title={
                      temProblema
                        ? 'Reportar problema no pedido (observações da conferência são reaproveitadas)'
                        : 'Marque ao menos um item como Problema para reportar'
                    }
                  >
                    Reportar problema no pedido
                  </Button>
                </div>
              )}
            </>
          )}
        </Card>
      )}
    </AppShell>
  );
};
