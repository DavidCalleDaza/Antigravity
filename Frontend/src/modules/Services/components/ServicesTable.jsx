import React, { useMemo } from 'react';
import { Eye, Power, Calendar } from 'lucide-react';
import Table from '../../../components/ui/Table';
import { PencilIcon, TrashIcon, ShareIcon } from '../../../components/ui/icons';
import { buildServiceColumns } from '../utils/serviceHelpers';

export default function ServicesTable({
  filteredServices,
  isClient,
  canManage,
  isAdmin = false,
  selectedIds = [],
  onToggleSelect,
  onSelectAll,
  isAllSelected = false,
  onView,
  openEditModal,
  onToggleRequest,
  onShare,
  onDeleteRequest,
  navigate,
  revealImages = true,
}) {
  const baseColumns = useMemo(() => buildServiceColumns(isClient, revealImages), [isClient, revealImages]);
  const columns = isAdmin ? [
    {
      key: '_select',
      label: (
        <input
          type="checkbox"
          checked={isAllSelected}
          onChange={onSelectAll}
          style={{ cursor: 'pointer', accentColor: '#000000', width: '16px', height: '16px' }}
          title="Seleccionar todo"
        />
      ),
      sortable: false,
      width: '40px',
      render: (_, row) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(row.id)}
          onChange={(e) => {
            e.stopPropagation();
            onToggleSelect?.(row.id);
          }}
          style={{ cursor: 'pointer', accentColor: '#000000', width: '16px', height: '16px' }}
        />
      )
    },
    ...baseColumns
  ] : baseColumns;

  const tableActions = (row) => (
    <div className="d-flex items-center justify-center gap-2" style={{ justifyContent: 'center', alignItems: 'center', width: '100%' }}>
      {onView && (
        <button className="btn btn-ghost btn-sm btn-icon-only" onClick={() => onView(row)} title="Ver detalle">
          <Eye width="14" height="14" />
        </button>
      )}
      {canManage && (
        <>
          <button 
            className={`btn btn-ghost btn-sm btn-icon-only ${row.status === 'active' ? 'text-danger' : 'text-success'}`} 
            onClick={() => onToggleRequest(row)}
            title={row.status === 'active' ? 'Desactivar' : 'Activar'}
          >
            <Power width="14" height="14" />
          </button>
          <button className="btn btn-ghost btn-sm btn-icon-only" style={{ color: 'var(--danger)' }} onClick={() => onDeleteRequest(row)} title="Eliminar">
            <TrashIcon />
          </button>
        </>
      )}
      {isClient && (
        <button className="btn btn-primary btn-sm" onClick={() => navigate(`/agenda?seller_id=${row.user_id}&service_id=${row.id}`)}>
          <Calendar width="14" height="14" />
          Agendar
        </button>
      )}
    </div>
  );

  return (
    <div className="services-table-wrapper">
      <Table
        columns={columns}
        data={filteredServices}
        actions={tableActions}
      />
    </div>
  );
}
