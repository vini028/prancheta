import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '../features/auth/pages/Login.page';
import { RegisterPage } from '../features/auth/pages/Register.page';
import { HomePage } from '../features/users/pages/Home.page';
import { UsersManagementPage } from '../features/users/pages/UsersManagement.page';
import { ChangePasswordPage } from '../features/users/pages/ChangePassword.page';
import { PrivateRoute } from './PrivateRoute';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Rotas Públicas */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Rotas Protegidas (Para QUALQUER usuário autenticado) */}
      <Route element={<PrivateRoute />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
      </Route>

      {/* Rota Protegida Exclusiva (Apenas ADMIN) */}
      <Route element={<PrivateRoute allowedRoles={['ADMIN']} />}>
        <Route path="/users" element={<UsersManagementPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};