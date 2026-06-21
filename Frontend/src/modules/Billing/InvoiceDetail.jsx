import React, { useState, useEffect } from 'react';
import { 
  X, Download, Send, CheckCircle, AlertTriangle, Clock, 
  RefreshCw, FileText, Ban, Trash2, ArrowLeft 
} from 'lucide-react';
import { billingClient } from '../../utils/apiClient';
import { useToast } from '../../components/ui/Toast';
import Helpers from '../../utils/helpers';

export default function InvoiceDetail({ isOpen, onClose, invoiceId, onStatusChange }) {
  const toast = useToast();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submittingDian, setSubmittingDian] = useState(false);
  
  // Credit note state
  const [showCreditNoteForm, setShowCreditNoteForm] = useState(false);
  const [cnReason, setCnReason] = useState('Anulación de factura electrónica');
  const [cnItems, setCnItems] = useState([]);

  // Fetch invoice details
  useEffect(() => {
    if (isOpen && invoiceId) {
      loadInvoiceDetails();
    }
  }, [isOpen, invoiceId]);

  const loadInvoiceDetails = async () => {
    setLoading(true);
    try {
      const data = await billingClient.getInvoice(invoiceId);
      setInvoice(data);
      // Pre-fill credit note items
      setCnItems(data.items.map(item => ({
        description: item.description,
        quantity: parseFloat(item.quantity),
        unit_price: parseFloat(item.unit_price),
        tax_rate: parseFloat(item.tax_rate)
      })));
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar detalles de la factura.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendToDian = async () => {
    if (!invoice) return;
    setSubmittingDian(true);
    try {
      const result = await billingClient.sendToDian(invoice.id);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
      // Reload details
      await loadInvoiceDetails();
      onStatusChange();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Error en comunicación con la DIAN.');
    } finally {
      setSubmittingDian(false);
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
      reason: cnReason,
      items: cnItems.map(i => ({
        description: i.description,
        quantity: parseFloat(i.quantity),
        unit_price: parseFloat(i.unit_price),
        tax_rate: parseFloat(i.tax_rate)
      }))
    };

    try {
      setLoading(true);
      await billingClient.createCreditNote(payload);
      toast.success('Nota crédito creada exitosamente.');
      setShowCreditNoteForm(false);
      await loadInvoiceDetails();
      onStatusChange();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Error al crear la nota crédito.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!invoice) return;
    const url = billingClient.getInvoicePDFUrl(invoice.id);
    window.open(url, '_blank');
  };

  // Status badges helpers
  const getInvoiceStatusBadge = (status) => {
    const badges = {
      draft: { text: 'Borrador', cls: 'badge-neutral' },
      pending: { text: 'Pendiente de Pago', cls: 'badge-warning' },
      paid: { text: 'Pagada', cls: 'badge-success' },
      overdue: { text: 'Vencida', cls: 'badge-danger' },
      cancelled: { text: 'Anulada', cls: 'badge-neutral' },
      credit_note: { text: 'Nota Crédito Aplicada', cls: 'badge-danger' }
    };
    const b = badges[status] || { text: status, cls: 'badge-neutral' };
    return <span className={`badge ${b.cls}`}>{b.text}</span>;
  };

  const getDianStatusBadge = (dian_status) => {
    const badges = {
      none: { text: 'Sin Emitir (Pruebas)', icon: <Clock width="12" height="12" />, cls: 'badge-neutral' },
      pending: { text: 'Enviando...', icon: <RefreshCw width="12" height="12" className="animate-spin" />, cls: 'badge-warning' },
      accepted: { text: 'Aceptada por DIAN', icon: <CheckCircle width="12" height="12" />, cls: 'badge-success' },
      rejected: { text: 'Rechazada por DIAN', icon: <AlertTriangle width="12" height="12" />, cls: 'badge-danger' }
    };
    const b = badges[dian_status] || { text: dian_status, icon: null, cls: 'badge-neutral' };
    return (
      <span className={`badge ${b.cls} d-inline-flex align-items-center gap-1`}>
        {b.icon}
        {b.text}
      </span>
    );
  };

  if (!isOpen) return null;

  return (
    <div className={`drawer-overlay ${isOpen ? 'active' : ''}`} onClick={onClose} style={{ zIndex: 1050 }}>
      <aside 
        className={`drawer drawer-right ${isOpen ? 'open' : ''}`} 
        onClick={(e) => e.stopPropagation()}
        style={{ width: '90%', maxWidth: '750px', zIndex: 1051, overflowY: 'auto' }}
      >
        
        {/* Header */}
        <div className="drawer-header" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="d-flex justify-content-between align-items-center w-100">
            <div>
              <h3 className="drawer-title">
                {invoice ? `Factura ${invoice.full_number}` : 'Cargando Detalles...'}
              </h3>
              {invoice && (
                <div className="d-flex gap-2 mt-1">
                  {getInvoiceStatusBadge(invoice.status)}
                  {getDianStatusBadge(invoice.dian_status)}
                </div>
              )}
            </div>
            <button className="drawer-close" onClick={onClose}>
              <X width="20" height="20" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="drawer-body p-5">
          {loading && (
            <div className="d-flex flex-column justify-content-center align-items-center py-6 gap-3">
              <RefreshCw width="32" height="32" className="animate-spin text-gold" />
              <span className="text-secondary text-sm">Obteniendo información...</span>
            </div>
          )}

          {invoice && !loading && (
            <div className="d-flex flex-column gap-5">
              
              {/* Actions Quickbar */}
              {!showCreditNoteForm && (
                <div className="d-flex flex-wrap gap-2 p-3" style={{ background: 'var(--surface-raised)', borderRadius: 'var(--radius-lg)', border: 'var(--border)' }}>
                  <button className="btn btn-outline btn-sm btn-icon gap-1" onClick={handleDownloadPDF}>
                    <Download width="14" height="14" />
                    Descargar PDF
                  </button>
                  
                  {invoice.dian_status === 'none' && invoice.status !== 'cancelled' && (
                    <button 
                      className="btn btn-primary btn-sm btn-icon gap-1" 
                      onClick={handleSendToDian}
                      disabled={submittingDian}
                    >
                      <Send width="14" height="14" />
                      {submittingDian ? 'Transmitiendo...' : 'Transmitir DIAN'}
                    </button>
                  )}

                  {invoice.status === 'pending' && (
                    <button className="btn btn-success btn-sm btn-icon gap-1" onClick={handleMarkPaid}>
                      <CheckCircle width="14" height="14" />
                      Marcar Pagada
                    </button>
                  )}

                  {invoice.status === 'draft' && (
                    <button className="btn btn-ghost btn-sm btn-icon gap-1 text-danger" onClick={handleCancelInvoice}>
                      <Ban width="14" height="14" />
                      Anular Borrador
                    </button>
                  )}

                  {invoice.dian_status === 'accepted' && invoice.status !== 'credit_note' && (
                    <button 
                      className="btn btn-outline btn-sm btn-icon gap-1 text-danger" 
                      onClick={() => setShowCreditNoteForm(true)}
                    >
                      <FileText width="14" height="14" />
                      Emitir Nota Crédito
                    </button>
                  )}
                </div>
              )}

              {/* CREDIT NOTE FORM */}
              {showCreditNoteForm && (
                <div className="card-raised p-4 d-flex flex-column gap-3 mb-3" style={{ background: 'var(--surface-raised)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--danger)' }}>
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="font-bold text-danger d-flex align-items-center gap-1">
                      <AlertTriangle width="16" height="16" />
                      Nueva Nota Crédito (Ajuste)
                    </span>
                    <button className="btn btn-ghost btn-sm btn-icon gap-1" onClick={() => setShowCreditNoteForm(false)}>
                      <ArrowLeft width="12" height="12" /> Volver
                    </button>
                  </div>

                  <form onSubmit={handleCreateCreditNote} className="d-flex flex-column gap-3">
                    <div className="form-group">
                      <label className="form-label">Motivo de Nota Crédito</label>
                      <select className="form-select" value={cnReason} onChange={(e) => setCnReason(e.target.value)}>
                        <option value="Anulación de factura electrónica">Anulación total de factura</option>
                        <option value="Devolución parcial de bienes o servicios">Devolución parcial</option>
                        <option value="Rebaja o descuento parcial concedido">Rebaja o descuento</option>
                      </select>
                    </div>

                    <table className="table" style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th>Descripción</th>
                          <th style={{ width: '80px', textAlign: 'right' }}>Cant.</th>
                          <th style={{ width: '120px', textAlign: 'right' }}>Precio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cnItems.map((item, idx) => (
                          <tr key={idx}>
                            <td>{item.description}</td>
                            <td>
                              <input 
                                type="number" 
                                className="form-control text-sm text-right"
                                style={{ padding: '2px 4px', height: '28px' }}
                                value={item.quantity}
                                min="0.01"
                                max={invoice.items[idx].quantity}
                                step="any"
                                onChange={(e) => {
                                  const updated = [...cnItems];
                                  updated[idx].quantity = parseFloat(e.target.value) || 0;
                                  setCnItems(updated);
                                }}
                              />
                            </td>
                            <td className="text-right">{Helpers.formatCurrency(item.unit_price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="d-flex gap-2 justify-content-end mt-2">
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowCreditNoteForm(false)}>
                        Cancelar
                      </button>
                      <button type="submit" className="btn btn-danger btn-sm">
                        Emitir Nota Crédito
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Client Info & Dates */}
              <div className="grid grid-2 gap-4">
                <div className="card-raised p-4 d-flex flex-column gap-2" style={{ background: 'var(--surface-raised)', borderRadius: 'var(--radius-lg)', border: 'var(--border)' }}>
                  <span className="font-bold text-xs text-primary uppercase tracking-wider">Adquiriente / Receptor</span>
                  <div>
                    <strong className="text-sm block">{invoice.customer.business_name}</strong>
                    <span className="text-xs text-secondary">{invoice.customer.id_type}: {invoice.customer.id_number}</span>
                  </div>
                  <div className="text-xs text-secondary mt-1">
                    <div><b>Dirección:</b> {invoice.customer.address || 'N/A'}, {invoice.customer.city}</div>
                    <div><b>Email:</b> {invoice.customer.email}</div>
                  </div>
                </div>

                <div className="card-raised p-4 d-flex flex-column gap-2" style={{ background: 'var(--surface-raised)', borderRadius: 'var(--radius-lg)', border: 'var(--border)' }}>
                  <span className="font-bold text-xs text-primary uppercase tracking-wider">Fechas y Condiciones</span>
                  <div className="text-xs text-secondary">
                    <div><b>Fecha Emisión:</b> {Helpers.formatDate(invoice.issued_at)}</div>
                    <div><b>Vencimiento:</b> {invoice.due_date ? Helpers.formatDate(invoice.due_date) : 'Inmediato'}</div>
                    <div><b>Método Pago:</b> {invoice.payment_method}</div>
                    <div><b>Medio Pago:</b> Código DIAN {invoice.payment_means}</div>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="card p-0" style={{ border: 'var(--border)' }}>
                <div className="card-header py-3 px-4">
                  <h4 className="card-title text-sm">Detalles de Factura</h4>
                </div>
                <div className="card-body p-0">
                  <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '8px 12px', fontSize: 'var(--text-xs)' }}>Item</th>
                        <th style={{ padding: '8px 12px', fontSize: 'var(--text-xs)' }}>Descripción</th>
                        <th style={{ padding: '8px 12px', fontSize: 'var(--text-xs)', textAlign: 'right' }}>Cant.</th>
                        <th style={{ padding: '8px 12px', fontSize: 'var(--text-xs)', textAlign: 'right' }}>Precio</th>
                        <th style={{ padding: '8px 12px', fontSize: 'var(--text-xs)', textAlign: 'right' }}>IVA %</th>
                        <th style={{ padding: '8px 12px', fontSize: 'var(--text-xs)', textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.items.map((item, idx) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '8px 12px', fontSize: 'var(--text-sm)' }}>{idx + 1}</td>
                          <td style={{ padding: '8px 12px', fontSize: 'var(--text-sm)' }}>
                            <strong>{item.code ? `[${item.code}] ` : ''}</strong>
                            {item.description}
                          </td>
                          <td style={{ padding: '8px 12px', fontSize: 'var(--text-sm)', textAlign: 'right' }}>{parseFloat(item.quantity).toFixed(0)}</td>
                          <td style={{ padding: '8px 12px', fontSize: 'var(--text-sm)', textAlign: 'right' }}>{Helpers.formatCurrency(item.unit_price)}</td>
                          <td style={{ padding: '8px 12px', fontSize: 'var(--text-sm)', textAlign: 'right' }}>{parseFloat(item.tax_rate).toFixed(0)}%</td>
                          <td style={{ padding: '8px 12px', fontSize: 'var(--text-sm)', textAlign: 'right', fontWeight: 'bold' }}>{Helpers.formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals & Notes */}
              <div className="grid grid-2 gap-4">
                <div className="d-flex flex-column gap-2">
                  {invoice.notes && (
                    <div className="p-3" style={{ background: 'var(--surface-raised)', borderRadius: 'var(--radius-lg)', border: 'var(--border)' }}>
                      <span className="font-bold text-xs text-secondary uppercase block mb-1">Observaciones</span>
                      <p className="text-xs text-secondary m-0">{invoice.notes}</p>
                    </div>
                  )}

                  {invoice.cufe && (
                    <div className="p-3" style={{ background: 'var(--surface-raised)', borderRadius: 'var(--radius-lg)', border: 'var(--border)', wordBreak: 'break-all' }}>
                      <span className="font-bold text-xs text-secondary uppercase block mb-1">CUFE Hash</span>
                      <code className="text-xs color-secondary" style={{ fontSize: '10px' }}>{invoice.cufe}</code>
                    </div>
                  )}
                </div>

                <div className="p-4 d-flex flex-column gap-2" style={{ background: 'var(--surface-raised)', borderRadius: 'var(--radius-lg)', border: 'var(--border)', height: 'fit-content' }}>
                  <div className="d-flex justify-content-between text-xs text-secondary">
                    <span>Subtotal:</span>
                    <span>{Helpers.formatCurrency(invoice.subtotal)}</span>
                  </div>
                  {parseFloat(invoice.discount_total) > 0 && (
                    <div className="d-flex justify-content-between text-xs text-danger">
                      <span>Descuento:</span>
                      <span>-{Helpers.formatCurrency(invoice.discount_total)}</span>
                    </div>
                  )}
                  <div className="d-flex justify-content-between text-xs text-secondary">
                    <span>Base Gravable:</span>
                    <span>{Helpers.formatCurrency(invoice.tax_base)}</span>
                  </div>
                  <div className="d-flex justify-content-between text-xs text-secondary">
                    <span>IVA (19%):</span>
                    <span>{Helpers.formatCurrency(invoice.tax_total)}</span>
                  </div>
                  <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />
                  <div className="d-flex justify-content-between font-bold text-sm">
                    <span className="text-primary">Total:</span>
                    <span className="text-gold">{Helpers.formatCurrency(invoice.total)}</span>
                  </div>
                </div>
              </div>

              {/* Credit Notes Associated */}
              {invoice.credit_notes && invoice.credit_notes.length > 0 && (
                <div className="card p-0 mt-2" style={{ border: '1px solid var(--danger)' }}>
                  <div className="card-header py-2 px-4" style={{ background: 'rgba(239, 68, 68, 0.05)' }}>
                    <h4 className="card-title text-sm text-danger font-bold">Notas Crédito Asociadas</h4>
                  </div>
                  <div className="card-body p-0">
                    <table className="table w-100">
                      <thead>
                        <tr>
                          <th>Número</th>
                          <th>Fecha</th>
                          <th>Motivo</th>
                          <th style={{ textAlign: 'right' }}>Total Aplicado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoice.credit_notes.map(cn => (
                          <tr key={cn.id}>
                            <td><strong>{cn.number}</strong></td>
                            <td className="text-xs text-secondary">{Helpers.formatDate(cn.created_at)}</td>
                            <td className="text-xs text-secondary">{cn.reason}</td>
                            <td className="text-right text-danger font-bold">-{Helpers.formatCurrency(cn.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* DIAN Timeline Log */}
              {invoice.dian_events && invoice.dian_events.length > 0 && (
                <div className="card-raised p-4 d-flex flex-column gap-3" style={{ background: 'var(--surface-raised)', borderRadius: 'var(--radius-lg)', border: 'var(--border)' }}>
                  <span className="font-bold text-xs text-primary uppercase tracking-wider">Historial de Eventos DIAN</span>
                  <div className="timeline d-flex flex-column gap-3">
                    {invoice.dian_events.map(ev => (
                      <div key={ev.id} className="timeline-item d-flex gap-3 text-xs">
                        <div className="timeline-badge" style={{ marginTop: '2px' }}>
                          {ev.event_type === 'accepted' ? (
                            <CheckCircle width="14" height="14" className="text-success" />
                          ) : ev.event_type === 'error' || ev.event_type === 'rejected' ? (
                            <AlertTriangle width="14" height="14" className="text-danger" />
                          ) : (
                            <Clock width="14" height="14" className="text-secondary" />
                          )}
                        </div>
                        <div className="timeline-content flex-grow-1">
                          <div className="d-flex justify-content-between">
                            <strong>{ev.event_type.toUpperCase()}</strong>
                            <span className="text-secondary">{Helpers.formatDate(ev.created_at)}</span>
                          </div>
                          {ev.message && <p className="text-secondary m-0 mt-1">{ev.message}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

      </aside>
    </div>
  );
}
