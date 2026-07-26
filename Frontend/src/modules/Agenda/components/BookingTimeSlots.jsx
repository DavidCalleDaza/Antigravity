import React from 'react';
import { Clock } from 'lucide-react';
import Helpers from '../../../utils/helpers';

export default function BookingTimeSlots({ date, slots, selectedSlot, onSelectSlot, loading }) {
  const formattedDate = Helpers.formatDate(date);

  return (
    <div className="booking-slots-panel">
      <div className="booking-slots-date">
        <Clock width="16" height="16" style={{ color: 'var(--gold)' }} />
        <span>{formattedDate}</span>
      </div>
      {loading ? (
        <div className="text-center p-4 text-tertiary">Cargando horarios...</div>
      ) : slots.length === 0 ? (
        <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
          <div className="empty-state-icon"><Clock width="32" height="32" /></div>
          <div className="empty-state-title">Sin horarios</div>
          <div className="empty-state-text">No hay horarios disponibles para esta fecha.</div>
        </div>
      ) : (
        <div className="booking-slots-grid">
          {slots.map((slot, idx) => (
            <div
              key={idx}
              className={`booking-slot-chip ${selectedSlot?.start_time === slot.start_time ? 'selected' : ''}`}
              onClick={() => onSelectSlot(slot)}
            >
              {slot.start_time}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
