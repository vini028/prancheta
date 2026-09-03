import React from 'react';
import styles from './AuthLayout.module.css';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const ClipboardIcon = () => (
  <svg 
    viewBox="0 0 24 24" 
    width="28" 
    height="28" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
  </svg>
);

/**
 * Painel esquerdo = identidade + prévia dos módulos (contexto do produto
 * inteiro, não só do formulário). Painel direito = a tarefa. O mesmo
 * layout serve Login e Registro hoje, e qualquer tela de convite/onboarding
 * que entrar em Sprints futuras.
 */
export const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, children, footer }) => (
  <div className={styles.screen}>
    <aside className={styles.brandPanel}>
      <div className={styles.brandMark}>
        <ClipboardIcon />
      </div>
      <h1 className={styles.brandTitle}>Prancheta</h1>
      <p className={styles.brandCopy}>
        Fornecedores, catálogo, estoque e vendas em um único fluxo, com controle de acesso por perfil.
      </p>
      <ul className={styles.moduleList}>
        <li><span className={styles.dot} data-tone="done" />Gestão de Fornecedores e Pedidos de Compra (AC1)</li>
        <li><span className={styles.dot} data-tone="soon" />Produtos, Gestão de Usuários (AC2)</li>
        <li><span className={styles.dot} data-tone="soon" />Clientes e PDV/Vendas (AC3)</li>
        <li><span className={styles.dot} data-tone="soon" />Prova - Avaliação Final</li>
      </ul>
    </aside>

    <section className={styles.formPanel}>
      <div className={styles.formCard}>
        <h2 className={styles.formTitle}>{title}</h2>
        <p className={styles.formSubtitle}>{subtitle}</p>
        {children}
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </section>
  </div>
);