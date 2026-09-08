import React, { useState } from 'react';
import { createFornecedorApi, updateFornecedorApi, type Fornecedor } from '../api/fornecedoresApi';
import { Button, Card, Input, useToast } from '../../shared/ui';

interface FornecedorFormProps {
  onSuccess: () => void;
  fornecedor?: Fornecedor;
}

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export const FornecedorForm: React.FC<FornecedorFormProps> = ({ onSuccess, fornecedor }) => {
  // Inicialização direta baseada nas props para evitar setState dentro do useEffect
  const [nome, setNome] = useState(fornecedor?.nome ?? '');
  const [cnpj, setCnpj] = useState(fornecedor?.cnpj ?? '');
  const [telefone, setTelefone] = useState(fornecedor?.telefone ?? '');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim()) {
      showToast('Informe o nome do fornecedor.', 'error');
      return;
    }

    setLoading(true);
    try {
      if (fornecedor) {
        await updateFornecedorApi(fornecedor.id, {
          nome: nome.trim(),
          cnpj: cnpj.trim() || undefined,
          telefone: telefone.trim() || undefined,
        });
        showToast('Fornecedor atualizado com sucesso.', 'success');
      } else {
        await createFornecedorApi({
          nome: nome.trim(),
          cnpj: cnpj.trim() || undefined,
          telefone: telefone.trim() || undefined,
        });
        showToast('Fornecedor cadastrado com sucesso.', 'success');
      }
      
      if (!fornecedor) {
        setNome('');
        setCnpj('');
        setTelefone('');
      }
      onSuccess();
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Erro ao salvar fornecedor.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title={fornecedor ? "Editar fornecedor" : "Novo fornecedor"}>
      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: 'grid',
            gap: 'var(--space-3)',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            marginBottom: 'var(--space-4)',
          }}
        >
          <Input label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required fullWidth />
          <Input label="CNPJ" value={cnpj} onChange={(e) => setCnpj(e.target.value)} fullWidth />
          <Input label="Telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} fullWidth />
        </div>
        <Button type="submit" isLoading={loading} loadingText="Salvando...">
          {fornecedor ? "Atualizar fornecedor" : "Salvar fornecedor"}
        </Button>
      </form>
    </Card>
  );
};