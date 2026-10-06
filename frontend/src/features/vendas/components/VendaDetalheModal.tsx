import React from 'react';
import { Badge, Button, Card } from '../../shared/ui';
import type { CheckoutVendaResponse, ItemVendaResponse } from '../types/venda.types';
import { METODO_PAGAMENTO_LABEL } from '../types/venda.types';
import { formatBRL, toCents } from '../lib/vendaCalc';

interface VendaDetalheModalProps {
  venda: CheckoutVendaResponse;
  /** Fecha o modal (botão ao final do conteúdo). */
  onClose?: () => void;
  /** Rótulo do botão de fechar (ex.: "Nova venda" no PDV). Padrão: "Fechar". */
  closeLabel?: string;
}

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const VendaDetalheModal: React.FC<VendaDetalheModalProps> = ({ venda, onClose, closeLabel = 'Fechar' }) => {
  return (
    <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
      <Card title="Dados da transação">
        <dl style={dlStyle}>
          <div style={rowStyle}><dt>Código</dt><dd>#{venda.id}</dd></div>
          <div style={rowStyle}><dt>Data/Hora</dt><dd>{formatDateTime(venda.created_at)}</dd></div>
          <div style={rowStyle}><dt>Vendedor</dt><dd>{venda.vendedor_nome}</dd></div>
          <div style={rowStyle}>
            <dt>Cliente</dt>
            <dd>{venda.cliente_nome ?? 'Cliente não identificado'}</dd>
          </div>
          <div style={rowStyle}>
            <dt>Pagamento</dt>
            <dd>
              {METODO_PAGAMENTO_LABEL[venda.metodo_pagamento]}{' '}
              {(venda.metodo_pagamento === 'DINHEIRO' || venda.metodo_pagamento === 'PIX') && (
                <Badge tone="positive">à vista −5%</Badge>
              )}
            </dd>
          </div>
          {venda.cliente_nome && (
            <div style={rowStyle}>
              <dt>Fidelidade</dt>
              <dd><Badge tone="positive">cliente −5%</Badge></dd>
            </div>
          )}
        </dl>
      </Card>

      <Card title={`Produtos (${venda.itens.length})`}>
        <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
          {venda.itens.map((item: ItemVendaResponse) => (
            <div key={item.produto_id} style={itemRowStyle}>
              <div>
                <div style={{ fontWeight: 600 }}>{item.produto_nome}</div>
                <div style={mutedStyle}>
                  {item.quantidade} × {formatBRL(toCents(item.preco_unitario))}
                </div>
              </div>
              <span style={{ fontWeight: 600 }}>{formatBRL(toCents(item.subtotal))}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Valores">
        <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
          <div style={totalRowStyle}>
            <span>Subtotal</span>
            <span>{formatBRL(toCents(venda.subtotal))}</span>
          </div>
          <div style={totalRowStyle}>
            <span>Desconto cliente (5%)</span>
            <span>−{formatBRL(toCents(venda.desconto_cliente))}</span>
          </div>
          <div style={totalRowStyle}>
            <span>Desconto à vista (5%)</span>
            <span>−{formatBRL(toCents(venda.desconto_pagamento))}</span>
          </div>
          <div style={totalRowStyle}>
            <span>Desconto total</span>
            <span>−{formatBRL(toCents(venda.desconto_total))}</span>
          </div>
          <div style={{ ...totalRowStyle, fontWeight: 700, fontSize: 'var(--text-lg)' }}>
            <span>Valor final</span>
            <span>{formatBRL(toCents(venda.valor_final))}</span>
          </div>
        </div>
      </Card>

      {onClose && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>
            {closeLabel}
          </Button>
        </div>
      )}
    </div>
  );
};

const dlStyle: React.CSSProperties = {
  display: 'grid',
  gap: 'var(--space-2)',
  margin: 0,
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 'var(--space-3)',
  fontSize: 'var(--text-sm)',
};

const totalRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 'var(--space-3)',
};

const itemRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 'var(--space-3)',
  padding: 'var(--space-2) 0',
  borderBottom: '1px solid var(--border)',
};

const mutedStyle: React.CSSProperties = {
  fontSize: 'var(--text-xs)',
  color: 'var(--text-muted)',
};
