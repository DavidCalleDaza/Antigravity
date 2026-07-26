import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MONTHS, DAYS_SHORT } from '../utils/agendaHelpers';

export default function BookingCalendar({ currentDate, onNavigate, selectedDate, onSelectDate }) {
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

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

  const handlePrev = () => {
    const newDate = new Date(currentYear, currentMonth - 1, 1);
    onNavigate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentYear, currentMonth + 1, 1);
    onNavigate(newDate);
  };

  return (
    <div className="booking-calendar-panel">
      <div className="booking-month-nav">
        <button className="btn btn-ghost btn-sm btn-icon-only" onClick={handlePrev}>
          <ChevronLeft width="18" height="18" />
        </button>
        <h3 className="calendar-nav-title">{MONTHS[currentMonth]} {currentYear}</h3>
        <button className="btn btn-ghost btn-sm btn-icon-only" onClick={handleNext}>
          <ChevronRight width="18" height="18" />
        </button>
      </div>
      <div className="booking-month-grid">
        {DAYS_SHORT.map(d => <div key={d} className="calendar-header-cell">{d}</div>)}
        {calendarDays.map((d, idx) => (
          <div
            key={idx}
            className={`booking-day-cell ${d.type === 'other' ? 'other-month' : ''} ${d.isToday ? 'today' : ''} ${d.date === selectedDate ? 'selected' : ''} ${d.isPast ? 'disabled' : ''}`}
            onClick={() => { if (d.type === 'current' && !d.isPast) onSelectDate(d.date); }}
          >
            <div className="booking-day-number">{d.day}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
