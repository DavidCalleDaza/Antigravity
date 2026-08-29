import React from 'react';
import { List, Grid3X3, Eye, EyeOff } from 'lucide-react';
import Dropdown from '../../../components/ui/Dropdown';

export default function ServicesToolbar({
  isClient,
  sellerFilter,
  setSellerFilter,
  sellers,
  categoryOptions,
  categoryFilter,
  setCategoryFilter,
  statusOptions,
  statusFilter,
  setStatusFilter,
  view,
  setView,
  revealImages,
  setRevealImages,
}) {
  return (
    <div className="products-toolbar">
      <div className="products-filters">
        {isClient && (
          <select
            className="form-select"
            value={sellerFilter}
            onChange={(e) => setSellerFilter(e.target.value)}
            style={{ width: 'auto', padding: 'var(--space-2) var(--space-4)' }}
          >
            <option value="">Todos los vendedores</option>
            {sellers.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
        )}
        <Dropdown
          options={categoryOptions}
          value={categoryFilter}
          onChange={setCategoryFilter}
        />
        <Dropdown
          options={statusOptions}
          value={statusFilter}
          onChange={setStatusFilter}
        />
      </div>
      <div className="view-toggle">
        <button
          className={`view-toggle-btn ${view === 'table' ? 'active' : ''}`}
          onClick={() => setView('table')}
          title="Vista de tabla"
        >
          <List width="18" height="18" />
        </button>
        <button
          className={`view-toggle-btn ${view === 'grid' ? 'active' : ''}`}
          onClick={() => setView('grid')}
          title="Vista de grid"
        >
          <Grid3X3 width="18" height="18" />
        </button>
        <button
          className={`view-toggle-btn ${revealImages ? 'active' : ''}`}
          onClick={() => setRevealImages(!revealImages)}
          title={revealImages ? 'Ocultar imágenes reales' : 'Mostrar imágenes reales'}
        >
          {revealImages ? <EyeOff width="18" height="18" /> : <Eye width="18" height="18" />}
        </button>
      </div>
    </div>
  );
}
