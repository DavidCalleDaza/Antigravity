import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus, ChevronLeft, ChevronRight, CalendarX, Clock, User,
  Store, Check, X, Trash2,
} from 'lucide-react';
import { APP_CONFIG } from '../../config/appConfig';
import Helpers from '../../utils/helpers';
import { useToast } from '../../components/ui/Toast';
import { useStore } from '../../store/useStore';
import { agendaClient, serviceClient } from '../../utils/apiClient';

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export default function Agenda() {
  const { currentUser } = useStore();
  const userRole = currentUser?.role;
  const isSeller = userRole === 'admin' || userRole === 'seller';
  const toast = useToast();

  if (isSeller) return <SellerAgendaView />;
  return <ClientAgendaView />;
}

function SellerAgendaView() {
  const [tab, setTab] = useState('templates');
  const toast = useToast();

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h2 className="page-title">Mi Agenda</h2>
          <p className="page-description">Gestiona tu disponibilidad y citas</p>
        </div>
      </div>

      <div className="agenda-tabs">
        <button className={`agenda-tab ${tab === 'templates' ? 'active' : ''}`} onClick={() => setTab('templates')}>
          Horario Semanal
        </button>
        <button className={`agenda-tab ${tab === 'overrides' ? 'active' : ''}`} onClick={() => setTab('overrides')}>
          Excepciones
        </button>
        <button className={`agenda-tab ${tab === 'appointments' ? 'active' : ''}`} onClick={() => setTab('appointments')}>
          Citas
        </button>
      </div>

      {tab === 'templates' && <SellerTemplates />}
      {tab === 'overrides' && <SellerOverrides />}
      {tab === 'appointments' && <SellerAppointments />}
    </div>
  );
}

/* ─── Time Slot Picker Helpers ─── */
function generateAllSlots() {
  const slots = [];
  for (let h = 0; h < 24; h++)
    for (let m = 0; m < 60; m += 15)
      slots.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
  return slots;
}
const ALL_SLOTS = generateAllSlots();

function slotToMin(s) {
  if (!s) return 0;
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
}

