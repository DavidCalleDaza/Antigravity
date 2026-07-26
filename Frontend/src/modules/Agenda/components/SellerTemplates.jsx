import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus, X, Clock, Copy, RotateCcw, Zap, Check,
} from 'lucide-react';
import { agendaClient } from '../../../utils/apiClient';
import { useToast } from '../../../components/ui/Toast';
import { DAYS, slotToMin, formatDur } from '../utils/agendaHelpers';

const PRESETS = [
  { label: '9:00 – 17:00', start: '09:00', end: '17:00' },
  { label: '8:00 – 12:00', start: '08:00', end: '12:00' },
  { label: '14:00 – 18:00', start: '14:00', end: '18:00' },
  { label: '10:00 – 14:00', start: '10:00', end: '14:00' },
];

const EMPTY_DAY = { enabled: false, start: '09:00', end: '17:00', slots: [] };

function dayScheduleTotal(start, end) {
  if (!start || !end) return '';
  const diff = slotToMin(end) - slotToMin(start);
  if (diff <= 0) return null;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

export default function SellerTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [weekSchedule, setWeekSchedule] = useState(
    Array.from({ length: 7 }, () => ({ ...EMPTY_DAY }))
  );
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await agendaClient.listTemplates();
      setTemplates(data);
    } catch (e) {
      toast.error('Error al cargar horarios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!loading && templates.length >= 0) {
      const merged = Array.from({ length: 7 }, (_, dayIdx) => {
        const dayTemplates = templates.filter(t => t.day_of_week === dayIdx);
        if (dayTemplates.length === 0) {
          return { ...EMPTY_DAY };
        }
        const first = dayTemplates[0];
        return {
          enabled: first.is_available,
          start: first.start_time.slice(0, 5),
          end: first.end_time.slice(0, 5),
          slots: dayTemplates,
        };
      });
      setWeekSchedule(merged);
    }
  }, [loading, templates]);

  const totalWeeklyHours = useMemo(() => {
    let total = 0;
    weekSchedule.forEach(d => {
      if (d.enabled && d.start && d.end) {
        total += slotToMin(d.end) - slotToMin(d.start);
      }
    });
    const h = Math.floor(total / 60);
    const m = total % 60;
    if (h === 0 && m === 0) return null;
    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}min`;
  }, [weekSchedule]);

  const updateDay = useCallback((dayIdx, updates) => {
    setWeekSchedule(prev => {
      const next = [...prev];
      next[dayIdx] = { ...next[dayIdx], ...updates };
      return next;
    });
    setDirty(true);
  }, []);

  const toggleDay = useCallback((dayIdx) => {
    setWeekSchedule(prev => {
      const next = [...prev];
      next[dayIdx] = { ...next[dayIdx], enabled: !next[dayIdx].enabled };
      return next;
    });
    setDirty(true);
  }, []);

  const applyPreset = useCallback((dayIdx, preset) => {
    setWeekSchedule(prev => {
      const next = [...prev];
      next[dayIdx] = { ...next[dayIdx], start: preset.start, end: preset.end, enabled: true };
      return next;
    });
    setDirty(true);
  }, []);

  const copyToAll = useCallback((dayIdx) => {
    const source = weekSchedule[dayIdx];
    if (!source.enabled) return;
    setWeekSchedule(prev =>
      prev.map((_, i) => ({
        ...EMPTY_DAY,
        enabled: true,
        start: source.start,
        end: source.end,
        slots: [],
      }))
    );
    setDirty(true);
    toast.success(`Horario de ${DAYS[dayIdx]} copiado a todos los días`);
  }, [weekSchedule, toast]);

  const resetWeek = useCallback(() => {
    setWeekSchedule(Array.from({ length: 7 }, () => ({ ...EMPTY_DAY })));
    setDirty(true);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const enabledDays = weekSchedule
        .map((d, idx) => ({ ...d, dayOfWeek: idx }))
        .filter(d => d.enabled && d.start && d.end);

      const toDelete = templates.filter(t => {
        const daySchedule = weekSchedule[t.day_of_week];
        return !daySchedule?.enabled;
      });

      for (const t of toDelete) {
        await agendaClient.deleteTemplate(t.id);
      }

      const toCreate = enabledDays.filter(d => {
        const existing = d.slots[0];
        if (existing) {
          return existing.start_time.slice(0, 5) !== d.start ||
                 existing.end_time.slice(0, 5) !== d.end;
        }
        return true;
      });

      for (const d of toCreate) {
        if (d.slots[0]) {
          await agendaClient.updateTemplate(d.slots[0].id, {
            start_time: d.start + ':00',
            end_time: d.end + ':00',
            is_available: true,
          });
        } else {
          await agendaClient.createTemplate({
            day_of_week: d.dayOfWeek,
            start_time: d.start + ':00',
            end_time: d.end + ':00',
            is_available: true,
          });
        }
      }

      await load();
      setDirty(false);
      toast.success('Horario semanal guardado');
    } catch (e) {
      toast.error('Error al guardar horario');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="text-center p-4 text-tertiary">Cargando horarios...</div>
      </div>
    );
  }

  return (
    <div className="wt-card">
      {/* Header */}
      <div className="wt-header">
        <div className="wt-header-left">
          <h3 className="wt-title">Horario Semanal</h3>
          <p className="wt-subtitle">
            Configura tu disponibilidad para cada día
          </p>
        </div>
        <div className="wt-header-right">
          {totalWeeklyHours && (
            <span className="wt-total-badge">
              <Clock width="13" height="13" />
              {totalWeeklyHours} / semana
            </span>
          )}
          <button
            className="btn btn-ghost btn-sm"
            onClick={resetWeek}
            title="Limpiar todo"
          >
            <RotateCcw width="14" height="14" />
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSave}
            disabled={saving || !dirty}
          >
            <Check width="14" height="14" />
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="wt-presets">
        <span className="wt-presets-label">
          <Zap width="12" height="12" /> Atajos rápidos — selecciona un día y elige:
        </span>
        <div className="wt-presets-list">
          {PRESETS.map(p => (
            <button
              key={p.label}
              className="wt-preset-chip"
              title={`Aplicar ${p.label} al día seleccionado`}
              onClick={() => {
                const activeDay = weekSchedule.findIndex(d => d.enabled);
                if (activeDay >= 0) {
                  applyPreset(activeDay, p);
                } else {
                  applyPreset(0, p);
                }
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Day Cards Grid */}
      <div className="wt-days-grid">
        {DAYS.map((dayName, idx) => {
          const day = weekSchedule[idx];
          const isMulti = templates.filter(t => t.day_of_week === idx).length > 1;
          const dayTotal = dayScheduleTotal(day.start, day.end);

          return (
            <div
              key={idx}
              className={`wt-day-card ${day.enabled ? 'active' : ''}`}
            >
              <div className="wt-day-header">
                <div className="wt-day-toggle">
                  <button
                    className={`wt-toggle ${day.enabled ? 'on' : ''}`}
                    onClick={() => toggleDay(idx)}
                    aria-label={`${day.enabled ? 'Desactivar' : 'Activar'} ${dayName}`}
                  >
                    <span className="wt-toggle-knob" />
                  </button>
                  <span className="wt-day-name">{dayName.slice(0, 3).toUpperCase()}</span>
                </div>
                {day.enabled && dayTotal && (
                  <span className="wt-day-hours">{dayTotal}</span>
                )}
              </div>

              {day.enabled ? (
                <div className="wt-day-body">
                  <div className="wt-time-inputs">
                    <div className="wt-time-field">
                      <label className="wt-time-label">Inicio</label>
                      <input
                        type="time"
                        className="wt-time-input"
                        value={day.start}
                        onChange={e => updateDay(idx, { start: e.target.value })}
                      />
                    </div>
                    <span className="wt-time-separator">—</span>
                    <div className="wt-time-field">
                      <label className="wt-time-label">Fin</label>
                      <input
                        type="time"
                        className="wt-time-input"
                        value={day.end}
                        onChange={e => updateDay(idx, { end: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="wt-day-actions">
                    <button
                      className="wt-icon-btn"
                      onClick={() => copyToAll(idx)}
                      title="Copiar este horario a todos los días"
                    >
                      <Copy width="12" height="12" />
                    </button>
                    {PRESETS.map(p => (
                      <button
                        key={p.label}
                        className="wt-mini-preset"
                        onClick={() => applyPreset(idx, p)}
                        title={p.label}
                      >
                        {p.start.slice(0, 2)}–{p.end.slice(0, 2)}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="wt-day-body wt-day-disabled">
                  <span className="wt-disabled-text">No disponible</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="wt-footer">
        <span className="wt-summary-text">
          {weekSchedule.filter(d => d.enabled).length} de 7 días activos
        </span>
      </div>
    </div>
  );
}
