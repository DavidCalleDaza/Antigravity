import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "../../css/pages/ConfirmMention.css";
import { getApiBaseUrl } from "../utils/urlHelper";

export default function ConfirmMention() {
  const { token } = useParams();
  const [mention, setMention] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchMention() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${getApiBaseUrl()}/public/wall/mentions/${token}`);
        if (!res.ok) {
          throw new Error(
            res.status === 404
              ? "Este enlace ya no es válido o ya fue utilizado."
              : "Error al consultar la mención"
          );
        }
        const data = await res.json();
        if (!cancelled) setMention(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchMention();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const respond = async (action) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/public/wall/mentions/${token}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "No se pudo procesar tu respuesta");
      }
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="confirm-page">
        <div className="confirm-card">
          <p className="confirm-loading">Consultando mención…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="confirm-page">
        <div className="confirm-card confirm-card--error">
          <h1 className="confirm-title">No se pudo procesar</h1>
          <p className="confirm-error">{error}</p>
        </div>
      </div>
    );
  }

  const isDone = Boolean(result) || mention.status !== "pending";

  return (
    <div className="confirm-page">
      <div className="confirm-card">
        {isDone ? (
          <>
            <div className="confirm-header">
              <span className={`confirm-badge confirm-badge--${result?.status || mention.status}`}>
                {result
                  ? result.status === "confirmed" ? "✓ Mención confirmada" : "✗ Mención rechazada"
                  : mention.status === "confirmed"
                    ? "✓ Ya confirmaste esta mención"
                    : "Este enlace ya fue utilizado"}
              </span>
              <h1 className="confirm-title">
                {result
                  ? result.status === "confirmed"
                    ? "¡Gracias por tu confianza!"
                    : "Entendido, gracias por avisar"
                  : "Mención registrada"}
              </h1>
            </div>
            <p className="confirm-text">
              Tu decisión ya quedó registrada. El negocio que mencionó tu empresa fue notificado.
            </p>
          </>
        ) : (
          <>
            <div className="confirm-header">
              <span className="confirm-badge confirm-badge--pending">✉ Mención pendiente</span>
              <h1 className="confirm-title">¿Aparece tu negocio en el Muro de Impacto?</h1>
            </div>

            <div className="confirm-mention-details">
              <div className="confirm-row">
                <span className="confirm-row-label">Negocio</span>
                <span className="confirm-row-value">{mention.business_name || mention.trade_name || "Tu negocio"}</span>
              </div>
              <div className="confirm-row">
                <span className="confirm-row-label">Publicado por</span>
                <span className="confirm-row-value">{mention.author_name}</span>
              </div>
              <div className="confirm-row">
                <span className="confirm-row-label">Publicación</span>
                <span className="confirm-row-value confirm-row-snippet">“{mention.post_snippet}”</span>
              </div>
            </div>

            <p className="confirm-text">
              {mention.business_name || mention.trade_name
                ? `${mention.business_name || mention.trade_name} aparecería públicamente junto a esta publicación.`
                : "Tu negocio aparecería públicamente junto a esta publicación."}
              {" "}Solo se muestra la información que tú confirmes.
            </p>

            <div className="confirm-actions">
              <button
                className="confirm-btn confirm-btn--decline"
                onClick={() => respond("decline")}
                disabled={submitting}
              >
                Prefiero no aparecer
              </button>
              <button
                className="confirm-btn confirm-btn--confirm"
                onClick={() => respond("confirm")}
                disabled={submitting}
              >
                {submitting ? "Guardando…" : "Confirmar mención"}
              </button>
            </div>

            {error && <p className="confirm-error">{error}</p>}
          </>
        )}

        <p className="confirm-footer">Este enlace es personal y de un solo uso.</p>
      </div>
    </div>
  );
}
