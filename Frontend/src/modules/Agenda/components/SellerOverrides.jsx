import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus, Trash2, CalendarX, Clock, Ban, CheckCircle2,
  CalendarDays, AlertTriangle,
} from 'lucide-react';
import { agendaClient } from '../../../utils/apiClient';
import { useToast } from '../../../components/ui/Toast';
import Helpers from '../../../utils/helpers';

const BLOCK_PRESETS = [
  { label: 'Todo el día', start: '00:00', end: '23:59', allDay: true },
  { label: 'Mañana', start: '06:00', end: '12:00' },
  { label: 'Almuerzo', start: '12:00', end: '14:00' },
  { label: 'Tarde', start: '14:00', end: '18:00' },
  { label: 'Noche', start: '18:00', end: '22:00' },
];

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function isPast(dateStr) {
  return dateStr < getToday();
}

export default function SellerOverrides() {
  const [overrides, setOverrides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    date: '',
    start_time: '09:00',
    end_time: '17:00',
    is_available: false,
    reason: '',
    allDay: false,
  });
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await agendaClient.listOverrides();
      setOverrides(data);
    } catch (e) {
      toast.error('Error al cargar excepciones');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const sorted = useMemo(() =>
    [...overrides].sort((a, b) => b.date.localeCompare(a.date) || (a.start_time || '').localeCompare(b.start_time || '')),
    [overrides]
  );

  const grouped = useMemo(() => {
    const groups = {};
    sorted.forEach(o => {
      const key = o.date;
      if (!groups[key]) groups[key] = [];
      groups[key].push(o);
    });
    return groups;
  }, [sorted]);

  const handleAdd = async () => {
    if (!form.date) {
      toast.error('Selecciona una fecha');
      return;
    }
    if (!form.allDay && (!form.start_time || !form.end_time)) {
      toast.error('Define las horas de inicio y fin');
      return;
    }
    try {
      const payload = {
        date: form.date,
        start_time: form.allDay ? null : form.start_time + ':00',
        end_time: form.allDay ? null : form.end_time + ':00',
        is_available: form.is_available,
        reason: form.reason || null,
      };
      const data = await agendaClient.createOverride(payload);
      setOverrides(prev => [...prev, data]);
      setShowForm(false);
      setForm({ date: '', start_time: '09:00', end_time: '17:00', is_available: false, reason: '', allDay: false });
      toast.success('Excepción agregada');
    } catch (e) {
      toast.error('Error al agregar excepción');
    }
  };

  const handleDelete = async (id) => {
    try {
      await agendaClient.deleteOverride(id);
      setOverrides(prev => prev.filter(o => o.id !== id));
      toast.success('Excepción eliminada');
    } catch (e) {
      toast.error('Error al eliminar');
    }
  };

  const applyPreset = (preset) => {
    setForm(f => ({
      ...f,
      start_time: preset.start,
      end_time: preset.end,
      allDay: preset.allDay || false,
    }));
  };

  const pendingCount = overrides.filter(o => !isPast(o.date)).length;

  return (
    <div className="ov-card">
      {/* Header */}
      <div className="ov-header">
        <div className="ov-header-left">
          <h3 className="ov-title">Excepciones</h3>
          <p className="ov-subtitle">Bloquea o abre horarios en fechas específicas</p>
        </div>
        <div className="ov-header-right">
          {pendingCount > 0 && (
            <span className="ov-count-badge">
              <CalendarDays width="13" height="13" />
              {pendingCount} próximas
            </span>
          )}
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
            <Plus width="14" height="14" /> Nueva
          </button>
        </div>
      </div>

      {/* Inline Form */}
      {showForm && (
        <div className="ov-form">
          <div className="ov-form-row">
            <div className="ov-form-field ov-form-date">
              <label className="ov-label">Fecha</label>
              <input
                type="date"
                className="ov-input"
                value={form.date}
                min={getToday()}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              />
            </div>

            {!form.allDay && (
              <>
                <div className="ov-form-field">
                  <label className="ov-label">Inicio</label>
                  <input
                    type="time"
                    className="ov-input"
                    value={form.start_time}
                    onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                  />
                </div>
                <span className="ov-form-sep">—</span>
                <div className="ov-form-field">
                  <label className="ov-label">Fin</label>
                  <input
                    type="time"
                    className="ov-input"
                    value={form.end_time}
                    onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                  />
                </div>
              </>
            )}
          </div>

          <div className="ov-form-row">
            <div className="ov-presets-row">
              {BLOCK_PRESETS.map(p => (
                <button
                  key={p.label}
                  className={`ov-preset ${form.start_time === p.start && form.end_time === p.end ? 'active' : ''}`}
                  onClick={() => applyPreset(p)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="ov-form-row">
            <div className="ov-form-field" style={{ flex: 1 }}>
              <input
                type="text"
                className="ov-input"
                placeholder="Motivo (opcional)"
                value={form.reason}
                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              />
            </div>
            <div className="ov-toggle-group">
              <button
                className={`ov-type-btn ${!form.is_available ? 'block' : ''}`}
                onClick={() => setForm(f => ({ ...f, is_available: false }))}
              >
                <Ban width="12" height="12" /> Bloquear
              </button>
              <button
                className={`ov-type-btn ${form.is_available ? 'open' : ''}`}
                onClick={() => setForm(f => ({ ...f, is_available: true }))}
              >
                <CheckCircle2 width="12" height="12" /> Abrir
              </button>
            </div>
            <div className="ov-form-actions">
              <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Cancelar</button>
              <button className="btn btn-primary btn-sm" onClick={handleAdd}>
                <Plus width="13" height="13" /> Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overrides List */}
      {loading ? (
        <div className="text-center p-4 text-tertiary">Cargando...</div>
      ) : sorted.length === 0 ? (
        <div className="ov-empty">
          <div className="ov-empty-icon"><CalendarX width="40" height="40" /></div>
          <div className="ov-empty-title">Sin excepciones</div>
          <div className="ov-empty-text">No hay bloqueos ni aperturas especiales configuradas.</div>
        </div>
      ) : (
        <div className="ov-groups">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date} className="ov-group">
              <div className="ov-group-header">
                <span className="ov-group-date">{Helpers.formatDate(date)}</span>
                {isPast(date) && <span className="ov-past-badge">Pasada</span>}
              </div>
              <div className="ov-group-items">
                {items.map(o => (
                  <div key={o.id} className={`ov-item ${o.is_available ? 'open' : 'blocked'}`}>
                    <div className="ov-item-icon">
                      {o.is_available
                        ? <CheckCircle2 width="16" height="16" />
                        : <Ban width="16" height="16" />
                      }
                    </div>
                    <div className="ov-item-info">
                      <div className="ov-item-time">
                        {o.start_time && o.end_time
                          ? `${o.start_time.slice(0, 5)} – ${o.end_time.slice(0, 5)}`
                          : 'Todo el día'
                        }
                      </div>
                      {o.reason && <div className="ov-item-reason">{o.reason}</div>}
                    </div>
                    <span className={`ov-item-badge ${o.is_available ? 'open' : 'blocked'}`}>
                      {o.is_available ? 'Abierto' : 'Bloqueado'}
                    </span>
                    <button className="ov-delete-btn" onClick={() => handleDelete(o.id)} title="Eliminar">
                      <Trash2 width="13" height="13" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
