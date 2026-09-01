import React from 'react';
import { List, Grid3X3, Eye, EyeOff, Trash2 } from 'lucide-react';
import Dropdown from '../../../components/ui/Dropdown';

export default function ServicesToolbar({
  isClient,
  isAdmin = false,
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
  isAllSelected = false,
  onSelectAll,
  selectedCount = 0,
  onBulkDeleteClick,
  hasItems = false,
}) {
  return (
    <div className="products-toolbar">
      <div className="products-filters" style={{ flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'center' }}>
        {isAdmin && hasItems && (
          <div className="d-flex items-center gap-3" style={{ paddingRight: 'var(--space-3)', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
            <label className="d-flex items-center gap-2 cursor-pointer" style={{ userSelect: 'none', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={onSelectAll}
                style={{ cursor: 'pointer', accentColor: 'var(--danger)', width: '16px', height: '16px' }}
              />
              <span>Seleccionar todo</span>
            </label>
            {selectedCount > 0 && (
              <button
                className="btn btn-danger btn-sm d-flex items-center gap-2"
                onClick={onBulkDeleteClick}
                style={{ padding: '6px 12px', fontSize: 'var(--text-xs)', fontWeight: 600 }}
              >
                <Trash2 width="14" height="14" />
                <span>Eliminar ({selectedCount})</span>
              </button>
            )}
          </div>
        )}
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
