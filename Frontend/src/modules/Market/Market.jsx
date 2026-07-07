import React from 'react';
import { RefreshCw, Store, ArrowDown, Target, TrendingUp, MapPin } from 'lucide-react';
import { APP_CONFIG } from '../../config/appConfig';
import { MockData } from '../../utils/mockData';
import Helpers from '../../utils/helpers';
import Table from '../../components/ui/Table';

export default function Market() {
  const marketData = MockData.marketData;

  const columns = [
    { key: 'business', label: 'Negocio', sortable: true },
    { key: 'product', label: 'Producto', sortable: true },
    { key: 'price', label: 'Precio', sortable: true, render: (v) => Helpers.formatCurrency(v) },
    { key: 'distance', label: 'Distancia', sortable: true },
    { key: 'rating', label: 'Calificación', sortable: true, render: (v) => `⭐ ${v}` }
  ];

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h2 className="page-title">Estudio de Mercadeo</h2>
          <p className="page-description">Compara precios y encuentra oportunidades en negocios cercanos</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-outline"><RefreshCw width="16" height="16" /> Actualizar</button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-3 mb-6">
        <div className="card">
          <div className="kpi-card">
            <div className="kpi-icon primary"><Store width="24" height="24" /></div>
            <div><div className="kpi-value">6</div><div className="kpi-label">Negocios cercanos</div></div>
          </div>
        </div>
        <div className="card">
          <div className="kpi-card">
            <div className="kpi-icon accent"><ArrowDown width="24" height="24" /></div>
            <div><div className="kpi-value">$22,000</div><div className="kpi-label">Precio más bajo (Café)</div></div>
          </div>
        </div>
        <div className="card">
          <div className="kpi-card">
            <div className="kpi-icon success"><Target width="24" height="24" /></div>
            <div><div className="kpi-value">$25,000</div><div className="kpi-label">Tu precio (Café)</div></div>
          </div>
        </div>
      </div>

      {/* Competitors Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Negocios Cercanos</h3>
          <select className="form-select" style={{ width: 'auto', padding: 'var(--space-2) var(--space-4)' }}>
            <option>Todos los productos</option>
            <option>Café</option>
            <option>Panela</option>
            <option>Miel</option>
          </select>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <Table columns={columns} data={marketData} />
        </div>
      </div>

      {/* Insights */}
      <div className="card mt-6">
        <div className="card-header"><h3 className="card-title">🔍 Insights del Mercado</h3></div>
        <div className="card-body d-flex flex-col gap-4">
          <div className="suggestion-card">
            <div className="suggestion-icon"><TrendingUp width="20" height="20" /></div>
            <div>
              <div className="suggestion-title">Tu precio de Café es competitivo</div>
              <div className="suggestion-text">Estás $3,000 por debajo del precio más alto de la zona. Tu relación calidad-precio es atractiva para clientes conscientes.</div>
            </div>
          </div>
          <div className="suggestion-card" style={{ borderLeftColor: 'var(--accent)' }}>
            <div className="suggestion-icon" style={{ background: 'var(--accent-50)', color: 'var(--accent-700)' }}><MapPin width="20" height="20" /></div>
            <div>
              <div className="suggestion-title">Oportunidad en radio de 1km</div>
              <div className="suggestion-text">No hay negocios vendiendo Miel de Abejas en un radio de 1km. Podrías captar clientes de esa zona.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
