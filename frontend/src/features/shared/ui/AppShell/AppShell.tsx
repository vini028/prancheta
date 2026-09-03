import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../../auth/hooks/auth.hook';
import { Badge } from '../Badge/Badge';
import styles from './AppShell.module.css';

export interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles?: Array<'ADMIN' | 'BUYER' | 'SELLER'>;
  comingInPhase?: string;
}

const icon = (path: string) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d={path} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ClipboardIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
  </svg>
);

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Painel', icon: icon('M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6V11h-6v9Zm0-16v5h6V4h-6Z') },
  { to: '/suppliers', label: 'Fornecedores', icon: icon('M10 17h4M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Zm10 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM3 9l2-4h10l2 4v6H3V9Zm14 0h4l2 3v3h-6V9Z'), roles: ['ADMIN', 'BUYER'] },
  { to: '/purchases', label: 'Pedidos', icon: icon('M3 3h2l2.4 12.2a2 2 0 0 0 2 1.8h7.2a2 2 0 0 0 2-1.6L21 8H6'), roles: ['ADMIN', 'BUYER'] },
  { to: '/products', label: 'Produtos', icon: icon('M20 7 12 3 4 7m16 0-8 4m8-4v10l-8 4M4 7l8 4m-8-4v10l8 4m0-10v10'), comingInPhase: 'Fase 2 · 08/11' },
  { to: '/clients', label: 'Clientes', icon: icon('M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75'), roles: ['ADMIN', 'SELLER'], comingInPhase: 'Fase 3 · 01/12' },
  { to: '/sales', label: 'Vendas', icon: icon('M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6'), roles: ['ADMIN', 'SELLER'], comingInPhase: 'Fase 3 · 01/12' },
  { to: '/users', label: 'Usuários', icon: icon('M17 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1m18 0v-1a4 4 0 0 0-3-3.87M14 4.13a4 4 0 0 1 0 7.75M11 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z'), roles: ['ADMIN'] },
];

interface AppShellProps {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ title, children, actions }) => {
  const { user, role, logout } = useAuth();
  const items = NAV_ITEMS.filter((item) => !item.roles || (role && item.roles.includes(role)));
  const initials = (user?.name ?? '?').trim().slice(0, 2).toUpperCase();

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>
            <ClipboardIcon />
          </span>
          <span className={styles.brandName}>Prancheta</span>
        </div>

        <nav className={styles.nav}>
          {items.map((item) =>
            item.comingInPhase ? (
              <span key={item.to} className={styles.navItemDisabled} title={`Chega na ${item.comingInPhase}`}>
                {item.icon}
                <span>{item.label}</span>
                <span className={styles.soonTag}>{item.comingInPhase.split(' ·')[0]}</span>
              </span>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            )
          )}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userCard}>
            <span className={styles.avatar}>{initials}</span>
            <div className={styles.userMeta}>
              <span className={styles.userName}>{user?.name}</span>
              {role && <Badge role={role} />}
            </div>
          </div>
          <button className={styles.logoutBtn} onClick={logout}>
            Sair
          </button>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <h1 className={styles.pageTitle}>{title}</h1>
          {actions && <div className={styles.topbarActions}>{actions}</div>}
        </header>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
};