function formatDur(start, end) {
  const diff = slotToMin(end) - slotToMin(start);
  if (diff <= 0) return '';
  const h = Math.floor(diff / 60), m = diff % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

function TimeSlotPicker({ startTime, endTime, onStartChange, onEndChange }) {
  const [phase, setPhase] = useState('start'); // 'start' | 'end' | 'done'
  const duration = formatDur(startTime, endTime);

  const getState = (slot) => {
    const sm = slotToMin(slot);
    const s  = slotToMin(startTime);
    const e  = slotToMin(endTime);
    if (slot === startTime && slot === endTime) return 'both';
    if (slot === startTime) return 'is-start';
    if (slot === endTime)   return 'is-end';
    if (startTime && endTime && sm > s && sm < e) return 'in-range';
    return '';
  };

  const handleClick = (slot) => {
    if (phase === 'start') {
      onStartChange(slot);
      const ni = ALL_SLOTS.indexOf(slot) + 4;
      if (!endTime || slotToMin(slot) >= slotToMin(endTime))
        onEndChange(ALL_SLOTS[Math.min(ni, ALL_SLOTS.length - 1)]);
      setPhase('end');
    } else {
      if (slotToMin(slot) <= slotToMin(startTime)) {
        onStartChange(slot);
        setPhase('end');
      } else {
        onEndChange(slot);
        setPhase('done');
      }
    }
  };

  return (
    <div className="tsp-wrapper">
      {/* Summary bar */}
      <div className="tsp-summary">
        <div
          className={`tsp-time-box${phase === 'start' ? ' active' : ''}`}
          onClick={() => setPhase('start')}
        >
          <span className="tsp-time-label">INICIO</span>
          <span className="tsp-time-val">{startTime || '--:--'}</span>
        </div>
        <span className="tsp-arrow">→</span>
        <div
          className={`tsp-time-box${phase === 'end' || phase === 'done' ? ' active' : ''}`}
          onClick={() => { if (startTime) setPhase('end'); }}
        >
          <span className="tsp-time-label">FIN</span>
          <span className="tsp-time-val">{endTime || '--:--'}</span>
        </div>
        {duration && (
          <div className="tsp-dur">
            <Clock width="11" height="11" />
            {duration}
          </div>
        )}
      </div>

      {/* Instruction */}
      <div className="tsp-hint">
        <span>
          {phase === 'start' && '👆 Selecciona la hora de inicio'}
          {phase === 'end'   && '👆 Ahora selecciona la hora de fin'}
          {phase === 'done'  && '✓ Horario seleccionado — puedes ajustar haciendo clic'}
        </span>
        {phase !== 'start' && (
          <button type="button" className="tsp-reset" onClick={() => setPhase('start')}>
            Reiniciar
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="tsp-grid-wrap">
        <div className="tsp-grid">
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="tsp-row">
              <span className="tsp-h-label">{String(h).padStart(2,'0')}h</span>
              {['00','15','30','45'].map(m => {
                const slot = `${String(h).padStart(2,'0')}:${m}`;
                const st = getState(slot);
                return (
                  <button
                    key={m}
                    type="button"
                    className={`tsp-btn${st ? ` ${st}` : ''}`}
                    onClick={() => handleClick(slot)}
                    title={slot}
                  >
                    :{m}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Seller Templates (Horario Semanal) ─── */
function SellerTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingDay, setEditingDay] = useState(null);
  const [form, setForm] = useState({ start_time: '', end_time: '', is_available: true });
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

  const grouped = useMemo(() => {
    const g = Array.from({ length: 7 }, () => []);
    templates.forEach(t => { g[t.day_of_week].push(t); });
    return g;
  }, [templates]);

  const handleAdd = async (dayOfWeek) => {
    if (!form.start_time || !form.end_time) {
      toast.error('Debes seleccionar hora de inicio y fin');
      return;
    }
    if (slotToMin(form.end_time) <= slotToMin(form.start_time)) {
      toast.error('La hora de fin debe ser posterior al inicio');
      return;
    }
    try {
      const data = await agendaClient.createTemplate({
        day_of_week: dayOfWeek,
        start_time: form.start_time + ':00',
        end_time:   form.end_time   + ':00',
        is_available: form.is_available,
      });
      setTemplates(prev => [...prev, data]);
      setEditingDay(null);
      setForm({ start_time: '', end_time: '', is_available: true });
      toast.success('Franja agregada');
    } catch (e) {
      toast.error('Error al agregar franja');
    }
  };

  const handleDelete = async (id) => {
    try {
      await agendaClient.deleteTemplate(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
      toast.success('Franja eliminada');
    } catch (e) {
      toast.error('Error al eliminar franja');
    }
  };

  return (
    <div className="card">
      <div className="agenda-templates">
        {DAYS.map((dayName, idx) => (
          <div key={idx} className="agenda-day-row">
            <div className="agenda-day-label">{dayName}</div>
            <div className="agenda-day-slots">
              {grouped[idx].length === 0 && !loading && (
                <span className="text-tertiary text-sm">Sin horario</span>
              )}
              {grouped[idx].map(t => {
                const dur = formatDur(t.start_time.slice(0,5), t.end_time.slice(0,5));
                return (
                  <div key={t.id} className="agenda-time-badge">
                    <Clock width="11" height="11" style={{opacity:0.6}} />
                    <span>{t.start_time.slice(0, 5)} — {t.end_time.slice(0, 5)}</span>
                    {dur && <span className="agenda-time-dur">{dur}</span>}
                    <button className="btn btn-ghost btn-sm btn-icon-only" onClick={() => handleDelete(t.id)}>
                      <X width="12" height="12" />
                    </button>
                  </div>
                );
              })}
            </div>
            {editingDay !== idx ? (
              <button
                className="btn btn-ghost btn-sm agenda-add-btn"
                onClick={() => { setEditingDay(idx); setForm({ start_time: '', end_time: '', is_available: true }); }}
              >
                <Plus width="14" height="14" /> Agregar
              </button>
            ) : (
              <button className="btn btn-ghost btn-sm agenda-add-btn" onClick={() => setEditingDay(null)}>
                <X width="14" height="14" /> Cerrar
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Inline slot picker panel */}
      {editingDay !== null && (
        <div className="agenda-tsp-panel">
          <div className="agenda-tsp-panel-header">
            <Clock width="15" height="15" style={{color:'var(--gold)'}} />
            <span>Nueva franja — <strong>{DAYS[editingDay]}</strong></span>
          </div>
          <TimeSlotPicker
            startTime={form.start_time}
            endTime={form.end_time}
            onStartChange={v => setForm(f => ({...f, start_time: v}))}
            onEndChange={v   => setForm(f => ({...f, end_time:   v}))}
          />
          <div className="agenda-tsp-panel-footer">
            <label className="agenda-checkbox-label">
              <input
                type="checkbox"
                checked={form.is_available}
                onChange={e => setForm(f => ({...f, is_available: e.target.checked}))}
              />
              Marcar como disponible
            </label>
            <div style={{display:'flex', gap:'8px'}}>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditingDay(null)}>Cancelar</button>
              <button className="btn btn-primary btn-sm" onClick={() => handleAdd(editingDay)}>
                <Check width="13" height="13" /> Guardar franja
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SellerOverrides() {
  const [overrides, setOverrides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: '', start_time: '', end_time: '', is_available: false, reason: '' });
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

  const handleAdd = async () => {
    if (!form.date || !form.start_time || !form.end_time) {
      toast.error('Completa todos los campos');
      return;
    }
    try {
      const data = await agendaClient.createOverride(form);
      setOverrides(prev => [...prev, data]);
      setShowForm(false);
      setForm({ date: '', start_time: '', end_time: '', is_available: false, reason: '' });
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

  const sorted = [...overrides].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="card">
      <div className="agenda-overrides-header">
        <h3>Excepciones de disponibilidad</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
          <Plus width="14" height="14" /> Nueva Excepción
        </button>
      </div>

      {showForm && (
        <div className="agenda-tsp-panel">
          <div className="agenda-tsp-panel-header">
            <Clock width="15" height="15" style={{color:'var(--gold)'}} />
            <span>Nueva excepción de disponibilidad</span>
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:'12px', padding:'4px 0'}}>
            <div className="form-group">
              <label className="form-label">Fecha</label>
              <input type="date" className="form-input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <TimeSlotPicker
              startTime={form.start_time}
              endTime={form.end_time}
              onStartChange={v => setForm(f => ({...f, start_time: v}))}
              onEndChange={v   => setForm(f => ({...f, end_time:   v}))}
            />
            <input type="text" className="form-input" placeholder="Motivo (opcional)" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
          </div>
          <div className="agenda-tsp-panel-footer">
            <label className="agenda-checkbox-label">
              <input type="checkbox" checked={!form.is_available} onChange={e => setForm(f => ({ ...f, is_available: !e.target.checked }))} />
              Bloquear (no disponible)
            </label>
            <div style={{display:'flex', gap:'8px'}}>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Cancelar</button>
              <button className="btn btn-primary btn-sm" onClick={handleAdd}>
                <Check width="13" height="13" /> Guardar excepción
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center p-4 text-tertiary">Cargando...</div>
      ) : sorted.length === 0 ? (
        <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
          <div className="empty-state-icon"><CalendarX width="40" height="40" /></div>
          <div className="empty-state-title">Sin excepciones</div>
          <div className="empty-state-text">No hay excepciones configuradas.</div>
        </div>
      ) : (
        <div className="agenda-override-list">
          {sorted.map(o => (
            <div key={o.id} className="agenda-override-item">
              <div className="agenda-override-date">{Helpers.formatDate(o.date)}</div>
              <div className="agenda-override-time">{o.start_time.slice(0,5)} - {o.end_time.slice(0,5)}</div>
              <span className={`badge ${o.is_available ? 'badge-success' : 'badge-neutral'}`}>
                {o.is_available ? 'Disponible' : 'Bloqueado'}
              </span>
              {o.reason && <span className="text-sm text-tertiary">{o.reason}</span>}
              <button className="btn btn-ghost btn-sm btn-icon-only" onClick={() => handleDelete(o.id)}>
                <Trash2 width="14" height="14" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SellerAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const data = await agendaClient.listAppointments(params);
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

  const sorted = [...appointments].sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time));

  return (
    <div className="card">
      <div className="agenda-appointments-header">
        <h3>Mis Citas</h3>
        <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: 'auto' }}>
          <option value="">Todas</option>
          <option value="pending">Pendientes</option>
          <option value="confirmed">Confirmadas</option>
          <option value="cancelled">Canceladas</option>
          <option value="completed">Completadas</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center p-4 text-tertiary">Cargando...</div>
      ) : sorted.length === 0 ? (
        <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
          <div className="empty-state-icon"><CalendarX width="40" height="40" /></div>
          <div className="empty-state-title">Sin citas</div>
          <div className="empty-state-text">No hay citas para mostrar.</div>
        </div>
      ) : (
        <div className="agenda-appointment-list">
          {sorted.map(a => (
            <div key={a.id} className="agenda-appointment-item">
              <div className="agenda-appointment-date">
                <span className="text-sm font-semibold">{Helpers.formatDate(a.date)}</span>
                <span className="text-sm">{a.start_time} - {a.end_time}</span>
              </div>
              <div className="agenda-appointment-info">
                <span><User width="14" height="14" /> {a.client_name || 'Cliente'}</span>
                {a.service_name && <span><Clock width="14" height="14" /> {a.service_name}</span>}
              </div>
              <span className={`badge ${a.status === 'confirmed' ? 'badge-success' : a.status === 'pending' ? 'badge-warning' : a.status === 'cancelled' ? 'badge-neutral' : 'badge-primary'}`}>
                {APP_CONFIG.AGENDA_STATUS_LABELS?.[a.status] || a.status}
              </span>
              <div className="d-flex gap-2">
                {a.status === 'pending' && (
                  <>
                    <button className="btn btn-primary btn-sm" onClick={() => handleConfirm(a.id)}>Confirmar</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleCancel(a.id)}>Cancelar</button>
                  </>
                )}
                {a.status === 'confirmed' && (
                  <button className="btn btn-ghost btn-sm" onClick={() => handleCancel(a.id)}>Cancelar</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ClientAgendaView() {
  const [tab, setTab] = useState('book');
  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h2 className="page-title">Citas</h2>
          <p className="page-description">Agenda nuevas citas o revisa las que ya solicitaste</p>
        </div>
      </div>
      <div className="agenda-tabs">
        <button className={`agenda-tab ${tab === 'book' ? 'active' : ''}`} onClick={() => setTab('book')}>
          Agendar Cita
        </button>
        <button className={`agenda-tab ${tab === 'my_appointments' ? 'active' : ''}`} onClick={() => setTab('my_appointments')}>
          Mis Citas
        </button>
      </div>
      {tab === 'book' && <ClientBookView />}
      {tab === 'my_appointments' && <ClientAppointments />}
    </div>
  );
}

function ClientAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
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
  }, []); // Remove toast from dependencies to prevent infinite loop

  useEffect(() => { load(); }, [load]);

  // Refrescar cuando llegue notificación de confirmación
  useEffect(() => {
    if (notifications.length > 0) {
      const latest = notifications[0];
      if (latest.type === 'appointment_confirmed' && !latest.is_read) {
        load();
      }
    }
  }, [notifications, load]);

  const sorted = [...appointments].sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time));

  return (
    <div className="card">
      <div className="agenda-appointments-header">
        <h3>Mis Citas Solicitadas</h3>
      </div>
      {loading ? (
        <div className="text-center p-4 text-tertiary">Cargando...</div>
      ) : sorted.length === 0 ? (
        <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
          <div className="empty-state-icon"><CalendarX width="40" height="40" /></div>
          <div className="empty-state-title">Sin citas</div>
          <div className="empty-state-text">No has solicitado ninguna cita aún.</div>
        </div>
      ) : (
        <div className="agenda-appointment-list">
          {sorted.map(a => (
            <div key={a.id} className="agenda-appointment-item">
              <div className="agenda-appointment-date">
                <span className="text-sm font-semibold">{Helpers.formatDate(a.date)}</span>
                <span className="text-sm">{a.start_time} - {a.end_time}</span>
              </div>
              <div className="agenda-appointment-info">
                <span><User width="14" height="14" /> {a.seller_name || 'Vendedor'}</span>
                {a.service_name && <span><Clock width="14" height="14" /> {a.service_name}</span>}
              </div>
              <span className={`badge ${a.status === 'confirmed' ? 'badge-success' : a.status === 'pending' ? 'badge-warning' : a.status === 'cancelled' ? 'badge-neutral' : 'badge-primary'}`}>
                {APP_CONFIG.AGENDA_STATUS_LABELS?.[a.status] || a.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ClientBookView() {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState('sellers');
  const [sellers, setSellers] = useState([]);
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [sellerServices, setSellerServices] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedService, setSelectedService] = useState(searchParams.get('service_id') || '');
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [booking, setBooking] = useState(false);

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const sellerIdParam = searchParams.get('seller_id');

  useEffect(() => {
    agendaClient.listSellers()
      .then(data => {
        setSellers(data);
        if (sellerIdParam) {
          const found = data.find(s => s.id === sellerIdParam);
          if (found) handleSelectSeller(found);
        }
      })
      .catch(() => toast.error('Error al cargar vendedores'));
  }, []);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const arr = [];
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      arr.push({ day: prevMonthDays - i, type: 'other' });
    }
    const today = new Date().toISOString().split('T')[0];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      arr.push({ day, type: 'current', date: dateStr, isToday: dateStr === today, isPast: dateStr < today });
    }
    const remaining = 7 - (arr.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        arr.push({ day: i, type: 'other' });
      }
    }
    return arr;
  }, [currentMonth, currentYear]);

  const handleSelectSeller = async (seller) => {
    setSelectedSeller(seller);
    setSelectedDate('');
    setSelectedService('');
    setSlots([]);
    setSelectedSlot(null);
    setStep('datetime');
    try {
      const data = await serviceClient.list({ seller_id: seller.id });
      setSellerServices(data);
    } catch {
      setSellerServices([]);
    }
  };

  const handleSelectDate = (dateStr) => {
    if (!dateStr) return;
    setSelectedDate(dateStr);
    setSelectedSlot(null);
    setStep('slots');
  };

  useEffect(() => {
    if (selectedSeller && selectedDate) {
      setLoadingSlots(true);
      agendaClient.getSlots(selectedSeller.id, selectedDate, selectedService || undefined)
        .then(data => setSlots(data.slots || []))
        .catch(() => toast.error('Error al cargar horarios'))
        .finally(() => setLoadingSlots(false));
    }
  }, [selectedSeller, selectedDate, selectedService]);

  const handleBook = async () => {
    if (!selectedSlot) return;
    setBooking(true);
    try {
      await agendaClient.createAppointment({
        seller_id: selectedSeller.id,
        service_id: selectedService || null,
        date: selectedDate,
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
      });
      toast.success('Cita agendada exitosamente');
      setStep('sellers');
      setSelectedSeller(null);
      setSelectedDate('');
      setSelectedService('');
      setSlots([]);
      setSelectedSlot(null);
    } catch (e) {
      toast.error('Error al agendar cita');
    } finally {
      setBooking(false);
    }
  };

  return (
    <div>
      <div className="agenda-steps">
        <span className={`agenda-step ${step === 'sellers' ? 'active' : step !== 'sellers' ? 'completed' : ''}`}>
          {step !== 'sellers' ? <Check width="14" height="14" /> : '1'} Vendedor
        </span>
        <span className="agenda-step-line" />
        <span className={`agenda-step ${step === 'datetime' ? 'active' : ''}`}>2 Fecha</span>
        <span className="agenda-step-line" />
        <span className={`agenda-step ${step === 'slots' ? 'active' : ''}`}>3 Horario</span>
      </div>

      {step === 'sellers' && (
        <div className="agenda-seller-grid">
          {sellers.map(s => (
            <div key={s.id} className="card agenda-seller-card" onClick={() => handleSelectSeller(s)}>
              <div className="agenda-seller-avatar">
                {s.avatar_url ? <img src={Helpers.resolveMediaUrl(s.avatar_url)} alt={s.full_name} /> : <User width="32" height="32" />}
              </div>
              <div className="agenda-seller-name">{s.full_name}</div>
              <div className="agenda-seller-email text-sm text-tertiary">{s.email}</div>
              {s.store_locations?.length > 0 && (
                <div className="agenda-seller-locations">
                  {s.store_locations.map(l => (
                    <span key={l.id} className="badge badge-neutral"><Store width="12" height="12" /> {l.name}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {sellers.length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1 / -1', padding: 'var(--space-8)' }}>
              <div className="empty-state-icon"><User width="40" height="40" /></div>
              <div className="empty-state-title">Sin vendedores</div>
              <div className="empty-state-text">No hay vendedores disponibles.</div>
            </div>
          )}
        </div>
      )}

      {step === 'datetime' && selectedSeller && (
        <div className="agenda-datetime-layout">
          <div className="card">
            <div className="calendar-nav">
              <button className="btn btn-ghost btn-sm btn-icon-only" onClick={() => setCurrentDate(new Date(currentYear, currentMonth - 1, 1))}>
                <ChevronLeft width="18" height="18" />
              </button>
              <h3 className="calendar-nav-title">{MONTHS[currentMonth]} {currentYear}</h3>
              <button className="btn btn-ghost btn-sm btn-icon-only" onClick={() => setCurrentDate(new Date(currentYear, currentMonth + 1, 1))}>
                <ChevronRight width="18" height="18" />
              </button>
            </div>
            <div className="calendar-grid">
              {DAYS_SHORT.map(d => <div key={d} className="calendar-header-cell">{d}</div>)}
              {calendarDays.map((d, idx) => (
                <div
                  key={idx}
                  className={`calendar-cell ${d.type === 'other' ? 'other-month' : ''} ${d.isToday ? 'today' : ''} ${d.date === selectedDate ? 'selected' : ''} ${d.isPast ? 'disabled' : ''}`}
                  onClick={() => { if (d.type === 'current' && !d.isPast) handleSelectDate(d.date); }}
                >
                  <div className="calendar-day">{d.day}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <h3 className="text-sm font-semibold mb-3">Servicio (opcional)</h3>
            <select className="form-select" value={selectedService} onChange={e => setSelectedService(e.target.value)}>
              <option value="">Sin servicio específico</option>
              {sellerServices.map(s => (
                <option key={s.id} value={s.id}>{s.name} - {Helpers.formatCurrency(s.price)}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {step === 'slots' && selectedDate && (
        <div className="card">
          <h3 className="text-sm font-semibold mb-3">
            Horarios disponibles para {Helpers.formatDate(selectedDate)}
            {selectedSeller && <span className="text-tertiary"> - {selectedSeller.full_name}</span>}
          </h3>
          {loadingSlots ? (
            <div className="text-center p-4 text-tertiary">Cargando horarios...</div>
          ) : slots.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
              <div className="empty-state-icon"><Clock width="40" height="40" /></div>
              <div className="empty-state-title">Sin horarios disponibles</div>
              <div className="empty-state-text">No hay horarios disponibles para esta fecha. Intenta con otra fecha o servicio.</div>
            </div>
          ) : (
            <>
              <div className="agenda-slots-grid">
                {slots.map((s, idx) => (
                  <div
                    key={idx}
                    className={`agenda-slot-pill ${selectedSlot?.start_time === s.start_time ? 'selected' : ''}`}
                    onClick={() => setSelectedSlot(s)}
                  >
                    {s.start_time}
                  </div>
                ))}
              </div>
              {selectedSlot && (
                <div className="agenda-booking-confirm">
                  <p>Confirmar cita: <strong>{Helpers.formatDate(selectedDate)}</strong> a las <strong>{selectedSlot.start_time}</strong></p>
                  <button className="btn btn-primary" onClick={handleBook} disabled={booking}>
                    {booking ? 'Agendando...' : 'Confirmar Cita'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
