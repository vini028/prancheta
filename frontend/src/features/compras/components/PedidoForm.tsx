import React, { useEffect, useState } from 'react';
import { createPedidoApi } from '../api/comprasApi';
import { getFornecedoresApi } from '../../fornecedores/api/fornecedoresApi';
import type { Fornecedor } from '../../fornecedores/api/fornecedoresApi';
import { Button, Card, Input, useToast } from '../../shared/ui';

interface PedidoFormProps {
  onSuccess: () => void;
}

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--text-primary)',
  fontSize: 'var(--text-sm)',
};

export const PedidoForm: React.FC<PedidoFormProps> = ({ onSuccess }) => {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [fornecedorId, setFornecedorId] = useState('');
  const [item, setItem] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [valor, setValor] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    getFornecedoresApi()
      .then(setFornecedores)
      .catch((err: unknown) => showToast(getErrorMessage(err, 'Erro ao carregar fornecedores.'), 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fornecedorId || !item.trim() || !quantidade || !valor) {
      showToast('Preencha todos os campos do pedido.', 'error');
      return;
    }

    setLoading(true);
    try {
      await createPedidoApi({
        fornecedor_id: Number(fornecedorId),
        item: item.trim(),
        quantidade: Number(quantidade),
        valor_total: Number(valor),
      });
      setFornecedorId('');
      setItem('');
      setQuantidade('');
      setValor('');
      showToast('Pedido de compra registrado com sucesso.', 'success');
      onSuccess();
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Erro ao registrar pedido.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Novo pedido de compra">
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
            Fornecedor
          </label>
          <select value={fornecedorId} onChange={(e) => setFornecedorId(e.target.value)} required style={selectStyle}>
            <option value="">Selecione um fornecedor</option>
            {fornecedores.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            display: 'grid',
            gap: 'var(--space-3)',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            marginBottom: 'var(--space-4)',
          }}
        >
          <Input label="Item" value={item} onChange={(e) => setItem(e.target.value)} required fullWidth />
          <Input
            label="Quantidade"
            type="number"
            min={1}
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            required
            fullWidth
          />
          <Input
            label="Valor total (R$)"
            type="number"
            min={0}
            step="0.01"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            required
            fullWidth
          />
        </div>

        <Button type="submit" isLoading={loading} loadingText="Salvando...">
          Registrar pedido
        </Button>
      </form>
    </Card>
  );
};
