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
    try {
      const data = await agendaClient.createTemplate({
        day_of_week: dayOfWeek,
        start_time: form.start_time,
        end_time: form.end_time,
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
              {grouped[idx].map(t => (
                <div key={t.id} className="agenda-time-badge">
                  <span>{t.start_time.slice(0, 5)} - {t.end_time.slice(0, 5)}</span>
                  <button className="btn btn-ghost btn-sm btn-icon-only" onClick={() => handleDelete(t.id)}>
                    <X width="12" height="12" />
                  </button>
                </div>
              ))}
              {editingDay === idx && (
                <div className="agenda-time-form">
                  <input
                    type="time"
                    className="form-input"
                    value={form.start_time}
                    onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                  />
                  <span className="text-sm">a</span>
                  <input
                    type="time"
                    className="form-input"
                    value={form.end_time}
                    onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                  />
                  <button className="btn btn-primary btn-sm" onClick={() => handleAdd(idx)}>
                    <Check width="14" height="14" />
                  </button>
                  <button className="btn btn-ghost btn-sm btn-icon-only" onClick={() => setEditingDay(null)}>
                    <X width="14" height="14" />
                  </button>
                </div>
              )}
            </div>
            {editingDay !== idx && (
              <button className="btn btn-ghost btn-sm" onClick={() => { setEditingDay(idx); setForm({ start_time: '', end_time: '', is_available: true }); }}>
                <Plus width="14" height="14" /> Agregar
              </button>
            )}
          </div>
        ))}
      </div>
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
        <div className="agenda-override-form">
          <input type="date" className="form-input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          <input type="time" className="form-input" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
          <input type="time" className="form-input" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
          <label className="agenda-checkbox-label">
            <input type="checkbox" checked={!form.is_available} onChange={e => setForm(f => ({ ...f, is_available: !e.target.checked }))} />
            Bloquear (no disponible)
          </label>
          <input type="text" className="form-input" placeholder="Motivo (opcional)" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
          <div className="d-flex gap-2">
            <button className="btn btn-primary btn-sm" onClick={handleAdd}>Guardar</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Cancelar</button>
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
    <div className="page-content">
      <div className="page-header">
        <div>
          <h2 className="page-title">Agendar Cita</h2>
          <p className="page-description">Selecciona un vendedor y elige el horario disponible</p>
        </div>
      </div>

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
