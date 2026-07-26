import React from 'react';
import { Check } from 'lucide-react';
import Helpers from '../../../utils/helpers';

export default function BookingConfirmation({ date, slot, onConfirm, booking }) {
  if (!slot) return null;

  return (
    <div className="booking-confirm-panel">
      <div className="booking-confirm-info">
        <p>
          <strong>{Helpers.formatDate(date)}</strong> a las <strong>{slot.start_time}</strong>
        </p>
      </div>
      <button className="btn btn-primary" onClick={onConfirm} disabled={booking}>
        {booking ? 'Agendando...' : 'Confirmar Cita'}
      </button>
    </div>
  );
}
