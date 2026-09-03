import React from 'react';
import styles from './Badge.module.css';

type Role = 'ADMIN' | 'BUYER' | 'SELLER';
type Tone = 'brand' | 'positive' | 'warning' | 'danger' | 'info' | 'neutral';

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Admin',
  BUYER: 'Comprador',
  SELLER: 'Vendedor',
};

const ROLE_TONE: Record<Role, Tone> = {
  ADMIN: 'brand',
  BUYER: 'info',
  SELLER: 'positive',
};

interface BadgeProps {
  role?: Role;
  tone?: Tone;
  children?: React.ReactNode;
}

/**
 * `<Badge role="ADMIN" />` para papéis de usuário.
 * `<Badge tone="warning">Estoque baixo</Badge>` para status de domínio —
 * é o padrão que a Fase 3 (produtos/estoque crítico) e a Fase 4
 * (status de venda) devem reaproveitar em vez de criar cores próprias.
 */
export const Badge: React.FC<BadgeProps> = ({ role, tone, children }) => {
  const resolvedTone = role ? ROLE_TONE[role] : tone ?? 'neutral';
  const label = role ? ROLE_LABEL[role] : children;

  return <span className={`${styles.badge} ${styles[resolvedTone]}`}>{label}</span>;
};
