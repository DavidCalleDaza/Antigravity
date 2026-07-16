import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Download, Send, CheckCircle, AlertTriangle, Clock,
  RefreshCw, FileText, Ban, ArrowLeft, Pencil,  
} from 'lucide-react';
import { BsFillSendArrowUpFill } from "react-icons/bs";
import { billingClient, triggerBlobDownload } from '../../utils/apiClient';
import { useToast } from '../../components/ui/Toast';
import Helpers from '../../utils/helpers';
import '../../../css/pages/InvoiceDetail.css';

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    draft:   { label: 'Borrador',            cls: 'badge--neutral'  },
    issued:  { label: 'Emitida',             cls: 'badge--info'     },
    sent:    { label: 'Enviada / Pendiente', cls: 'badge--warning'  },
    paid:    { label: 'Pagada',              cls: 'badge--success'  },
    void:    { label: 'Anulada',             cls: 'badge--neutral'  },
    overdue: { label: 'Vencida',             cls: 'badge--danger'   },
  };
  const { label, cls } = map[status] ?? { label: status, cls: 'badge--neutral' };
  return <span className={`badge ${cls}`}>{label}</span>;
}

function DianStatusBadge({ dian_status }) {
  const map = {
    none:     { label: 'Sin Emitir (Pruebas)',  icon: <Clock size={12} />,                                   cls: 'badge--neutral'  },
    pending:  { label: 'Enviando…',             icon: <RefreshCw size={12} className="spin" />,              cls: 'badge--warning'  },
    accepted: { label: 'Aceptada por DIAN',     icon: <CheckCircle size={12} />,                             cls: 'badge--success'  },
    rejected: { label: 'Rechazada por DIAN',    icon: <AlertTriangle size={12} />,                           cls: 'badge--danger'   },
  };
  const { label, icon, cls } = map[dian_status] ?? { label: dian_status, icon: null, cls: 'badge--neutral' };
  return (
    <span className={`badge badge--icon ${cls}`}>
      {icon}
      {label}
    </span>
  );
}

function SectionLabel({ children }) {
  return <span className="section-label">{children}</span>;
}

function DianEventIcon({ type }) {
  if (type === 'accepted') return <CheckCircle size={14} className="text-success" />;
  if (type === 'error' || type === 'rejected') return <AlertTriangle size={14} className="text-danger" />;
  return <Clock size={14} className="text-secondary" />;
}

// ─── Main Component ───────────────────────────────────────────────────────────

const DIAN_SUBMISSION_ENABLED = false;

