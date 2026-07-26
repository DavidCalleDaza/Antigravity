import React, { useState } from 'react';
import { Clock } from 'lucide-react';
import { ALL_SLOTS, slotToMin, formatDur } from '../utils/agendaHelpers';

export default function TimeSlotPicker({ startTime, endTime, onStartChange, onEndChange }) {
  const [phase, setPhase] = useState('start');
  const duration = formatDur(startTime, endTime);

  const getState = (slot) => {
    const sm = slotToMin(slot);
    const s = slotToMin(startTime);
    const e = slotToMin(endTime);
    if (slot === startTime && slot === endTime) return 'both';
    if (slot === startTime) return 'is-start';
    if (slot === endTime) return 'is-end';
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

      <div className="tsp-hint">
        <span>
          {phase === 'start' && 'Selecciona la hora de inicio'}
          {phase === 'end' && 'Ahora selecciona la hora de fin'}
          {phase === 'done' && 'Horario seleccionado — puedes ajustar haciendo clic'}
        </span>
        {phase !== 'start' && (
          <button type="button" className="tsp-reset" onClick={() => setPhase('start')}>
            Reiniciar
          </button>
        )}
      </div>

      <div className="tsp-grid-wrap">
        <div className="tsp-grid">
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="tsp-row">
              <span className="tsp-h-label">{String(h).padStart(2, '0')}h</span>
              {['00', '15', '30', '45'].map(m => {
                const slot = `${String(h).padStart(2, '0')}:${m}`;
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
