import React from 'react';
import { List, Grid3X3, Eye, EyeOff, Trash2, Download, UploadCloud } from 'lucide-react';
import Dropdown from '../../../components/ui/Dropdown';

export default function ProductsToolbar({
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
  onExportExcel,
  onImportExcel,
  hasItems = false,
}) {
  return (
    <div className="products-toolbar">
      <div className="products-filters" style={{ flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'center' }}>
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
        <div className="d-flex items-center gap-1" style={{ marginLeft: 'var(--space-1)' }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-icon-only"
            onClick={onBulkDeleteClick}
            disabled={selectedCount === 0}
            title={selectedCount > 0 ? `Eliminar (${selectedCount}) seleccionados` : 'Eliminar (selecciona al menos un registro)'}
            style={{
              color: selectedCount > 0 ? '#ef4444' : 'var(--text-secondary)',
              opacity: selectedCount > 0 ? 1 : 0.45,
              cursor: selectedCount > 0 ? 'pointer' : 'not-allowed',
            }}
          >
            <Trash2 width="16" height="16" />
          </button>

          <button
            type="button"
            className="btn btn-ghost btn-sm btn-icon-only"
            onClick={onExportExcel}
            title="Exportar a Excel"
            style={{ color: 'var(--gold, #d4af37)' }}
          >
            <Download width="16" height="16" />
          </button>

          <button
            type="button"
            className="btn btn-ghost btn-sm btn-icon-only"
            onClick={onImportExcel}
            title="Importar desde Excel"
            style={{ color: '#22c55e' }}
          >
            <UploadCloud width="16" height="16" />
          </button>
        </div>
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
          className={`view-toggle-btn ${!revealImages ? 'active' : ''}`}
          onClick={() => setRevealImages(!revealImages)}
          title={revealImages ? 'Ocultar imágenes y precios' : 'Mostrar imágenes y precios'}
        >
          {revealImages ? <Eye width="18" height="18" /> : <EyeOff width="18" height="18" />}
        </button>
      </div>
    </div>
  );
}
