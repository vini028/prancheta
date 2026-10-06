import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '../features/auth/pages/Login.page';
import { RegisterPage } from '../features/auth/pages/Register.page';
import { HomePage } from '../features/users/pages/Home.page';
import { UsersManagementPage } from '../features/users/pages/UsersManagement.page';
import { ChangePasswordPage } from '../features/users/pages/ChangePassword.page';
import { SuppliersPage } from '../features/fornecedores/pages/Suppliers.page';
import { PurchasesPage } from '../features/compras/pages/Purchases.page';
import { ConferenciaPage } from '../features/compras/pages/Conferencia.page';
import { InventoryPage } from '../features/produtos/pages/Inventory.page';
import { ClientesPage } from '../features/clientes/pages/Clientes.page';
import { PdvPage } from '../features/vendas/pages/Pdv.page';
import { VendasPage } from '../features/vendas/pages/Vendas.page';
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

      {/* Rotas Protegidas (Para ADMIN e BUYER) */}
      <Route element={<PrivateRoute allowedRoles={['ADMIN', 'BUYER']} />}>
        <Route path="/suppliers" element={<SuppliersPage />} />
        <Route path="/purchases" element={<PurchasesPage />} />
        <Route path="/compras/:id/conferencia" element={<ConferenciaPage />} />
      </Route>

      {/* Inventário: leitura para ADMIN, BUYER e SELLER; escrita só ADMIN (na UI) */}
      <Route element={<PrivateRoute allowedRoles={['ADMIN', 'BUYER', 'SELLER']} />}>
        <Route path="/inventory" element={<InventoryPage />} />
      </Route>

      {/* Módulo do Vendedor/PDV (AC03): ADMIN e SELLER. BUYER cai no "/" (acesso restrito). */}
      <Route element={<PrivateRoute allowedRoles={['ADMIN', 'SELLER']} />}>
        <Route path="/clientes" element={<ClientesPage />} />
        <Route path="/pdv" element={<PdvPage />} />
        <Route path="/vendas" element={<VendasPage />} />
      </Route>

      {/* Rota Protegida Exclusiva (Apenas ADMIN) */}
      <Route element={<PrivateRoute allowedRoles={['ADMIN']} />}>
        <Route path="/users" element={<UsersManagementPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};