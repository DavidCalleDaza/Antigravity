import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, Users, Package, FileText, Loader2, RefreshCw, Save } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { tokensClient } from '../../utils/apiClient';
import '../../../css/pages/TokensAdmin.css';

const formatCOP = (value) =>
  Number(value || 0).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const GROUP_TABS = [
  { key: 'user', label: 'Por usuario', icon: Users },
  { key: 'customer', label: 'Por cliente', icon: Package },
  { key: 'post', label: 'Por publicación', icon: FileText },
];

export default function TokensAdmin() {
  const [groupBy, setGroupBy] = useState('user');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hourly, setHourly] = useState(null);
  const [rate, setRate] = useState(null);
  const [rateDraft, setRateDraft] = useState('');
  const [savingRate, setSavingRate] = useState(false);
  const toast = useToast();

  const loadUsage = useCallback(async () => {
    try {
      setLoading(true);
      const data = await tokensClient.getUsage({ group_by: groupBy });
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error('No se pudo cargar el uso de tokens.');
    } finally {
      setLoading(false);
    }
  }, [groupBy, toast]);

  const loadDashboard = useCallback(async () => {
    try {
      const [hourlyData, rateData] = await Promise.all([
        tokensClient.getHourlyUsage(),
        tokensClient.getExchangeRate(),
      ]);
      setHourly(hourlyData);
      setRate(rateData);
      setRateDraft(String(rateData.usd_to_cop));
    } catch (err) {
      toast.error('No se pudo cargar el estado de tokens.');
    }
  }, [toast]);

  useEffect(() => {
    loadUsage();
  }, [loadUsage]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleSaveRate = async () => {
    const value = parseFloat(rateDraft);
    if (!value || value <= 0) {
      toast.error('Ingresa una tasa válida mayor a cero.');
      return;
    }
    setSavingRate(true);
    try {
      const updated = await tokensClient.updateExchangeRate(value);
      setRate(updated);
      toast.success('Tasa de cambio actualizada.');
    } catch (err) {
      toast.error('No se pudo actualizar la tasa.');
    } finally {
      setSavingRate(false);
    }
  };

  const hourlyPct = hourly && hourly.limit_usd > 0
    ? Math.min(100, Math.round((hourly.used_usd / hourly.limit_usd) * 100))
    : 0;

  return (
    <div className="page-content tokens-admin">
      <div className="tokens-header">
        <div>
          <h1 className="tokens-title"><Sparkles size="20" /> Tokens de IA — Administración</h1>
          <p className="tokens-subtitle">
            Consumo de modelos generativos (Gemini / Veo) por usuario, cliente y publicación.
          </p>
        </div>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => { loadUsage(); loadDashboard(); }}>
          <RefreshCw width="14" height="14" />
          Refrescar
        </button>
      </div>

      <div className="tokens-kpis">
        <div className="tokens-kpi">
          <span className="tokens-kpi-label">Límite horario</span>
          <span className="tokens-kpi-value">${hourly ? formatCOP(hourly.limit_cop) : '—'}</span>
          <span className="tokens-kpi-sub">{hourly ? `USD ${Number(hourly.limit_usd).toFixed(2)}` : ''}</span>
        </div>
        <div className="tokens-kpi">
          <span className="tokens-kpi-label">Usado en la última hora</span>
          <span className="tokens-kpi-value">${hourly ? formatCOP(hourly.used_cop) : '—'}</span>
          <div className="tokens-kpi-bar" style={{ '--pct': `${hourlyPct}%` }} />
        </div>
        <div className="tokens-kpi">
          <span className="tokens-kpi-label">Presupuesto restante</span>
          <span className={`tokens-kpi-value ${hourly && hourly.remaining_cop < 0 ? 'tokens-kpi-value--over' : ''}`}>
            ${hourly ? formatCOP(hourly.remaining_cop) : '—'}
          </span>
          <span className="tokens-kpi-sub">{hourly ? `USD ${Number(hourly.limit_usd - hourly.used_usd).toFixed(2)}` : ''}</span>
        </div>
        <div className="tokens-kpi tokens-kpi--rate">
          <span className="tokens-kpi-label">Tasa USD → COP</span>
          <div className="tokens-rate-edit">
            <input
              className="form-input"
              type="number"
              step="0.01"
              min="0"
              value={rateDraft}
              onChange={(e) => setRateDraft(e.target.value)}
              disabled={!rate}
            />
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleSaveRate}
              disabled={savingRate || !rate}
            >
              {savingRate ? <Loader2 width="14" height="14" className="animate-spin" /> : <Save width="14" height="14" />}
              Guardar
            </button>
          </div>
        </div>
      </div>

      <div className="tokens-tabs">
        {GROUP_TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              className={`tokens-tab ${groupBy === tab.key ? 'tokens-tab--active' : ''}`}
              onClick={() => setGroupBy(tab.key)}
            >
              <Icon width="14" height="14" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="tokens-table-wrap">
        {loading ? (
          <div className="tokens-empty"><Loader2 width="18" height="18" className="animate-spin" /> Cargando…</div>
        ) : rows.length === 0 ? (
          <div className="tokens-empty">Sin registros de uso para esta vista.</div>
        ) : (
          <table className="tokens-table">
            <thead>
              <tr>
                <th>{groupBy === 'customer' ? 'Cliente' : groupBy === 'post' ? 'Publicación' : 'Usuario'}</th>
                <th>Llamadas</th>
                <th>Tokens in</th>
                <th>Tokens out</th>
                <th>Costo USD</th>
                <th>Costo COP</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={String(row.key)}>
                  <td className="tokens-table-label">{row.label || '—'}</td>
                  <td>{row.calls}</td>
                  <td>{Number(row.input_tokens || 0).toLocaleString('es-CO')}</td>
                  <td>{Number(row.output_tokens || 0).toLocaleString('es-CO')}</td>
                  <td>${Number(row.total_cost_usd).toFixed(4)}</td>
                  <td className="tokens-table-cop">${formatCOP(row.total_cost_cop)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}