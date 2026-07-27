import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "../../css/pages/VerifyPublic.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const STATUS_LABELS = {
  draft: { label: "Borrador", tone: "neutral" },
  issued: { label: "Emitida", tone: "info" },
  accepted: { label: "Aceptada", tone: "success" },
  void: { label: "Anulada / Rechazada", tone: "danger" },
};

export default function VerifyPublic() {
  const { cufe } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchInvoice() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/api/v1/verify/${cufe}`);
        if (!res.ok) {
          throw new Error(
            res.status === 404 ? "Factura no encontrada" : "Error al consultar la factura"
          );
        }
        const data = await res.json();
        if (!cancelled) setInvoice(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchInvoice();
    return () => {
      cancelled = true;
    };
  }, [cufe]);

  if (loading) {
    return (
      <div className="verify-page">
        <div className="verify-card">
          <p className="verify-loading">Verificando factura…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="verify-page">
        <div className="verify-card verify-card--error">
          <h1 className="verify-title">No se pudo verificar</h1>
          <p className="verify-error">{error}</p>
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[invoice.estado] || { label: invoice.estado, tone: "neutral" };

  return (
    <div className="verify-page">
      <div className="verify-card">
        <div className="verify-header">
          <span className="verify-badge">✅ Documento verificado</span>
          <h1 className="verify-title">{invoice.numero}</h1>
        </div>

        <div className={`verify-status verify-status--${statusInfo.tone}`}>
          {statusInfo.label}
        </div>

        <dl className="verify-details">
          <div className="verify-row">
            <dt>Empresa emisora</dt>
            <dd>{invoice.empresa}</dd>
          </div>
          <div className="verify-row">
            <dt>Cliente</dt>
            <dd>{invoice.cliente}</dd>
          </div>
          <div className="verify-row">
            <dt>Fecha</dt>
            <dd>{new Date(invoice.fecha).toLocaleDateString("es-CO")}</dd>
          </div>
          <div className="verify-row">
            <dt>Total</dt>
            <dd className="verify-total">
              ${Number(invoice.total).toLocaleString("es-CO", { minimumFractionDigits: 2 })}
            </dd>
          </div>
          {invoice.estado_dian && (
            <div className="verify-row">
              <dt>Estado DIAN</dt>
              <dd>{invoice.estado_dian}</dd>
            </div>
          )}
        </dl>

        <div className="verify-actions">
          <a
            className="verify-btn verify-btn--primary"
            href={`${API_BASE}${invoice.pdf_url}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            📄 Descargar PDF
          </a>
          <a
            className="verify-btn verify-btn--secondary"
            href={`${API_BASE}${invoice.xml_url}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            🧾 Descargar XML
          </a>
        </div>

        <p className="verify-footer">
          Este documento fue verificado a través del portal público de Servinow.
        </p>
      </div>
    </div>
  );
}
