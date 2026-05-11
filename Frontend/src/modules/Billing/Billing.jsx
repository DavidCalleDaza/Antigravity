import React, { useState, useMemo } from 'react';
import { Download, FilePlus, Eye, FileText } from 'lucide-react';
import { APP_CONFIG } from '../../config/appConfig';
import { MockData } from '../../utils/mockData';
import Helpers from '../../utils/helpers';
import Table from '../../components/ui/Table';
import { useToast } from '../../components/ui/Toast';

export default function Billing() {
  const [invoices] = useState([...MockData.invoices]);
  const [filter, setFilter] = useState('');
  const toast = useToast();

  const summary = useMemo(() => {
    const paid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);
    const expenses = 385000; // Static mock expense
    return {
      income: paid,
      expenses,
      balance: paid - expenses
    };
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    return filter ? invoices.filter(i => i.status === filter) : invoices;
  }, [invoices, filter]);

  const statusBadge = (s) => {
    const cls = { paid: 'badge-success', pending: 'badge-warning', overdue: 'badge-danger', cancelled: 'badge-neutral' };
    return <span className={`badge badge-dot ${cls[s]}`}>{APP_CONFIG.INVOICE_STATUS_LABELS[s]}</span>;
  };

  const columns = [
    { key: 'number', label: 'Factura', sortable: true, render: (v) => <strong>{v}</strong> },
    { key: 'client', label: 'Cliente', sortable: true },
    { key: 'items', label: 'Items', sortable: true },
    { key: 'total', label: 'Total', sortable: true, render: (v) => Helpers.formatCurrency(v) },
    { key: 'date', label: 'Fecha', sortable: true, render: (v) => Helpers.formatDate(v) },
    { key: 'status', label: 'Estado', sortable: true, render: (v) => statusBadge(v) }
  ];

  const tableActions = (row) => (
    <div className="d-flex gap-2">
      <button className="btn btn-ghost btn-sm btn-icon-only" title="Ver">
        <Eye width="14" height="14" />
      </button>
      <button className="btn btn-ghost btn-sm btn-icon-only" title="PDF">
        <FileText width="14" height="14" />
      </button>
    </div>
  );

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h2 className="page-title">Facturación</h2>
          <p className="page-description">Gestión de facturas y contabilidad</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-outline">
            <Download width="16" height="16" /> 
            Exportar
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => toast.info('Funcionalidad de creación de factura disponible en la versión completa.')}
          >
            <FilePlus width="18" height="18" /> 
            Nueva Factura
          </button>
        </div>
      </div>

      <div className="billing-summary">
        <div className="billing-summary-card">
          <div className="billing-summary-label">Ingresos del Mes</div>
          <div className="billing-summary-value income">{Helpers.formatCurrency(summary.income)}</div>
        </div>
        <div className="billing-summary-card">
          <div className="billing-summary-label">Gastos del Mes</div>
          <div className="billing-summary-value expense">{Helpers.formatCurrency(summary.expenses)}</div>
        </div>
        <div className="billing-summary-card">
          <div className="billing-summary-label">Balance</div>
          <div className="billing-summary-value balance">{Helpers.formatCurrency(summary.balance)}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Facturas</h3>
          <div className="tabs" style={{ border: 'none' }}>
            <button className={`tab ${filter === '' ? 'active' : ''}`} onClick={() => setFilter('')}>Todas</button>
            <button className={`tab ${filter === 'paid' ? 'active' : ''}`} onClick={() => setFilter('paid')}>Pagadas</button>
            <button className={`tab ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>Pendientes</button>
            <button className={`tab ${filter === 'overdue' ? 'active' : ''}`} onClick={() => setFilter('overdue')}>Vencidas</button>
          </div>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <Table 
            columns={columns} 
            data={filteredInvoices} 
            actions={tableActions}
          />
        </div>
      </div>
    </div>
  );
}
