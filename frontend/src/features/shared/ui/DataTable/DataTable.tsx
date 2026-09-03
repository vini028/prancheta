import React, { useMemo, useState } from 'react';
import { Input } from '../Input/Input';
import styles from './DataTable.module.css';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  /** Colunas de dado quantitativo (preço, estoque, código) ficam em mono. */
  numeric?: boolean;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  searchPlaceholder?: string;
  searchKeys?: Array<keyof T>;
  loading?: boolean;
  emptyTitle?: string;
  emptyHint?: string;
  rowActions?: (row: T) => React.ReactNode;
}

/**
 * Tabela reutilizável: busca client-side + estado de carregamento +
 * estado vazio embutidos. É o componente que Fornecedores (Fase 2),
 * Produtos (Fase 3) e Clientes/Vendas (Fase 4) devem usar para listagem
 * em vez de recriar `<table>` a cada módulo — só trocam `columns`.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  searchPlaceholder = 'Buscar...',
  searchKeys,
  loading,
  emptyTitle = 'Nada por aqui ainda',
  emptyHint,
  rowActions,
}: DataTableProps<T>) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query || !searchKeys?.length) return rows;
    const q = query.toLowerCase();
    return rows.filter((row) =>
      searchKeys.some((key) => String(row[key] ?? '').toLowerCase().includes(q))
    );
  }, [rows, query, searchKeys]);

  return (
    <div className={styles.wrapper}>
      {searchKeys && (
        <div className={styles.toolbar}>
          <Input
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            fullWidth
          />
        </div>
      )}

      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} style={{ width: col.width }} className={col.numeric ? styles.numericHead : ''}>
                  {col.header}
                </th>
              ))}
              {rowActions && <th className={styles.actionsHead}>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={`skeleton-${i}`}>
                  <td colSpan={columns.length + (rowActions ? 1 : 0)}>
                    <div className={styles.skeletonRow} />
                  </td>
                </tr>
              ))}

            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={columns.length + (rowActions ? 1 : 0)}>
                  <div className={styles.emptyState}>
                    <strong>{emptyTitle}</strong>
                    {emptyHint && <span>{emptyHint}</span>}
                  </div>
                </td>
              </tr>
            )}

            {!loading &&
              filtered.map((row) => (
                <tr key={getRowId(row)}>
                  {columns.map((col) => (
                    <td key={col.key} className={col.numeric ? `${styles.numericCell} data` : ''}>
                      {col.render(row)}
                    </td>
                  ))}
                  {rowActions && <td className={styles.actionsCell}>{rowActions(row)}</td>}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
