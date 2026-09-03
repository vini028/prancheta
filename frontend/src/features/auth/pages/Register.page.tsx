import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import { AuthLayout, Button, Input } from '../../shared/ui';

export const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'BUYER' | 'SELLER'>('BUYER');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if(password != confirmPassword){
      setError("As senhas não coincidem.")
    }

    try {
      await authApi.register({ name, email, password, role });
      navigate('/login', { state: { justRegistered: true } });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ocorreu um erro ao fazer o cadastro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Criar conta"
      subtitle="Cadastre-se como comprador ou vendedor."
      footer={<>Já possui conta? <Link to="/login">Faça login</Link></>}
    >
      {error && <div role="alert" style={{ marginBottom: '1rem', color: 'var(--danger)', fontSize: 'var(--text-sm)' }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} required fullWidth />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required fullWidth autoComplete="email" />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <Input
            label="Senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
            autoComplete="new-password"
          />
          <small style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
            Mínimo 8 caracteres, com maiúscula, minúscula e número.
          </small>
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <Input
            label="Confirmar Senha"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            fullWidth
            autoComplete="new-password"
          />
        </div>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: 6 }}>Perfil</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['BUYER', 'SELLER'] as const).map((r) => (
              <button
                type="button"
                key={r}
                onClick={() => setRole(r)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${role === r ? 'var(--brand)' : 'var(--border)'}`,
                  background: role === r ? 'var(--brand-bg)' : 'var(--surface)',
                  color: role === r ? 'var(--brand-active)' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: 'var(--text-sm)',
                  cursor: 'pointer',
                }}
              >
                {r === 'BUYER' ? 'Comprador' : 'Vendedor'}
              </button>
            ))}
          </div>
        </div>
        <Button type="submit" fullWidth isLoading={loading} loadingText="Cadastrando...">
          Criar conta
        </Button>
      </form>
    </AuthLayout>
  );
};