export default function InvoiceDetail({ isOpen, onClose, invoiceId, onStatusChange, onEdit }) {
  const toast = useToast();

  const [invoice,        setInvoice]        = useState(null);
  const [loading,        setLoading]        = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [submittingDian, setSubmittingDian] = useState(false);
  // true mientras el PDF se está generando/descargando; deshabilita el botón
  // para evitar solicitudes duplicadas y muestra un indicador de carga.
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Credit-note form
  const [showCNForm, setShowCNForm] = useState(false);
  const [cnReason,   setCnReason]   = useState('Anulación de factura electrónica');
  const [cnItems,    setCnItems]    = useState([]);

  // ── Data loading ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isOpen && invoiceId) loadInvoiceDetails();
  }, [isOpen, invoiceId]);

  const loadInvoiceDetails = async () => {
    setLoading(true);
    try {
      const data = await billingClient.getInvoice(invoiceId);
      setInvoice(data);
      setCnItems(data.items.map(item => ({
        description: item.description,
        quantity:    parseFloat(item.quantity),
        unit_price:  parseFloat(item.unit_price),
        tax_rate:    parseFloat(item.tax_rate),
      })));
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar detalles de la factura.');
    } finally {
      setLoading(false);
    }
  };

  // ── Action handlers ───────────────────────────────────────────────────────────

 const handleSendToDian = async () => {
    if (!invoice) return;
    setSubmittingDian(true);
    try {
      const result = await billingClient.sendToDian(invoice.id);
      result.success ? toast.success(result.message) : toast.error(result.message);
      await loadInvoiceDetails();
      onStatusChange();
    } catch (err) {
      toast.error(err.message || 'Error en comunicación con la DIAN.');
    } finally {
      setSubmittingDian(false);
    }
  };

  const handleSendEmail = async () => {
    if (!invoice) return;
    setSendingEmail(true);
    try {
      const result = await billingClient.sendInvoiceEmail(invoice.id);
      result.success
        ? toast.success(result.message)
        : toast.error(result.message);
    } catch (err) {
      toast.error(err?.response?.data?.detail || err.message || 'Error al enviar el correo.');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!invoice) return;
    try {
      const updated = await billingClient.markPaid(invoice.id);
      toast.success('Factura marcada como pagada.');
      setInvoice(updated);
      onStatusChange();
    } catch (err) {
      toast.error(err.message || 'Error al actualizar estado.');
    }
  };

  const handleCancelInvoice = async () => {
    if (!invoice) return;
    if (!confirm('¿Está seguro de que desea anular esta factura?')) return;
    try {
      const updated = await billingClient.cancelInvoice(invoice.id);
      toast.success('Factura anulada.');
      setInvoice(updated);
      onStatusChange();
    } catch (err) {
      toast.error(err.message || 'Error al anular factura.');
    }
  };

  const handleCreateCreditNote = async (e) => {
    e.preventDefault();
    if (!invoice) return;
    const payload = {
      invoice_id: invoice.id,
      reason:     cnReason,
      items:      cnItems.map(i => ({
        description: i.description,
        quantity:    parseFloat(i.quantity),
        unit_price:  parseFloat(i.unit_price),
        tax_rate:    parseFloat(i.tax_rate),
      })),
    };
    try {
      setLoading(true);
      await billingClient.createCreditNote(payload);
      toast.success('Nota crédito creada exitosamente.');
      setShowCNForm(false);
      await loadInvoiceDetails();
      onStatusChange();
    } catch (err) {
      toast.error(err.message || 'Error al crear la nota crédito.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!invoice || downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      const blob = await billingClient.downloadInvoicePDF(invoice.id);
      const filename = `Factura_${invoice.full_number || invoice.id}.pdf`;
      triggerBlobDownload(blob, filename);
    } catch (err) {
      console.error('Error al descargar el PDF de la factura:', err);
      toast.error(err?.message || 'No se pudo generar el PDF de la factura. Intenta nuevamente.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleEditInvoice = () => {
    if (!invoice) return;
    if (typeof onEdit === 'function') {
      onEdit(invoice); // Llama a la función de edición en el componente padre
     //onClose();       // Cierra el detalle para que no se superponga con el modal de edición
    } else {
      console.warn('InvoiceDetail: no se proporcionó la prop "onEdit" al componente.');
    }
  };

  const updateCnItemQty = (idx, value) => {
    const updated  = [...cnItems];
    updated[idx]   = { ...updated[idx], quantity: parseFloat(value) || 0 };
    setCnItems(updated);
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  if (!isOpen) return null;

  const canSendToDian  = DIAN_SUBMISSION_ENABLED && invoice?.dian_status === 'none' && invoice?.status !== 'void';
  const canMarkPaid    = invoice?.status === 'sent'          || invoice?.status === 'issued';
  const canVoidDraft   = invoice?.status === 'draft';
  const canCreditNote  = invoice?.dian_status === 'accepted' && invoice?.status !== 'void';
  // Editing is only safe while the invoice hasn't been transmitted to the DIAN yet.
  const canEditInvoice = invoice?.status === 'draft' && invoice?.dian_status === 'none';

  // ── Discount resolution ──────────────────────────────────────────────────────
// El descuento preferencial ya se calcula y persiste en el backend
// (crud.py: _compute_preferred_discount + _distribute_discount_across_items),
// por lo que discount_total ya viene correcto desde la API — no hace falta
// ningún cálculo "estimado" en el frontend.
const displayDiscount = parseFloat(invoice?.discount_total || 0);

  const portalRoot = document.getElementById('invoice-drawer-portal') || document.body;

  console.log('DEBUG DIAN:', {
    dian_status: invoice?.dian_status,
    status: invoice?.status,
    canSendToDian
  });

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      <aside
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          height: '100%',
          width: '90%',
          maxWidth: 750,
          background: 'var(--surface, #fff)',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.18)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          zIndex: 10000,
        }}
        className="invoice-drawer"
      >

        {/* ── Header ── */}
        <header className="invoice-drawer__header">
          <div className="invoice-drawer__title-group">
            <div className="invoice-drawer__title-row">
              <h3 className="invoice-drawer__title">
                {invoice ? `Factura ${invoice.full_number}` : 'Cargando…'}
              </h3>

              {canSendToDian && (
                <button
                  className="btn btn-ghost btn-sm btn-icon-only"
                  onClick={handleSendToDian}
                  disabled={submittingDian}
                  aria-disabled={submittingDian}
                  title={submittingDian ? 'Transmitiendo a la DIAN...' : 'Transmitir factura a la DIAN'}
                  aria-label="Transmitir a la DIAN"
                >
                  {submittingDian
                    ? <RefreshCw size={16} className="spin" />
                    : <BsFillSendArrowUpFill  size={16} />}
                </button>
              )}
            </div>

            {invoice && (
              <div className="invoice-drawer__badges">
                <StatusBadge status={invoice.status} />
                <DianStatusBadge dian_status={invoice.dian_status} />
              </div>
            )}
          </div>

          <button className="drawer-close" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </header>

        {/* ── Body ── */}
        <div className="invoice-drawer__body">

          {/* Loading state */}
          {loading && (
            <div className="invoice-drawer__loading">
              <RefreshCw size={32} className="spin text-gold" />
              <span>Obteniendo información…</span>
            </div>
          )}

          {invoice && !loading && (
            <div className="invoice-detail">

              {/* 1. Action bar */}
              {!showCNForm && (
                <div className="invoice-detail__actions">
                  <button
                    className="btn btn-outline btn-sm btn-icon"
                    onClick={handleDownloadPDF}
                    disabled={downloadingPdf}
                    aria-disabled={downloadingPdf}
                    title={downloadingPdf ? 'Generando PDF...' : 'Descargar PDF'}
                  >
                    {downloadingPdf
                      ? <RefreshCw size={14} className="spin" />
                      : <Download size={14} />}
                    {downloadingPdf ? 'Generando PDF...' : 'Descargar PDF'}
                  </button>

                  {canEditInvoice && (
                    <button className="btn btn-outline btn-sm btn-icon" onClick={handleEditInvoice}>
                      <Pencil size={14} /> Editar
                    </button>
                  )}

                  {invoice.customer?.email && (
                    <button className="btn btn-primary btn-sm btn-icon" onClick={handleSendEmail} disabled={sendingEmail}>
                      <Send size={14} />
                      {sendingEmail ? 'Enviando…' : 'Enviar por correo'}
                    </button>
                  )}

                  {canMarkPaid && (
                    <button className="btn btn-success btn-sm btn-icon" onClick={handleMarkPaid}>
                      <CheckCircle size={14} /> Marcar Pagada
                    </button>
                  )}

                  {canVoidDraft && (
                    <button className="btn btn-ghost btn-sm btn-icon text-danger" onClick={handleCancelInvoice}>
                      <Ban size={14} /> Anular
                    </button>
                  )}

                  {canCreditNote && (
                    <button className="btn btn-outline btn-sm btn-icon text-danger" onClick={() => setShowCNForm(true)}>
                      <FileText size={14} /> Emitir Nota Crédito
                    </button>
                  )}
                </div>
              )}

              {/* 2. Credit-note form */}
              {showCNForm && (
                <div className="credit-note-form">
                  <div className="credit-note-form__header">
                    <span className="credit-note-form__title">
                      <AlertTriangle size={16} /> Nueva Nota Crédito
                    </span>
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowCNForm(false)}>
                      <ArrowLeft size={12} /> Volver
                    </button>
                  </div>

                  <form onSubmit={handleCreateCreditNote} className="credit-note-form__body">
                    <div className="form-group">
                      <label className="form-label">Motivo</label>
                      <select className="form-select" value={cnReason} onChange={e => setCnReason(e.target.value)}>
                        <option value="Anulación de factura electrónica">Anulación total de factura</option>
                        <option value="Devolución parcial de bienes o servicios">Devolución parcial</option>
                        <option value="Rebaja o descuento parcial concedido">Rebaja o descuento</option>
                      </select>
                    </div>

                    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
                      <table className="invoice-table" style={{ minWidth: '450px' }}>
                        <thead>
                          <tr>
                            <th>Descripción</th>
                            <th className="text-right" style={{ width: 80 }}>Cant.</th>
                            <th className="text-right" style={{ width: 120 }}>Precio</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cnItems.map((item, idx) => (
                            <tr key={idx}>
                              <td>{item.description}</td>
                              <td>
                                <input
                                  type="number"
                                  className="form-control form-control--compact text-right"
                                  value={item.quantity}
                                  min="0.01"
                                  max={invoice.items[idx].quantity}
                                  step="any"
                                  onChange={e => updateCnItemQty(idx, e.target.value)}
                                />
                              </td>
                              <td className="text-right">{Helpers.formatCurrency(item.unit_price)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="credit-note-form__footer">
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowCNForm(false)}>
                        Cancelar
                      </button>
                      <button type="submit" className="btn btn-danger btn-sm">
                        Emitir Nota Crédito
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* 3. Client + dates */}
              <div className="invoice-detail__meta-grid">
                <div className="info-card">
                  <SectionLabel>Adquiriente / Receptor</SectionLabel>
                  <strong className="info-card__name">{invoice.customer.business_name}</strong>
                  <span className="info-card__sub">{invoice.customer.id_type}: {invoice.customer.id_number}</span>
                  <div className="info-card__rows">
                    <div><b>Dirección:</b> {invoice.customer.location?.address || 'N/A'}, {invoice.customer.location?.city || 'N/A'}</div>
                    <div><b>Email:</b> {invoice.customer.email}</div>
                  </div>
                </div>

                <div className="info-card">
                  <SectionLabel>Fechas y Condiciones</SectionLabel>
                  <div className="info-card__rows">
                    <div><b>Fecha Emisión:</b> {Helpers.formatDate(invoice.issued_at)}</div>
                    <div><b>Vencimiento:</b>   {invoice.due_date ? Helpers.formatDate(invoice.due_date) : 'Inmediato'}</div>
                    <div><b>Método Pago:</b>   {invoice.payment_method}</div>
                    <div><b>Medio Pago:</b>    Código DIAN {invoice.payment_means}</div>
                  </div>
                </div>
              </div>

              {/* 4. Line items */}
              <div className="invoice-detail__items-card">
                <div className="items-card__header">
                  <h4>Detalles de Factura</h4>
                </div>
                <table className="invoice-table invoice-table--items">
                  <thead>
                    <tr>
                      <th className="col-index">#</th>
                      <th className="col-desc">Descripción</th>
                      <th className="col-qty text-center">Cant.</th>
                      <th className="col-price text-right">Precio</th>
                      <th className="col-tax text-right">IVA %</th>
                      <th className="col-total text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item, idx) => (
                      <tr key={item.id}>
                        <td className="col-index">{idx + 1}</td>
                        <td className="col-desc">
                          {item.code && <strong>[{item.code}] </strong>}
                          {item.description}
                        </td>
                        <td className="col-qty text-center">{parseFloat(item.quantity).toFixed(0)}</td>
                        <td className="col-price text-right">{Helpers.formatCurrency(item.unit_price)}</td>
                        <td className="col-tax text-right">{parseFloat(item.tax_rate).toFixed(0)}%</td>
                        <td className="col-total text-right font-bold">{Helpers.formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 5. Totals + notes + CUFE */}
              <div className="invoice-detail__meta-grid">
                <div className="d-flex flex-column gap-3">
                  {invoice.notes && (
                    <div className="info-card">
                      <SectionLabel>Observaciones</SectionLabel>
                      <p className="info-card__note">{invoice.notes}</p>
                    </div>
                  )}
                  {invoice.cufe && (
                    <div className="info-card info-card--mono">
                      <SectionLabel>CUFE Hash</SectionLabel>
                      <code className="cufe-hash">{invoice.cufe}</code>
                    </div>
                  )}
                </div>

                <div className="totals-card">
                  <div className="totals-card__row">
                    <span>Subtotal</span>
                    <span>{Helpers.formatCurrency(invoice.subtotal)}</span>
                  </div>
                  <div className={`totals-card__row ${displayDiscount > 0 ? 'totals-card__row--discount' : ''}`}>
                    <span>Descuento</span>
                    <span>−{Helpers.formatCurrency(displayDiscount)}</span>
                  </div>
                  <div className="totals-card__row">
                    <span>Base Gravable</span>
                    <span>{Helpers.formatCurrency(invoice.tax_base)}</span>
                  </div>
                  <div className="totals-card__row">
                    <span>IVA (19 %)</span>
                    <span>{Helpers.formatCurrency(invoice.tax_total)}</span>
                  </div>
                  <div className="totals-card__divider" />
                  <div className="totals-card__row totals-card__row--total">
                    <span>Total</span>
                    <span>{Helpers.formatCurrency(invoice.total)}</span>
                  </div>
                </div>
              </div>

              {/* 6. Associated credit notes */}
              {invoice.credit_notes?.length > 0 && (
                <div className="invoice-detail__credit-notes">
                  <div className="credit-notes__header">
                    <h4>Notas Crédito Asociadas</h4>
                  </div>
                  <table className="invoice-table">
                    <thead>
                      <tr>
                        <th>Número</th>
                        <th>Fecha</th>
                        <th>Motivo</th>
                        <th className="text-right">Total Aplicado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.credit_notes.map(cn => (
                        <tr key={cn.id}>
                          <td><strong>{cn.number}</strong></td>
                          <td className="text-secondary">{Helpers.formatDate(cn.created_at)}</td>
                          <td className="text-secondary">{cn.reason}</td>
                          <td className="text-right text-danger font-bold">−{Helpers.formatCurrency(cn.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 7. DIAN event log */}
              {invoice.dian_events?.length > 0 && (
                <div className="info-card">
                  <SectionLabel>Historial de Eventos DIAN</SectionLabel>
                  <ul className="dian-timeline">
                    {invoice.dian_events.map(ev => (
                      <li key={ev.id} className="dian-timeline__item">
                        <div className="dian-timeline__icon">
                          <DianEventIcon type={ev.event_type} />
                        </div>
                        <div className="dian-timeline__content">
                          <div className="dian-timeline__meta">
                            <strong>{ev.event_type.toUpperCase()}</strong>
                            <span className="text-secondary">{Helpers.formatDate(ev.created_at)}</span>
                          </div>
                          {ev.message && <p className="dian-timeline__message">{ev.message}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            </div>
          )}
        </div>
      </aside>
    </div>,
    portalRoot
  );
}