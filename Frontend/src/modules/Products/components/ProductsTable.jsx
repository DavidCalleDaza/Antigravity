import React from 'react';
import { Power, Calendar } from 'lucide-react';
import Table from '../../../components/ui/Table';
import { PencilIcon, TrashIcon, ShareIcon, CartIcon } from '../../../components/ui/icons';
import { buildProductColumns } from '../utils/productHelpers';

export default function ProductsTable({
  filteredProducts,
  isClient,
  canManage,
  openEditModal,
  onToggleRequest,
  onShare,
  onDeleteRequest,
  navigate,
}) {
  const columns = buildProductColumns(isClient);

  const tableActions = (row) => (
    <div className="d-flex gap-2">
      {canManage && (
        <>
          <button className="btn btn-ghost btn-sm btn-icon-only" onClick={() => openEditModal(row)} title="Editar">
            <PencilIcon />
          </button>
          <button 
            className={`btn btn-ghost btn-sm btn-icon-only ${row.status === 'active' ? 'text-danger' : 'text-success'}`} 
            onClick={() => onToggleRequest(row)}
            title={row.status === 'active' ? 'Desactivar' : 'Activar'}
          >
            <Power width="14" height="14" />
          </button>
          <button className="btn btn-ghost btn-sm btn-icon-only" onClick={() => onShare(row)} title="Compartir">
            <ShareIcon />
          </button>
          <button className="btn btn-ghost btn-sm btn-icon-only" style={{ color: 'var(--danger)' }} onClick={() => onDeleteRequest(row)}>
            <TrashIcon />
          </button>
        </>
      )}
      {isClient && (
        <>
          <button className="btn btn-primary btn-sm" onClick={() => navigate(`/agenda?seller_id=${row.user_id}`)}>
            <Calendar width="14" height="14" />
            Ver Agenda
          </button>
          <button className="btn btn-primary btn-sm">
            <CartIcon />
            Añadir
          </button>
        </>
      )}
    </div>
  );

  return (
    <div className="products-table-wrapper">
      <Table
        columns={columns}
        data={filteredProducts}
        actions={tableActions}
      />
    </div>
  );
}
