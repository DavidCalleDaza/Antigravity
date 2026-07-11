import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Download, FilePlus, Eye, FileText, Send, Calendar, Search, X, Loader2 } from 'lucide-react';
import { AiOutlineClear } from "react-icons/ai";
import { billingClient, triggerBlobDownload } from '../../utils/apiClient';
import Helpers from '../../utils/helpers';
import Table from '../../components/ui/Table';
import { useToast } from '../../components/ui/Toast';
import InvoiceForm from './InvoiceForm';
import InvoiceDetail from './InvoiceDetail';
import '../../../css/pages/billing.css';

// Botón de acción por fila
function RowActionButton({ icon: Icon, title, onClick, disabled, reason, iconClass = '', spinning = false }) {
  const [tooltipPos, setTooltipPos] = useState(null);
  const wrapperRef = useRef(null);

  const showTooltip = () => {
    if (!disabled || !reason || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    setTooltipPos({
      top: rect.top,
      left: rect.right,
    });
  };

  const hideTooltip = () => setTooltipPos(null);

  return (
    <span
      ref={wrapperRef}
      className={`billing-action-tooltip ${disabled ? 'billing-action-tooltip--disabled' : ''}`}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
      tabIndex={disabled && reason ? 0 : undefined}
    >
      <button
        type="button"
        className="btn btn-ghost btn-sm btn-icon-only"
        title={disabled ? undefined : title}
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        aria-disabled={disabled}
        aria-label={title}
      >
        <Icon width="14" height="14" className={`${iconClass} ${spinning ? 'spin' : ''}`} />
      </button>

      {tooltipPos && disabled && reason && createPortal(
        <div
          className="billing-action-tooltip-portal"
          style={{
            position: 'fixed',
            top: tooltipPos.top,
            left: tooltipPos.left,
            transform: 'translate(-100%, -130%)',
          }}
        >
          {reason}
        </div>,
        document.body
      )}
    </span>
  );
}

export default function Billing() {
  const toast = useToast();
  
  // Estados de datos
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState({
    income: 0,
    pending: 0,
    overdue: 0,
    credit_notes_total: 0,
    invoice_count: 0,
    balance: 0
  });

  // Para almacenar el producto y servicio más vendidos (#1 de cada uno)
  const [topProduct, setTopProduct] = useState(null);
  const [topService, setTopService] = useState(null);

  // Filtros
  const [filter, setFilter] = useState(''); 
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Modales y vistas
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [invoiceToEdit, setInvoiceToEdit] = useState(null);
  const [loading, setLoading] = useState(false);

  // IDs de facturas cuyo PDF se está generando/descargando en este momento.
  // Se usa para deshabilitar el botón de esa fila y evitar solicitudes duplicadas.
  const [downloadingIds, setDownloadingIds] = useState(() => new Set());
 
  // IDs de facturas cuyo correo se está enviando en este momento.
  const [sendingEmailIds, setSendingEmailIds] = useState(() => new Set());

  // Trigger para forzar la recarga
  const [detailRefreshTrigger, setDetailRefreshTrigger] = useState(0);

  // Reacciona a filtros y también al trigger de recarga para refrescar todo
  useEffect(() => {
    fetchData();
  }, [filter, dateFrom, dateTo, detailRefreshTrigger]);

  // Cálculo alternativo local
  const calculateLocalSummary = (invoiceList) => {
    let income = 0;
    let pending = 0;
    let overdue = 0;
    let credit_notes_total = 0;

    invoiceList.forEach(invoice => {
      const total = parseFloat(invoice.total) || 0;
      if (invoice.status === 'paid') {
        income += total;
      } else if (invoice.status === 'sent' || invoice.status === 'issued') {
        pending += total;
      } else if (invoice.status === 'overdue') {
        overdue += total;
        pending += total; 
      } else if (invoice.status === 'credit_note') {
        credit_notes_total += total;
      }
    });

    return {
      income,
      pending,
      overdue,
      credit_notes_total,
      invoice_count: invoiceList.length,
      balance: income - credit_notes_total
    };
  };

  const fetchData = async () => {
    setLoading(true);
    
    // Parámetros para listado de facturas
    const params = {};
    if (filter) params.status = filter;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;

    // Parámetros para resumen general
    const summaryParams = {};
    if (dateFrom) summaryParams.date_from = dateFrom;
    if (dateTo) summaryParams.date_to = dateTo;

    // Parámetros limpios para destacados (evitando pasar llaves indefinidas)
    const topParams = { limit: 1 };
    if (dateFrom) topParams.date_from = dateFrom;
    if (dateTo) topParams.date_to = dateTo;

    let loadedInvoices = [];

    // 1. Obtener listado de facturas
    try {
      const invoicesList = await billingClient.listInvoices(params);
      loadedInvoices = invoicesList || [];
      setInvoices(loadedInvoices);
    } catch (err) {
      console.error("Error al cargar el listado de facturas:", err);
      toast.error('No se pudo cargar el listado de facturas.');
    }

    // 2. Obtener resumen de caja
    try {
      const summaryData = await billingClient.getSummary(summaryParams);
      if (summaryData) {
        setSummary(summaryData);
      } else {
        throw new Error("No se recibieron datos de totales");
      }
    } catch (err) {
      console.warn("Error en el resumen del servidor. Usando cálculo local alternativo:", err);
      const fallbackSummary = calculateLocalSummary(loadedInvoices);
      setSummary(fallbackSummary);
    }

    // 3. Obtener el top de productos y servicios más vendidos de forma segura
    try {
      const topSellingData = await billingClient.getTopSelling(topParams);
      if (topSellingData) {
        setTopProduct(topSellingData.products?.[0] || null);
        setTopService(topSellingData.services?.[0] || null);
      }
    } catch (err) {
      console.error("Error al cargar productos/servicios destacados:", err);
      setTopProduct(null);
      setTopService(null);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return invoices;

    return invoices.filter(i => {
      const customerName = i.customer_name ? String(i.customer_name).toLowerCase() : '';
      const fullNumber = i.full_number ? String(i.full_number).toLowerCase() : '';
      return customerName.includes(q) || fullNumber.includes(q);
    });
  }, [invoices, searchQuery]);

  const invoicesTotal = useMemo(() => {
    return filteredInvoices.reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
  }, [filteredInvoices]);

  // Contadores dinámicos para rellenar los subtextos de las tarjetas de resumen
  const invoiceCounts = useMemo(() => {
    let paid = 0;
    let pending = 0;
    let voided = 0;

    invoices.forEach(i => {
      if (i.status === 'paid') {
        paid++;
      } else if (i.status === 'sent' || i.status === 'issued' || i.status === 'overdue') {
        pending++;
      } else if (i.status === 'void') {
        voided++;
      }
    });

    return { paid, pending, voided };
  }, [invoices]);

  // Badges
  const statusBadge = (s) => {
    const badges = {
      draft:   { text: 'Borrador',  cls: 'badge-neutral' },
      issued:  { text: 'Emitida',   cls: 'badge-info' },
      sent:    { text: 'Enviada',   cls: 'badge-info' },
      paid:    { text: 'Pagada',    cls: 'badge-success' },
      void:    { text: 'Anulada',   cls: 'badge-neutral' },
      overdue: { text: 'Vencida',   cls: 'badge-danger' },
    };
    const b = badges[s] || { text: s, cls: 'badge-neutral' };
    return <span className={`badge ${b.cls}`}>{b.text}</span>;
  };

  const dianBadge = (ds) => {
    const badges = {
      none: { text: 'Local', cls: 'badge-neutral' },
      pending: { text: 'Enviando...', cls: 'badge-warning' },
      accepted: { text: 'Aceptada', cls: 'badge-success' },
      rejected: { text: 'Rechazada', cls: 'badge-danger' }
    };
    const b = badges[ds] || { text: ds, cls: 'badge-neutral' };
    return <span className={`badge ${b.cls}`}>{b.text}</span>;
  };

  const columns = [
    { key: 'full_number', label: 'Factura', sortable: true, render: (v) => <strong>{v || 'Borrador Sin Número'}</strong> },
    { key: 'customer_name', label: 'Cliente', sortable: true, render: (v) => v || <span className="text-muted italic">Sin Cliente Asignado</span> },
    { key: 'items_count', label: 'Items', sortable: true, render: (v) => <span className="text-secondary">{v || 0}</span> },
    { key: 'total', label: 'Total', sortable: true, render: (v) => Helpers.formatCurrency(v || 0) },
    { key: 'issued_at', label: 'Fecha Emisión', sortable: true, render: (v) => v ? Helpers.formatDate(v) : <span className="text-muted">-</span> },
    { key: 'status', label: 'Estado', sortable: true, render: (v) => statusBadge(v) },
    { key: 'dian_status', label: 'Estado DIAN', sortable: true, render: (v) => dianBadge(v) }
  ];

  const handleEditFromDetail = async (invoice) => {
    try {
      toast.info('Cargando borrador para editar...');
      const fullInvoice = await billingClient.getInvoice(invoice.id);
      setInvoiceToEdit(fullInvoice);
      setShowForm(true); 
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar la factura para editar.');
    }
  };

  // Descarga el PDF de una factura como Blob autenticado, deshabilitando el
  // botón de esa fila mientras se genera para evitar solicitudes duplicadas.
  const handleDownloadPDF = async (row) => {
    if (downloadingIds.has(row.id)) return;

    setDownloadingIds(prev => new Set(prev).add(row.id));
    try {
      const blob = await billingClient.downloadInvoicePDF(row.id);
      const filename = `Factura_${row.full_number || row.id}.pdf`;
      triggerBlobDownload(blob, filename);
    } catch (err) {
      console.error('Error al descargar el PDF de la factura:', err);
      toast.error(err?.message || 'No se pudo generar el PDF de la factura. Intenta nuevamente.');
    } finally {
      setDownloadingIds(prev => {
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
    }
  };

  const handleSendEmail = async (row) => {
    if (sendingEmailIds.has(row.id)) return;

    setSendingEmailIds(prev => new Set(prev).add(row.id));
    try {
      toast.info('Enviando factura por correo...');
      const res = await billingClient.sendInvoiceEmail(row.id);
      res.success ? toast.success(res.message) : toast.error(res.message);
    } catch (err) {
      toast.error(err.message || 'Error al enviar la factura por correo.');
    } finally {
      setSendingEmailIds(prev => {
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
    }
  };

  const tableActions = (row) => {
    if (!row || !row.id) {
      return <span className="text-muted small">Sin ID</span>;
    }

    const isDraft = row.status === 'draft';
    const isVoid = row.status === 'void';
    const isLocalOrNone = !row.dian_status || row.dian_status === 'none';
    const isNotCancelled = row.status !== 'void';

    const canEdit = isDraft;
    const canSendDian = isLocalOrNone && isNotCancelled;
    const isDownloading = downloadingIds.has(row.id);
    const isSendingEmail = sendingEmailIds.has(row.id);
    const hasCustomerEmail = !!row.customer_email;

    const editReason = canEdit
      ? null
      : isVoid
        ? 'No se puede editar una factura anulada.'
        : 'Solo se pueden editar facturas en estado Borrador.';

    const emailReason = hasCustomerEmail
      ? null
      : 'El cliente no tiene un correo electrónico registrado.';

    /*const dianReason = canSendDian
      ? null
      : isVoid
        ? 'No se puede transmitir una factura anulada.'
        : row.dian_status === 'accepted'
          ? 'Esta factura ya fue aceptada por la DIAN.'
          : row.dian_status === 'pending'
            ? 'La factura ya se está transmitiendo a la DIAN.'
            : row.dian_status === 'rejected'
              ? 'La factura fue rechazada por la DIAN; corrígela antes de reintentar.'
              : 'Esta factura no puede transmitirse en su estado actual.';*/

    return (
      <div className="billing-row-actions">
        <RowActionButton
          icon={Eye}
          title="Ver Detalle"
          disabled={false}
          onClick={() => {
            setSelectedInvoiceId(row.id);
            setShowDetail(true);
          }}
        />

        <RowActionButton
          icon={FileText}
          title="Editar Borrador"
          disabled={!canEdit}
          reason={editReason}
          iconClass="text-primary"
          onClick={async () => {
            try {
              const fullInvoice = await billingClient.getInvoice(row.id);
              setInvoiceToEdit(fullInvoice);
              setShowForm(true);
            } catch (err) {
              toast.error('Error al cargar la factura para editar.');
            }
          }}
        />

        <RowActionButton
          icon={isDownloading ? Loader2 : Download}
          title={isDownloading ? 'Generando PDF...' : 'Descargar PDF'}
          disabled={isDownloading}
          reason={isDownloading ? 'Generando el PDF, un momento...' : undefined}
          iconClass="text-secondary"
          spinning={isDownloading}
          onClick={() => handleDownloadPDF(row)}
        />

        <RowActionButton
          icon={isSendingEmail ? Loader2 : Send}
          title={isSendingEmail ? 'Enviando...' : 'Enviar por correo'}
          disabled={isSendingEmail || !hasCustomerEmail}
          reason={isSendingEmail ? 'Enviando el correo, un momento...' : emailReason}
          iconClass="text-gold"
          spinning={isSendingEmail}
          onClick={() => handleSendEmail(row)}
        />
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
    link.setAttribute('download', `Facturacion_${new Date().toISOString().split('T')[0]}.csv`);
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
          <p className="page-description">Administración de Facturación Electrónica</p>
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

     {/* Tarjetas de Resumen */}
      <div className="billing-summary">
        
        {/* Tarjeta 1: Ingresos Netos */}
        <div className="billing-summary-card">
          <div className="billing-summary-label">Ingresos Netos (Pagados)</div>
          <div className="billing-summary-value income">{Helpers.formatCurrency(summary.income)}</div>
          <div className="billing-summary-subtext">
            {invoiceCounts.paid} {invoiceCounts.paid === 1 ? 'Factura cobrada' : 'Facturas cobradas'}
          </div>
        </div>

        {/* Tarjeta 2: Cuentas por Cobrar */}
        <div className="billing-summary-card">
          <div className="billing-summary-label">Cuentas por Cobrar (Pendientes)</div>
          <div className="billing-summary-value pending-color">{Helpers.formatCurrency(summary.pending)}</div>
          <div className="billing-summary-subtext">
            {invoiceCounts.pending} {invoiceCounts.pending === 1 ? 'Factura pendiente' : 'Facturas pendientes'}
          </div>
        </div>

        {/* Tarjeta 3: Notas Crédito */}
        <div className="billing-summary-card">
          <div className="billing-summary-label">Notas Crédito (Ajustes)</div>
          <div className="billing-summary-value expense-color">-{Helpers.formatCurrency(summary.credit_notes_total)}</div>
          <div className="billing-summary-subtext">
            {invoiceCounts.voided} {invoiceCounts.voided === 1 ? 'Factura ajustada' : 'Facturas ajustadas'}
          </div>
        </div>

        {/* Tarjeta 4: Producto más vendido */}
        <div className="billing-summary-card">
          <div className="billing-summary-label">Producto Más Vendido</div>
          {/* Usa exactamente la misma clase base 'billing-summary-value' */}
          <div className="billing-summary-value text-info" title={topProduct?.description}>
            {topProduct ? topProduct.description : 'Sin ventas'}
          </div>
          {topProduct && (
            <div className="billing-summary-subtext">
              {Number(topProduct.total_quantity)} Uds ({Helpers.formatCurrency(topProduct.total_amount)})
            </div>
          )}
        </div>

        {/* Tarjeta 5: Servicio más vendido */}
        <div className="billing-summary-card">
          <div className="billing-summary-label">Servicio Más Vendido</div>
          {/* Usa exactamente la misma clase base 'billing-summary-value' */}
          <div className="billing-summary-value text-warning" title={topService?.description}>
            {topService ? topService.description : 'Sin ventas'}
          </div>
          {topService && (
            <div className="billing-summary-subtext">
              {Number(topService.total_quantity)} Uds ({Helpers.formatCurrency(topService.total_amount)})
            </div>
          )}
        </div>

      </div>

      {/* Barra de Filtros */}
      <div className="billing-filters-bar card-raised">
        <div className="billing-filters-grid">
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
                style={{ paddingRight: searchQuery ? '32px' : '10px' }}
              />
              {searchQuery && (
                <button 
                  type="button" 
                  className="billing-filter-clear-btn"
                  onClick={() => setSearchQuery('')}
                  title="Limpiar búsqueda"
                >
                  <X width="14" height="14" />
                </button>
              )}
            </div>
          </div>
          
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

      {/* Listado de Facturas */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Listado de Facturas</h3>
          <div className="tabs" style={{ border: 'none' }}>
            <button className={`tab ${filter === '' ? 'active' : ''}`} onClick={() => setFilter('')}>Todas</button>
            <button className={`tab ${filter === 'draft' ? 'active' : ''}`} onClick={() => setFilter('draft')}>Borradores</button>
            <button className={`tab ${filter === 'sent' ? 'active' : ''}`} onClick={() => setFilter('sent')}>Enviadas</button>
            <button className={`tab ${filter === 'paid' ? 'active' : ''}`} onClick={() => setFilter('paid')}>Pagadas</button>
            <button className={`tab ${filter === 'overdue' ? 'active' : ''}`} onClick={() => setFilter('overdue')}>Vencidas</button>
            <button className={`tab ${filter === 'void' ? 'active' : ''}`} onClick={() => setFilter('void')}>Anuladas</button>
          </div>
        </div>
        <div className="card-body p-0">
          <Table 
            columns={columns} 
            data={filteredInvoices} 
            actions={tableActions}
            loading={loading}
            footer={({ paginatedData, filteredData, allColsCount }) => {
              const pageTotal = paginatedData.reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
              const grandTotal = filteredData.reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
              return (
                <tr className="table-footer-row">
                  <td colSpan={allColsCount}>
                    <div className="billing-table-footer">
                      <div className="billing-table-footer-left">
                        <span className="billing-table-footer-label">
                          Total página actual: <strong>{Helpers.formatCurrency(pageTotal)}</strong>
                        </span>
                      </div>
                      <div className="billing-table-footer-right">
                        <span className="billing-table-footer-label">
                          Total general ({filteredData.length} {filteredData.length === 1 ? 'factura' : 'facturas'}):
                        </span>
                        <span className="billing-table-footer-value">
                          {Helpers.formatCurrency(grandTotal)}
                        </span>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            }}
          />
        </div>
      </div>
      
      <InvoiceForm 
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setInvoiceToEdit(null);
        }}
        onSave={() => {
          setShowForm(false); 
          setInvoiceToEdit(null);
          fetchData(); 
          setDetailRefreshTrigger(prev => prev + 1); 
        }}
        invoiceToEdit={invoiceToEdit}
      />
      
      <InvoiceDetail 
        key={`${selectedInvoiceId || 'none'}_${detailRefreshTrigger}`}
        isOpen={showDetail}
        onClose={() => {
          setShowDetail(false);
          setSelectedInvoiceId(null);
        }}
        invoiceId={selectedInvoiceId}
        onStatusChange={() => {
          fetchData();
          setDetailRefreshTrigger(prev => prev + 1);
        }}
        onEdit={handleEditFromDetail}
      />
    </div>
  );
}