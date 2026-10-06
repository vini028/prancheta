import React, { useEffect, useState } from 'react';
import { Button, Badge, Input, useToast } from '../../shared/ui';
import type { ConferenciaItemInput, PedidoItem } from '../api/comprasApi';
import { salvarConferenciaApi } from '../api/comprasApi';

interface ConferenciaItensTableProps {
  pedidoId: number;
  itens: PedidoItem[];
  disabled?: boolean;
  onSaved: (itens: PedidoItem[]) => void;
}

interface LinhaConferencia {
  item_id: number;
  quantidade_recebida: number;
  status_item: string;
  observacao_item: string;
}

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const STATUS_TONE: Record<string, 'warning' | 'positive' | 'danger' | 'neutral'> = {
  PENDENTE: 'warning',
  OK: 'positive',
  PROBLEMA: 'danger',
};

const selectStyle: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--text-primary)',
  fontSize: 'var(--text-sm)',
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '56px',
  padding: '8px 10px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--text-primary)',
  fontSize: 'var(--text-sm)',
  resize: 'vertical',
};

export const ConferenciaItensTable: React.FC<ConferenciaItensTableProps> = ({
  pedidoId,
  itens,
  disabled = false,
  onSaved,
}) => {
  const { showToast } = useToast();
  const [linhas, setLinhas] = useState<LinhaConferencia[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLinhas(
      itens.map((i) => ({
        item_id: i.id,
        quantidade_recebida: i.quantidade_recebida ?? i.quantidade,
        status_item: i.status_item === 'OK' || i.status_item === 'PROBLEMA' ? i.status_item : 'OK',
        observacao_item: i.observacao_item ?? '',
      })),
    );
  }, [itens]);

  const updateLinha = (index: number, patch: Partial<LinhaConferencia>) => {
    setLinhas((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  };

  const handleSave = async () => {
    // Validação client-side espelhando o backend
    for (const l of linhas) {
      if (l.quantidade_recebida < 0) {
        showToast('Quantidade recebida deve ser maior ou igual a zero.', 'error');
        return;
      }
      if (l.status_item === 'PROBLEMA' && !l.observacao_item.trim()) {
        showToast('Observação é obrigatória para itens marcados como Problema.', 'error');
        return;
      }
    }

    const payload: ConferenciaItemInput[] = linhas.map((l) => ({
      item_id: l.item_id,
      quantidade_recebida: l.quantidade_recebida,
      status_item: l.status_item,
      observacao_item: l.observacao_item.trim() || null,
    }));

    setSaving(true);
    try {
      const atualizados = await salvarConferenciaApi(pedidoId, { itens: payload });
      showToast('Conferência salva com sucesso.', 'success');
      onSaved(atualizados);
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Erro ao salvar conferência.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
            <th style={{ padding: '8px' }}>Item</th>
            <th style={{ padding: '8px' }}>Qtd. pedida</th>
            <th style={{ padding: '8px' }}>Valor Unit. Compra</th>
            <th style={{ padding: '8px' }}>Qtd. recebida</th>
            <th style={{ padding: '8px' }}>Avaliação</th>
            <th style={{ padding: '8px' }}>Observação</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item, index) => {
            const linha = linhas[index];
            if (!linha) return null;
            const isProblema = linha.status_item === 'PROBLEMA';
            return (
              <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px' }}>
                  <div style={{ fontWeight: 600 }}>{item.item}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    EAN: {item.ean || '—'} · <Badge tone={STATUS_TONE[item.status_item] ?? 'neutral'}>{item.status_item}</Badge>
                  </div>
                </td>
                <td style={{ padding: '8px' }}>{item.quantidade}</td>
                <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>
                  R$ {Number(item.valor_unitario).toFixed(2)}
                </td>
                <td style={{ padding: '8px', minWidth: '110px' }}>
                  <Input
                    type="number"
                    min={0}
                    value={linha.quantidade_recebida}
                    onChange={(e) => updateLinha(index, { quantidade_recebida: Number(e.target.value) })}
                    disabled={disabled}
                  />
                </td>
                <td style={{ padding: '8px' }}>
                  <select
                    value={linha.status_item}
                    onChange={(e) => updateLinha(index, { status_item: e.target.value })}
                    disabled={disabled}
                    style={selectStyle}
                  >
                    <option value="OK">OK</option>
                    <option value="PROBLEMA">Problema</option>
                  </select>
                </td>
                <td style={{ padding: '8px', minWidth: '220px' }}>
                  <textarea
                    value={linha.observacao_item}
                    onChange={(e) => updateLinha(index, { observacao_item: e.target.value })}
                    disabled={disabled || !isProblema}
                    placeholder={isProblema ? 'Descreva o problema...' : 'Só para itens com problema'}
                    required={isProblema}
                    style={{
                      ...textareaStyle,
                      opacity: disabled || !isProblema ? 0.6 : 1,
                    }}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {!disabled && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <Button onClick={handleSave} isLoading={saving} loadingText="Salvando...">
            Salvar conferência
          </Button>
        </div>
      )}
    </div>
  );
};
