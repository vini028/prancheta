import React from 'react';
import styles from './AuthLayout.module.css';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * Painel esquerdo = identidade + prévia dos módulos (contexto do produto
 * inteiro, não só do formulário). Painel direito = a tarefa. O mesmo
 * layout serve Login e Registro hoje, e qualquer tela de convite/onboarding
 * que entrar em Sprints futuras.
 */
export const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, children, footer }) => (
  <div className={styles.screen}>
    <aside className={styles.brandPanel}>
      <div className={styles.brandMark}>S</div>
      <h1 className={styles.brandTitle}>Simples-ERP</h1>
      <p className={styles.brandCopy}>
        Fornecedores, catálogo, estoque e vendas em um único fluxo, com controle de acesso por perfil.
      </p>
      <ul className={styles.moduleList}>
        <li><span className={styles.dot} data-tone="done" />Acesso e permissões</li>
        <li><span className={styles.dot} data-tone="soon" />Fornecedores — Fase 2</li>
        <li><span className={styles.dot} data-tone="soon" />Produtos e estoque — Fase 3</li>
        <li><span className={styles.dot} data-tone="soon" />Vendas e métricas — Fase 4</li>
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
