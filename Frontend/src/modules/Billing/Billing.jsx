import React, { useState, useEffect, useMemo } from 'react';
import { Download, FilePlus, Eye, FileText, Send, Calendar, Search, X } from 'lucide-react';
import { AiOutlineClear } from "react-icons/ai";
import { billingClient } from '../../utils/apiClient';
import Helpers from '../../utils/helpers';
import Table from '../../components/ui/Table';
import { useToast } from '../../components/ui/Toast';
import InvoiceForm from './InvoiceForm';
import InvoiceDetail from './InvoiceDetail';

export default function Billing() {
  const toast = useToast();
  
  // Data states
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState({
    income: 0,
    pending: 0,
    overdue: 0,
    credit_notes_total: 0,
    invoice_count: 0,
    balance: 0
  });

  // Filter states
  const [filter, setFilter] = useState(''); // '' (all), 'draft', 'pending', 'paid', 'overdue', 'cancelled'
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Modals / Drawer states
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [invoiceToEdit, setInvoiceToEdit] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load invoices and summary
  useEffect(() => {
    fetchData();
  }, [filter, dateFrom, dateTo]);

  const fetchData = async () => {
    setLoading(true);
    
    // 1. Construir parámetros limpios para la API (evitando enviar "" si están vacíos)
    const params = {};
      if (filter) params.status = filter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

    const summaryParams = {};
      if (dateFrom) summaryParams.date_from = dateFrom;
      if (dateTo) summaryParams.date_to = dateTo;

    // 2. Cargar Listado de Facturas (Bloque independiente para evitar bloqueos)
    try {
      const invoicesList = await billingClient.listInvoices(params);
      setInvoices(invoicesList || []);
    } catch (err) {
      console.error("Error al cargar el listado de facturas:", err);
      toast.error('No se pudo cargar el listado de facturas.');
    }

    // 3. Cargar Resumen de Importes (Bloque independiente)
    try {
      const summaryData = await billingClient.getSummary(summaryParams);
      if (summaryData) {
        setSummary(summaryData);
      }
    } catch (err) {
      console.error("Error al cargar el resumen de importes:", err);
      // Opcional: mostrar un aviso sutil para el resumen, sin bloquear el listado principal
      toast.error('No se pudo cargar el resumen de totales.');
    } finally {
      setLoading(false);
    }
  };

  // Filtro local 100% seguro contra valores null/undefined en borradores nuevos
  const filteredInvoices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter(i => {
      const customerName = i.customer_name ? String(i.customer_name).toLowerCase() : '';
      const fullNumber = i.full_number ? String(i.full_number).toLowerCase() : '';
      return customerName.includes(q) || fullNumber.includes(q);
    });
  }, [invoices, searchQuery]);

  // Status badges
  const statusBadge = (s) => {
    const badges = {
      //  Traduce status  de la DB
      draft: { text: 'Borrador', cls: 'badge-neutral' },
      issued: { text: 'Emitida', cls: 'badge-success' }, 
      pending: { text: 'Pendiente', cls: 'badge-warning' },
      paid: { text: 'Pagada', cls: 'badge-success' },
      overdue: { text: 'Vencida', cls: 'badge-danger' },
      cancelled: { text: 'Anulada', cls: 'badge-neutral' },
      credit_note: { text: 'Nota Crédito', cls: 'badge-danger' }
    };
    
    const b = badges[s] || { text: s, cls: 'badge-neutral' };
    return <span className={`badge ${b.cls}`}>{b.text}</span>;
  };

  const dianBadge = (ds) => {
    const badges = {

      //  Traduce status  de la DB
      none: { text: 'Local', cls: 'badge-neutral' },
      pending: { text: 'Enviando...', cls: 'badge-warning' },
      accepted: { text: 'Aceptada', cls: 'badge-success' },
      rejected: { text: 'Rechazada', cls: 'badge-danger' }
    };
    const b = badges[ds] || { text: ds, cls: 'badge-neutral' };
    return <span className={`badge ${b.cls}`}>{b.text}</span>;
  };

  /* Soporte para textos alternativos en columnas si el borrador es nuevo y vacío*/
  const columns = [
    { key: 'full_number', label: 'Factura', sortable: true, render: (v) => <strong>{v || 'Borrador Sin Número'}</strong> },
    { key: 'customer_name', label: 'Cliente', sortable: true, render: (v) => v || <span className="text-muted italic">Sin Cliente Asignado</span> },
    { key: 'items_count', label: 'Items', sortable: true, render: (v) => <span className="text-secondary">{v || 0}</span> },
    { key: 'total', label: 'Total', sortable: true, render: (v) => Helpers.formatCurrency(v || 0) },
    { key: 'issued_at', label: 'Fecha Emisión', sortable: true, render: (v) => v ? Helpers.formatDate(v) : <span className="text-muted">-</span> },
    { key: 'status', label: 'Estado', sortable: true, render: (v) => statusBadge(v) },
    { key: 'dian_status', label: 'Estado DIAN', sortable: true, render: (v) => dianBadge(v) }
  ];

  /* Acciones por fila*/

  const tableActions = (row) => {
    // 1. Ayuda al diagnóstico: Puedes ver en la consola qué datos trae cada fila
    console.log("Fila procesada en tableActions:", row);

    // Evitar fallos si row no está definido o no tiene ID
    if (!row || !row.id) {
      return <span className="text-muted small">Sin ID</span>;
    }

    // Comprobar si es borrador (soportando tanto 'draft' como la palabra 'Borrador')
    const isDraft = row.status?.toLowerCase() === 'draft' || row.status === 'Borrador';

    // Comprobar estado DIAN (para mostrar el botón de transmisión si está local/pendiente)
    const isLocalOrNone = 
      !row.dian_status || 
      row.dian_status?.toLowerCase() === 'none' || 
      row.dian_status?.toLowerCase() === 'local';

    const isNotCancelled = row.status?.toLowerCase() !== 'cancelled';

    return (
      <div className="d-flex gap-2">
        {/* Acciones para ver detalles (Disponible para todas) */}
        <button 
          className="btn btn-ghost btn-sm btn-icon-only" 
          title="Ver Detalle"
          onClick={() => {
            setSelectedInvoiceId(row.id);
            setShowDetail(true);
          }}
        >
          <Eye width="14" height="14" />
        </button>

        {/* Acciones para editar borrador (Dinámico por estado) */}
        {isDraft && (
          <button 
            className="btn btn-ghost btn-sm btn-icon-only" 
            title="Editar Borrador"
            onClick={async () => {
              try {
                const fullInvoice = await billingClient.getInvoice(row.id);
                setInvoiceToEdit(fullInvoice);
                setShowForm(true);
              } catch (err) {
                toast.error('Error al cargar la factura para editar.');
              }
            }}
          >
            <FileText width="14" height="14" className="text-primary" />
          </button>
        )}

        {/* Acciones para descargar PDF (Disponible para todas) */}
        <button 
          className="btn btn-ghost btn-sm btn-icon-only" 
          title="Descargar PDF"
          onClick={() => {
            const url = billingClient.getInvoicePDFUrl(row.id);
            window.open(url, '_blank');
          }}
        >
          <Download width="14" height="14" className="text-secondary" />
        </button>

        {/* Acciones para transmitir a DIAN (Dinámico para estados locales/no transmitidos) */}
        {isLocalOrNone && isNotCancelled && (
          <button 
            className="btn btn-ghost btn-sm btn-icon-only" 
            title="Transmitir a DIAN"
            onClick={async () => {
              try {
                toast.info('Transmitiendo factura a la DIAN...');
                const res = await billingClient.sendToDian(row.id);
                if (res.success) {
                  toast.success(res.message);
                } else {
                  toast.error(res.message);
                }
                fetchData();
              } catch (err) {
                toast.error(err.message || 'Error al transmitir a la DIAN.');
              }
            }}
          >
            <Send width="14" height="14" className="text-gold" />
          </button>
        )}
      </div>
    );
  };

  const exportToCSV = () => {
    if (filteredInvoices.length === 0) {
      toast.warning('No hay datos para exportar.');
      return;
    }
    
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Factura,Cliente,Items,Total,Fecha Emision,Estado,Estado DIAN\n';
    
    filteredInvoices.forEach(i => {
      csvContent += `${i.full_number || 'Borrador'},"${i.customer_name || 'Sin Cliente'}",${i.items_count || 0},${i.total || 0},${i.issued_at || ''},${i.status},${i.dian_status}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Facturacion_Servinow_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Reporte CSV descargado con éxito.');
  };

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Facturación</h2>
          <p className="page-description">Resoluciones, facturas de venta, notas crédito e integración con la DIAN</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-outline" onClick={exportToCSV}>
            <Download width="16" height="16" /> 
            Exportar CSV
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => {
              setInvoiceToEdit(null);
              setShowForm(true);
            }}
          >
            <FilePlus width="18" height="18" /> 
            Nueva Factura
          </button>
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div className="billing-summary">
        <div className="billing-summary-card">
          <div className="billing-summary-label">Ingresos Netos (Pagados)</div>
          <div className="billing-summary-value income">{Helpers.formatCurrency(summary.income)}</div>
        </div>
        <div className="billing-summary-card">
          <div className="billing-summary-label">Cuentas por Cobrar (Pendientes)</div>
          <div className="billing-summary-value pending-color">
            {Helpers.formatCurrency(summary.pending)}
          </div>
        </div>
        <div className="billing-summary-card">
          <div className="billing-summary-label">Notas Crédito (Ajustes)</div>
          <div className="billing-summary-value expense-color">
            -{Helpers.formatCurrency(summary.credit_notes_total)}
          </div>
        </div>
      </div>

      {/* BARRA DE FILTROS */}
      <div className="billing-filters-bar card-raised">
        <div className="billing-filters-grid">
          
          {/* Buscar */}
          <div className="billing-filter-group">
            <label className="billing-filter-label">Buscar Factura / Cliente</label>
            <div className="billing-input-wrapper" style={{ position: 'relative' }}>
              <span className="billing-input-icon"><Search width="14" height="14" /></span>
              <input 
                type="text" 
                className="billing-filter-control" 
                placeholder="Ej: SETT-0001 o Juan Perez"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingRight: searchQuery ? '32px' : '10px' }} /* Evita que el texto tape la X */
              />
              {searchQuery && (
                <button 
                  type="button" 
                  className="billing-filter-clear-btn"
                  onClick={() => setSearchQuery('')}
                  title="Limpiar búsqueda"
                >
                  <AiOutlineClear width="14" height="14" />
                </button>
              )}
            </div>
          </div>
          
          {/* Desde Fecha */}
          <div className="billing-filter-group">
            <label className="billing-filter-label">Desde Fecha</label>
            <div className="billing-input-wrapper">
              <span className="billing-input-icon"><Calendar width="14" height="14" /></span>
              <input 
                type="date" 
                className="billing-filter-control" 
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
          </div>

          {/* Hasta Fecha */}
          <div className="billing-filter-group">
            <label className="billing-filter-label">Hasta Fecha</label>
            <div className="billing-input-wrapper">
              <span className="billing-input-icon"><Calendar width="14" height="14" /></span>
              <input 
                type="date" 
                className="billing-filter-control" 
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          {/* Limpiar Filtros */}
          <div className="billing-filter-group action-align">
            <button 
              className="btn btn-outline billing-btn-clear" 
              onClick={() => {
                setDateFrom('');
                setDateTo('');
                setSearchQuery('');
                setFilter('');
              }}
            >
              <AiOutlineClear width="15" height="15" />
              Limpiar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Listado de Facturas</h3>
          <div className="tabs" style={{ border: 'none' }}>
            <button className={`tab ${filter === '' ? 'active' : ''}`} onClick={() => setFilter('')}>Todas</button>
            <button className={`tab ${filter === 'draft' ? 'active' : ''}`} onClick={() => setFilter('draft')}>Borradores</button>
            <button className={`tab ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>Pendientes</button>
            <button className={`tab ${filter === 'paid' ? 'active' : ''}`} onClick={() => setFilter('paid')}>Pagadas</button>
            <button className={`tab ${filter === 'overdue' ? 'active' : ''}`} onClick={() => setFilter('overdue')}>Vencidas</button>
            <button className={`tab ${filter === 'cancelled' ? 'active' : ''}`} onClick={() => setFilter('cancelled')}>Anuladas</button>
          </div>
        </div>
        <div className="card-body p-0">
          <Table 
            columns={columns} 
            data={filteredInvoices} 
            actions={tableActions}
            loading={loading}
          />
        </div>
      </div>

      {/* Form Modal */}
      <InvoiceForm 
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setInvoiceToEdit(null);
        }}
        onSave={() => {
          /* CORREGIDO: Cierra el modal y refresca de inmediato al guardar */
          setShowForm(false); 
          setInvoiceToEdit(null);
          fetchData(); 
        }}
        invoiceToEdit={invoiceToEdit}
      />

      {/* Details Drawer */}
      <InvoiceDetail 
        isOpen={showDetail}
        onClose={() => {
          setShowDetail(false);
          setSelectedInvoiceId(null);
        }}
        invoiceId={selectedInvoiceId}
        onStatusChange={() => {
          fetchData();
        }}
      />
    </div>
  );
}