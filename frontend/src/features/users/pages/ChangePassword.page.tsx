import React, { useState } from 'react';
import { changePasswordApi } from '../api/user.api';
import { AppShell, Button, Card, Input, useToast } from '../../shared/ui';

export const ChangePasswordPage: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      showToast('A nova senha e a confirmação não conferem.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await changePasswordApi({
        current_password: currentPassword,
        new_password: newPassword,
      });
      showToast(res.message || 'Senha alterada com sucesso.', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Erro ao alterar a senha.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title="Alterar senha">
      <Card className="" title="Sua senha" subtitle="Use uma senha com maiúscula, minúscula e número.">
        <form onSubmit={handleSubmit} style={{ maxWidth: 360 }}>
          <div style={{ marginBottom: '1rem' }}>
            <Input label="Senha atual" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required fullWidth />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <Input label="Nova senha" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required fullWidth />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <Input label="Confirmar nova senha" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required fullWidth />
          </div>
          <Button type="submit" isLoading={loading} loadingText="Salvando...">
            Alterar senha
          </Button>
        </form>
      </Card>
    </AppShell>
  );
};
