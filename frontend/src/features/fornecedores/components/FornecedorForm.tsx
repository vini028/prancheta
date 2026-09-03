import React, { useState } from 'react';
import { createFornecedorApi } from '../api/fornecedoresApi';
import { Button, Card, Input, useToast } from '../../shared/ui';

interface FornecedorFormProps {
  onSuccess: () => void;
}

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export const FornecedorForm: React.FC<FornecedorFormProps> = ({ onSuccess }) => {
  const [nome, setNome] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [telefone, setTelefone] = useState('');
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
      await createFornecedorApi({
        nome: nome.trim(),
        cnpj: cnpj.trim() || undefined,
        telefone: telefone.trim() || undefined,
      });
      setNome('');
      setCnpj('');
      setTelefone('');
      showToast('Fornecedor cadastrado com sucesso.', 'success');
      onSuccess();
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Erro ao cadastrar fornecedor.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Novo fornecedor">
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
          Salvar fornecedor
        </Button>
      </form>
    </Card>
  );
};
