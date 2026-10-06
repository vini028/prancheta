import React, { useState } from 'react';
import { createClienteApi, updateClienteApi, type Cliente } from '../api/clientesApi';
import { Button, Card, Input, useToast } from '../../shared/ui';
import { onlyDigits } from '../lib/clienteFormat';

interface ClienteFormProps {
  onSuccess: () => void;
  cliente?: Cliente;
}

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export const ClienteForm: React.FC<ClienteFormProps> = ({ onSuccess, cliente }) => {
  const [nome, setNome] = useState(cliente?.nome ?? '');
  const [cpf, setCpf] = useState(cliente?.cpf ?? '');
  const [email, setEmail] = useState(cliente?.email ?? '');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim()) {
      showToast('Informe o nome do cliente.', 'error');
      return;
    }
    if (onlyDigits(cpf).length !== 11) {
      showToast('Informe um CPF válido com 11 dígitos.', 'error');
      return;
    }
    if (email.trim() !== '' && !email.includes('@')) {
      showToast('Informe um e-mail válido (ou deixe em branco).', 'error');
      return;
    }

    setLoading(true);
    try {
      if (cliente) {
        await updateClienteApi(cliente.id, {
          nome: nome.trim(),
          cpf: onlyDigits(cpf),
          email: email.trim(),
        });
        showToast('Cliente atualizado com sucesso.', 'success');
      } else {
        await createClienteApi({
          nome: nome.trim(),
          cpf: onlyDigits(cpf),
          email: email.trim() || undefined,
        });
        showToast('Cliente cadastrado com sucesso.', 'success');
        setNome('');
        setCpf('');
        setEmail('');
      }
      onSuccess();
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Erro ao salvar cliente.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title={cliente ? 'Editar cliente' : 'Novo cliente'}>
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
          <Input
            label="CPF"
            value={cpf}
            maxLength={14}
            onChange={(e) => setCpf(e.target.value)}
            required
            fullWidth
            placeholder="000.000.000-00"
          />
          <Input
            label="E-mail (opcional)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            placeholder="cliente@exemplo.com"
          />
        </div>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
          Clientes cadastrados ganham 5% de desconto (fidelidade) nas vendas do PDV.
        </p>
        <Button type="submit" isLoading={loading} loadingText="Salvando...">
          {cliente ? 'Atualizar cliente' : 'Salvar cliente'}
        </Button>
      </form>
    </Card>
  );
};
