import React from 'react';
import styles from './StatCard.module.css';

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: 'neutral' | 'positive' | 'warning' | 'danger';
  icon?: React.ReactNode;
}

/**
 * Cartão de métrica para o Painel. O valor é sempre renderizado em mono
 * tabular (`.data`) — é a mesma convenção numérica usada em toda a app.
 * Alimenta hoje placeholders; a partir da Fase 4, consome
 * `GET /api/dashboard/metrics` (total de vendas, faturamento, estoque
 * crítico) sem trocar de componente.
 */
export const StatCard: React.FC<StatCardProps> = ({ label, value, hint, tone = 'neutral', icon }) => (
  <div className={styles.card}>
    <div className={styles.top}>
      <span className={styles.label}>{label}</span>
      {icon && <span className={`${styles.icon} ${styles[tone]}`}>{icon}</span>}
    </div>
    <span className={`${styles.value} data`}>{value}</span>
    {hint && <span className={styles.hint}>{hint}</span>}
  </div>
);
