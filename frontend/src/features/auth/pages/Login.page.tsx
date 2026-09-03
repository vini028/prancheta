import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import { setAuthSession } from '../store/auth.store';
import { AuthLayout, Button, Input, useToast } from '../../shared/ui';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  useEffect(() => {
    if ((location.state as { justRegistered?: boolean } | null)?.justRegistered) {
      showToast('Cadastro realizado. Faça login para continuar.', 'success');
      navigate(location.pathname, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await authApi.login({ email, password });

      // Busca os dados completos do usuário recém logado na rota /api/me
      const meRes = await fetch('http://localhost:3000/api/me', {
        headers: { Authorization: `Bearer ${res.token}` },
      });
      const userData = await meRes.json();

      setAuthSession(res.token, userData);
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ocorreu um erro ao fazer login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Entrar"
      subtitle="Acesse com seu e-mail e senha cadastrados."
      footer={<>Não tem conta? <Link to="/register">Cadastre-se</Link></>}
    >
      {error && <div role="alert" style={{ marginBottom: '1rem', color: 'var(--danger)', fontSize: 'var(--text-sm)' }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <Input
            label="E-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            fullWidth
            autoComplete="email"
          />
        </div>
        <div style={{ marginBottom: '1.5rem' }}>
          <Input
            label="Senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
            autoComplete="current-password"
          />
        </div>
        <Button type="submit" fullWidth isLoading={loading} loadingText="Entrando...">
          Entrar
        </Button>
      </form>
    </AuthLayout>
  );
};
