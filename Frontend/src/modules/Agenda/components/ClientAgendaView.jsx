import React, { useState } from 'react';
import ClientBookView from './ClientBookView';
import ClientAppointments from './ClientAppointments';

export default function ClientAgendaView() {
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
