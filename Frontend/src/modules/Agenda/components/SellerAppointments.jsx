import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CalendarX, User, Clock, CheckCircle2, XCircle, CircleDot,
  AlertTriangle, ChevronDown, Loader2, Ban,
} from 'lucide-react';
import { agendaClient } from '../../../utils/apiClient';
import { useToast } from '../../../components/ui/Toast';
import { APP_CONFIG } from '../../../config/appConfig';
import Helpers from '../../../utils/helpers';

const STATUS_META = {
  pending:   { label: 'Pendiente',   icon: CircleDot,     color: 'var(--warning)',      bg: 'rgba(245,158,11,0.1)' },
  confirmed: { label: 'Confirmada',  icon: CheckCircle2,  color: 'var(--success)',      bg: 'rgba(34,197,94,0.1)' },
  completed: { label: 'Completada',  icon: CheckCircle2,  color: 'var(--accent-purple)',bg: 'rgba(196,168,224,0.1)' },
  cancelled: { label: 'Cancelada',   icon: XCircle,       color: 'var(--text-secondary)',bg: 'rgba(160,148,160,0.1)' },
};

function isToday(dateStr) {
  return dateStr === new Date().toISOString().split('T')[0];
}

function isPast(dateStr) {
  return dateStr < new Date().toISOString().split('T')[0];
}

export default function SellerAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await agendaClient.listAppointments(statusFilter ? { status: statusFilter } : {});
      setAppointments(data);
    } catch (e) {
      toast.error('Error al cargar citas');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async (id) => {
    try {
      await agendaClient.updateAppointment(id, { status: 'cancelled' });
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' } : a));
      toast.success('Cita cancelada');
    } catch (e) {
      toast.error('Error al cancelar');
    }
  };

  const handleConfirm = async (id) => {
    try {
      await agendaClient.updateAppointment(id, { status: 'confirmed' });
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'confirmed' } : a));
      toast.success('Cita confirmada');
    } catch (e) {
      toast.error('Error al confirmar');
    }
  };

  const sorted = useMemo(() =>
    [...appointments].sort((a, b) => b.date.localeCompare(a.date) || a.start_time.localeCompare(b.start_time)),
    [appointments]
  );

  const stats = useMemo(() => {
    const s = { pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
    appointments.forEach(a => { if (s[a.status] !== undefined) s[a.status]++; });
    return s;
  }, [appointments]);

  const grouped = useMemo(() => {
    const g = {};
    sorted.forEach(a => {
      if (!g[a.date]) g[a.date] = [];
      g[a.date].push(a);
    });
    return g;
  }, [sorted]);

  const filters = [
    { key: '', label: 'Todas' },
    { key: 'pending', label: 'Pendientes' },
    { key: 'confirmed', label: 'Confirmadas' },
    { key: 'completed', label: 'Completadas' },
    { key: 'cancelled', label: 'Canceladas' },
  ];

  return (
    <div className="appt-card">
      {/* Header */}
      <div className="appt-header">
        <div className="appt-header-left">
          <h3 className="appt-title">Mis Citas</h3>
          <p className="appt-subtitle">Gestiona las reservas de tus clientes</p>
        </div>
      </div>

      {/* Stats */}
      <div className="appt-stats">
        {Object.entries(STATUS_META).map(([key, meta]) => (
          <button
            key={key}
            className={`appt-stat ${statusFilter === key ? 'active' : ''}`}
            onClick={() => setStatusFilter(statusFilter === key ? '' : key)}
          >
            <div className="appt-stat-icon" style={{ color: meta.color, background: meta.bg }}>
              <meta.icon width="16" height="16" />
            </div>
            <div className="appt-stat-info">
              <span className="appt-stat-count">{stats[key]}</span>
              <span className="appt-stat-label">{meta.label}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="appt-loading">
          <Loader2 width="20" height="20" className="spin" /> Cargando citas...
        </div>
      ) : sorted.length === 0 ? (
        <div className="appt-empty">
          <div className="appt-empty-icon"><CalendarX width="44" height="44" /></div>
          <div className="appt-empty-title">
            {statusFilter ? 'Sin citas con este filtro' : 'Sin citas'}
          </div>
          <div className="appt-empty-text">
            {statusFilter
              ? 'No hay citas con el estado seleccionado.'
              : 'Aún no se han registrado reservas de clientes.'
            }
          </div>
        </div>
      ) : (
        <div className="appt-groups">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date} className="appt-group">
              <div className="appt-group-header">
                <div className="appt-group-date">
                  {isToday(date) && <span className="appt-today-dot" />}
                  <span className="appt-day-label">{Helpers.formatDate(date)}</span>
                  {isToday(date) && <span className="appt-today-badge">Hoy</span>}
                  {isPast(date) && !isToday(date) && <span className="appt-past-badge">Pasada</span>}
                </div>
                <span className="appt-group-count">{items.length} cita{items.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="appt-group-items">
                {items.map(a => {
                  const meta = STATUS_META[a.status] || STATUS_META.pending;
                  return (
                    <div key={a.id} className="appt-item">
                      <div className="appt-item-time">
                        <Clock width="14" height="14" />
                        <span>{a.start_time?.slice(0, 5)} – {a.end_time?.slice(0, 5)}</span>
                      </div>
                      <div className="appt-item-details">
                        <div className="appt-item-client">
                          <User width="14" height="14" />
                          <span>{a.client_name || 'Cliente'}</span>
                        </div>
                        {a.service_name && (
                          <div className="appt-item-service">
                            <span className="appt-service-name">{a.service_name}</span>
                          </div>
                        )}
                      </div>
                      <div className="appt-item-status">
                        <span className="appt-status-chip" style={{ color: meta.color, background: meta.bg }}>
                          <meta.icon width="12" height="12" />
                          {meta.label}
                        </span>
                      </div>
                      <div className="appt-item-actions">
                        {a.status === 'pending' && (
                          <>
                            <button className="appt-action confirm" onClick={() => handleConfirm(a.id)}>
                              <CheckCircle2 width="14" height="14" /> Confirmar
                            </button>
                            <button className="appt-action cancel" onClick={() => handleCancel(a.id)}>
                              <Ban width="14" height="14" /> Cancelar
                            </button>
                          </>
                        )}
                        {a.status === 'confirmed' && (
                          <button className="appt-action cancel" onClick={() => handleCancel(a.id)}>
                            <Ban width="14" height="14" /> Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
