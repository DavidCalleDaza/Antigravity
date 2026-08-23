import React, { useState } from 'react';
import SellerTemplates from './SellerTemplates';
import SellerOverrides from './SellerOverrides';
import SellerAppointments from './SellerAppointments';

export default function SellerAgendaView() {
  const [tab, setTab] = useState('templates');

  return (
    <div className="page-content agenda-bg-photo">
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
