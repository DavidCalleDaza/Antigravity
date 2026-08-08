import React from 'react';
import Helpers from '../../../utils/helpers';

export function statusBadge(status) {
  switch (status) {
    case 'active': return <span className="status-badge active">● Activo</span>;
    case 'inactive': return <span className="status-badge inactive">● Inactivo</span>;
    default: return <span className="status-badge">● {status}</span>;
  }
}

export function filterServices(services, categoryFilter, statusFilter, dbCategories) {
  return services
    .filter(s => {
      if (categoryFilter && s.category_id !== categoryFilter) return false;
      if (statusFilter && s.status !== statusFilter) return false;
      return true;
    })
    .map(s => ({
      ...s,
      category: s.category?.name || dbCategories.find(c => c.id === s.category_id)?.name || 'Sin categoría'
    }));
}

export function buildServiceColumns(isClient) {
  return [
    { key: 'name', label: 'Servicio', sortable: true, width: '180px' },
    ...(isClient ? [
      { key: 'seller_name', label: 'Vendedor', sortable: true, width: '150px' },
      { key: 'seller_city', label: 'Ciudad', sortable: true, width: '120px' },
      { key: 'store_name', label: 'Tienda', sortable: true, width: '120px' },
    ] : []),
    { key: 'category', label: 'Categoría', sortable: true, width: '150px' },
    { key: 'price', label: 'Precio', sortable: true, width: '120px', render: (v) => Helpers.formatCurrency(v) },
    { key: 'duration', label: 'Duración', sortable: true, width: '110px' },
    { key: 'status', label: 'Estado', sortable: true, width: '110px', render: (v) => statusBadge(v) }
  ].flat();
}
