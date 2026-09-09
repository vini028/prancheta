import React, { useEffect, useState } from 'react';
import { createPedidoApi, updatePedidoApi, type CreatePedidoItemInput, type Pedido } from '../api/comprasApi';
import { getFornecedoresApi } from '../../fornecedores/api/fornecedoresApi';
import type { Fornecedor } from '../../fornecedores/api/fornecedoresApi';
import { Button, Card, Input, useToast } from '../../shared/ui';

interface PedidoFormProps {
  onSuccess: () => void;
  pedido?: Pedido;
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

export const PedidoForm: React.FC<PedidoFormProps> = ({ onSuccess, pedido }) => {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [fornecedorId, setFornecedorId] = useState(pedido?.fornecedor_id.toString() || '');
  const [itens, setItens] = useState<CreatePedidoItemInput[]>(
    pedido?.itens?.map(i => ({ item: i.item, ean: i.ean, quantidade: i.quantidade, valor_unitario: i.valor_unitario.toString() })) 
    || [{ item: '', ean: '', quantidade: 1, valor_unitario: '' }]
  );
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    getFornecedoresApi()
      .then(setFornecedores)
      .catch((err: unknown) => showToast(getErrorMessage(err, 'Erro ao carregar fornecedores.'), 'error'));
  }, [showToast]);

  const addItem = () => setItens([...itens, { item: '', ean: '', quantidade: 1, valor_unitario: '' }]);

  const removeItem = (index: number) => setItens(itens.filter((_, i) => i !== index));

  const updateItem = (index: number, field: keyof CreatePedidoItemInput, value: string | number) => {
    const newItens = [...itens];
    newItens[index] = { ...newItens[index], [field]: value };
    setItens(newItens);
  };

  const resetForm = () => {
    setFornecedorId('');
    setItens([{ item: '', ean: '', quantidade: 1, valor_unitario: '' }]);
  };

  const totalValor = itens.reduce((acc, item) => acc + (Number(item.valor_unitario) * Number(item.quantidade)), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fornecedorId || itens.some(i => !i.item.trim() || i.quantidade <= 0 || Number(i.valor_unitario) < 0)) {
      showToast('Preencha os dados do fornecedor e de todos os itens corretamente.', 'error');
      return;
    }

    setLoading(true);
    try {
      const itensPayload = itens.map((item) => ({
        ...item,
        valor_unitario: Number(item.valor_unitario).toFixed(2),
      }));

      const payload = {
        fornecedor_id: Number(fornecedorId),
        itens: itensPayload,
      };

      if (pedido) {
        await updatePedidoApi(pedido.id, payload);
        showToast('Pedido de compra atualizado com sucesso.', 'success');
      } else {
        await createPedidoApi(payload);
        showToast('Pedido de compra registrado com sucesso.', 'success');
        resetForm();
      }
      onSuccess();
    } catch (err: unknown) {
      console.error(err);
      showToast(getErrorMessage(err, `Erro ao ${pedido ? 'atualizar' : 'registrar'} pedido.`), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title={pedido ? "Editar pedido" : "Novo pedido de compra"}>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
            Fornecedor
          </label>
          <select value={fornecedorId} onChange={(e) => setFornecedorId(e.target.value)} required style={selectStyle}>
            <option value="">Selecione um fornecedor</option>
            {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
        </div>

        <Button type="button" variant="secondary" onClick={addItem} style={{ marginBottom: 'var(--space-3)' }}>
          + Adicionar Item
        </Button>

        {itens.map((item, index) => (
          <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <Input label="Item" value={item.item} onChange={(e) => updateItem(index, 'item', e.target.value)} required />
            <Input 
              label="EAN" 
              value={item.ean || ''} 
              maxLength={13}
              onChange={(e) => updateItem(index, 'ean', e.target.value)} 
            />
            <Input label="Quantidade" type="number" min={1} value={item.quantidade} onChange={(e) => updateItem(index, 'quantidade', Number(e.target.value))} required />
            <Input label="Valor Unitário" type="number" min={0} step="0.01" value={item.valor_unitario} onChange={(e) => updateItem(index, 'valor_unitario', Number(e.target.value))} required />
            <Button type="button" variant="danger" onClick={() => removeItem(index)} style={{ marginTop: '22px' }}>X</Button>
          </div>
        ))}

        <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'bold', margin: 'var(--space-3) 0' }}>
          Total: R$ {totalValor.toFixed(2)}
        </div>

        <Button type="submit" isLoading={loading} loadingText="Salvando...">
          {pedido ? 'Atualizar pedido' : 'Registrar pedido'}
        </Button>
      </form>
    </Card>
  );
};
