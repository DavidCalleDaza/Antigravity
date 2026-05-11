import React, { useState, useMemo } from 'react';
import { Plus, ChevronLeft, ChevronRight, CalendarX } from 'lucide-react';
import { APP_CONFIG } from '../../config/appConfig';
import { MockData } from '../../utils/mockData';
import Helpers from '../../utils/helpers';
import { useToast } from '../../components/ui/Toast';

export default function Agenda() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const toast = useToast();

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const days = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysArr = [];

    // Previous month padding
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      daysArr.push({ day: prevMonthDays - i, type: 'other', date: `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(prevMonthDays - i).padStart(2, '0')}` });
    }

    // Current month
    const today = new Date().toISOString().split('T')[0];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const events = MockData.appointments.filter(a => a.date === dateStr);
      daysArr.push({ 
        day, 
        type: 'current', 
        date: dateStr, 
        isToday: dateStr === today,
        events 
      });
    }

    // Next month padding
    const remaining = 7 - (daysArr.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        daysArr.push({ day: i, type: 'other', date: `${currentYear}-${String(currentMonth + 2).padStart(2, '0')}-${String(i).padStart(2, '0')}` });
      }
    }

    return daysArr;
  }, [currentMonth, currentYear]);

  const selectedEvents = useMemo(() => {
    return MockData.appointments.filter(a => a.date === selectedDate);
  }, [selectedDate]);

  const changeMonth = (offset) => {
    setCurrentDate(new Date(currentYear, currentMonth + offset, 1));
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h2 className="page-title">Agenda</h2>
          <p className="page-description">Gestiona tus citas y disponibilidad</p>
        </div>
        <div className="page-actions">
          <button 
            className="btn btn-primary" 
            onClick={() => toast.info('Funcionalidad disponible en versión completa.')}
          >
            <Plus width="18" height="18" /> 
            Nueva Cita
          </button>
        </div>
      </div>

      <div className="agenda-layout">
        <div className="card">
          <div className="calendar-nav">
            <button className="btn btn-ghost btn-sm btn-icon-only" onClick={() => changeMonth(-1)}>
              <ChevronLeft width="18" height="18" />
            </button>
            <h3 className="calendar-nav-title">{months[currentMonth]} {currentYear}</h3>
            <button className="btn btn-ghost btn-sm btn-icon-only" onClick={() => changeMonth(1)}>
              <ChevronRight width="18" height="18" />
            </button>
          </div>
          <div className="calendar-grid">
            {days.map(d => <div key={d} className="calendar-header-cell">{d}</div>)}
            {calendarDays.map((d, idx) => (
              <div 
                key={idx} 
                className={`calendar-cell ${d.type === 'other' ? 'other-month' : ''} ${d.isToday ? 'today' : ''} ${d.date === selectedDate ? 'selected' : ''}`}
                onClick={() => d.type === 'current' && setSelectedDate(d.date)}
              >
                <div className="calendar-day">{d.day}</div>
                {d.events?.slice(0, 3).map((e, eIdx) => (
                  <div key={eIdx} className={`calendar-event ${e.status}`} title={e.title}>
                    {e.time} {e.title}
                  </div>
                ))}
                {d.events?.length > 3 && (
                  <div className="text-xs text-tertiary">+{d.events.length - 3} más</div>
                )}
              </div>
            ))}
          </div>

          <div className="d-flex gap-6 mt-4 justify-center" style={{ flexWrap: 'wrap' }}>
            <div className="d-flex items-center gap-2 text-xs"><div className="agenda-slot-status free"></div> Libre</div>
            <div className="d-flex items-center gap-2 text-xs"><div className="agenda-slot-status pending"></div> Pendiente</div>
            <div className="d-flex items-center gap-2 text-xs"><div className="agenda-slot-status busy"></div> Ocupado</div>
            <div className="d-flex items-center gap-2 text-xs"><div className="agenda-slot-status blocked"></div> Bloqueado</div>
          </div>
        </div>

        <div className="card">
          <div className="agenda-detail">
            <h3 className="agenda-detail-title">
              {selectedDate === new Date().toISOString().split('T')[0] ? 'Citas de Hoy' : `Citas - ${Helpers.formatDate(selectedDate)}`}
            </h3>
            <div id="detail-slots">
              {selectedEvents.length === 0 ? (
                <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
                  <div className="empty-state-icon"><CalendarX width="40" height="40" /></div>
                  <div className="empty-state-title">Sin citas</div>
                  <div className="empty-state-text">No hay citas para este día.</div>
                </div>
              ) : (
                selectedEvents.map(s => (
                  <div className="agenda-slot" key={s.id}>
                    <div className={`agenda-slot-status ${s.status}`}></div>
                    <div className="agenda-slot-time">{s.time}</div>
                    <div className="agenda-slot-info">
                      <div className="agenda-slot-title">{s.title}</div>
                      {s.client && <div className="agenda-slot-client">{s.client}</div>}
                    </div>
                    <span className={`badge ${s.status === 'free' ? 'badge-success' : s.status === 'pending' ? 'badge-warning' : s.status === 'busy' ? 'badge-primary' : 'badge-neutral'}`}>
                      {APP_CONFIG.AGENDA_STATUS_LABELS[s.status]}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
