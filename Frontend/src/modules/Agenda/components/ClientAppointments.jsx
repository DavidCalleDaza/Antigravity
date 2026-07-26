import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CalendarX, User, Clock, CheckCircle2, XCircle, CircleDot,
  Loader2, Ban,
} from 'lucide-react';
import { agendaClient } from '../../../utils/apiClient';
import { useToast } from '../../../components/ui/Toast';
import { useStore } from '../../../store/useStore';
import { APP_CONFIG } from '../../../config/appConfig';
import Helpers from '../../../utils/helpers';
import Modal from '../../../components/ui/Modal';

const STATUS_META = {
  pending:   { label: 'Pendiente',   icon: CircleDot,    color: 'var(--warning)',       bg: 'rgba(245,158,11,0.1)' },
  confirmed: { label: 'Confirmada',  icon: CheckCircle2,  color: 'var(--success)',       bg: 'rgba(34,197,94,0.1)' },
  completed: { label: 'Completada',  icon: CheckCircle2,  color: 'var(--accent-purple)', bg: 'rgba(196,168,224,0.1)' },
  cancelled: { label: 'Cancelada',   icon: XCircle,       color: 'var(--text-secondary)',bg: 'rgba(160,148,160,0.1)' },
};

export default function ClientAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelModal, setCancelModal] = useState({ open: false, appointment: null });
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const toast = useToast();
  const { notifications } = useStore();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await agendaClient.listAppointments();
      setAppointments(data);
    } catch (e) {
      toast.error('Error al cargar mis citas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (notifications.length > 0) {
      const latest = notifications[0];
      if (latest.type === 'appointment_confirmed' && !latest.is_read) {
        load();
      }
    }
  }, [notifications, load]);

  const openCancelModal = (apt) => {
    setCancelModal({ open: true, appointment: apt });
    setCancelReason('');
  };

  const closeCancelModal = () => {
    setCancelModal({ open: false, appointment: null });
    setCancelReason('');
    setCancelling(false);
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast.error('Debes indicar el motivo de cancelación');
      return;
    }
    setCancelling(true);
    try {
      const apt = cancelModal.appointment;
      await agendaClient.updateAppointment(apt.id, {
        status: 'cancelled',
        cancellation_reason: cancelReason.trim(),
      });
      setAppointments(prev => prev.map(a =>
        a.id === apt.id ? { ...a, status: 'cancelled', cancellation_reason: cancelReason.trim() } : a
      ));
      toast.success('Cita cancelada');
      closeCancelModal();
    } catch (e) {
      const msg = e?.data?.detail || 'Error al cancelar la cita';
      toast.error(msg);
    } finally {
      setCancelling(false);
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

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="appt-card">
      <div className="appt-header">
        <div className="appt-header-left">
          <h3 className="appt-title">Mis Citas</h3>
          <p className="appt-subtitle">Gestiona las reservas que solicitaste</p>
        </div>
      </div>

      {/* Stats */}
      <div className="appt-stats">
        {Object.entries(STATUS_META).map(([key, meta]) => (
          <div key={key} className="appt-stat">
            <div className="appt-stat-icon" style={{ color: meta.color, background: meta.bg }}>
              <meta.icon width="16" height="16" />
            </div>
            <div className="appt-stat-info">
              <span className="appt-stat-count">{stats[key]}</span>
              <span className="appt-stat-label">{meta.label}</span>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="appt-loading">
          <Loader2 width="20" height="20" className="spin" /> Cargando citas...
        </div>
      ) : sorted.length === 0 ? (
        <div className="appt-empty">
          <div className="appt-empty-icon"><CalendarX width="44" height="44" /></div>
          <div className="appt-empty-title">Sin citas</div>
          <div className="appt-empty-text">Aún no has solicitado ninguna cita.</div>
        </div>
      ) : (
        <div className="appt-groups">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date} className="appt-group">
              <div className="appt-group-header">
                <div className="appt-group-date">
                  {date === today && <span className="appt-today-dot" />}
                  <span className="appt-day-label">{Helpers.formatDate(date)}</span>
                  {date === today && <span className="appt-today-badge">Hoy</span>}
                  {date < today && <span className="appt-past-badge">Pasada</span>}
                </div>
                <span className="appt-group-count">{items.length} cita{items.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="appt-group-items">
                {items.map(a => {
                  const meta = STATUS_META[a.status] || STATUS_META.pending;
                  const canCancel = a.status === 'pending' || a.status === 'confirmed';
                  return (
                    <div key={a.id} className="appt-item">
                      <div className="appt-item-time">
                        <Clock width="14" height="14" />
                        <span>{a.start_time?.slice(0, 5)} – {a.end_time?.slice(0, 5)}</span>
                      </div>
                      <div className="appt-item-details">
                        <div className="appt-item-client">
                          <User width="14" height="14" />
                          <span>{a.seller_name || 'Vendedor'}</span>
                        </div>
                        {a.service_name && (
                          <div className="appt-item-service">
                            <span className="appt-service-name">{a.service_name}</span>
                          </div>
                        )}
                        {a.cancellation_reason && (
                          <div className="appt-cancel-reason">
                            <Ban width="12" height="12" />
                            <span>{a.cancellation_reason}</span>
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
                        {canCancel && (
                          <button className="appt-action cancel" onClick={() => openCancelModal(a)}>
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

      {/* Cancel Reason Modal */}
      <Modal
        isOpen={cancelModal.open}
        onClose={closeCancelModal}
        title="Cancelar Cita"
        size="sm"
        actions={[
          { label: 'Cerrar', onClick: closeCancelModal },
          {
            label: cancelling ? 'Cancelando...' : 'Confirmar Cancelación',
            className: 'btn-danger',
            onClick: handleCancel,
          },
        ]}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {cancelModal.appointment && (
            <div style={{
              padding: 'var(--space-3)',
              background: 'var(--primary-50)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-sm)',
              color: 'var(--text-secondary)',
            }}>
              <strong>{Helpers.formatDate(cancelModal.appointment.date)}</strong> a las{' '}
              <strong>{cancelModal.appointment.start_time?.slice(0, 5)}</strong>
              {cancelModal.appointment.service_name && (
                <span> — {cancelModal.appointment.service_name}</span>
              )}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <label style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-semibold)',
              color: 'var(--text-primary)',
            }}>
              Motivo de cancelación <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <textarea
              className="form-textarea"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Describe brevemente el motivo de la cancelación..."
              rows={3}
              autoFocus
              style={{ resize: 'vertical' }}
            />
            {!cancelReason.trim() && (
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                Campo obligatorio
              </span>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
