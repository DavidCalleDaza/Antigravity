import React from 'react';
import { APP_CONFIG } from '../../../config/appConfig';
import Helpers from '../../../utils/helpers';

export function statusBadge(s) {
  const cls = { active: 'badge-success', inactive: 'badge-neutral', out_of_stock: 'badge-danger' };
  return <span className={`badge badge-dot ${cls[s] || 'badge-neutral'}`}>{APP_CONFIG.PRODUCT_STATUS_LABELS[s]}</span>;
}

export function filterProducts(products, categoryFilter, statusFilter, dbCategories) {
  return products
    .filter(p => {
      if (categoryFilter && p.category_id !== categoryFilter) return false;
      if (statusFilter) {
        if (statusFilter === 'out_of_stock') {
          const isOutOfStock = (p.stock ?? 0) <= 0 || p.status === 'out_of_stock';
          if (!isOutOfStock) return false;
        } else if (p.status !== statusFilter) {
          return false;
        }
      }
      return true;
    })
    .map(p => ({
      ...p,
      category: p.category?.name || dbCategories.find(c => c.id === p.category_id)?.name || 'Sin categoría'
    }));
}

export function buildProductColumns(isClient) {
  return [
    { key: 'name', label: 'Producto', sortable: true, width: '180px' },
    ...(isClient ? [
      { key: 'seller_name', label: 'Vendedor', sortable: true, width: '150px' },
      { key: 'seller_city', label: 'Ciudad', sortable: true, width: '120px' },
      { key: 'store_name', label: 'Tienda', sortable: true, width: '120px' },
    ] : []),
    { key: 'category', label: 'Categoría', sortable: true, width: '150px' },
    { key: 'price', label: 'Precio', sortable: true, width: '120px', render: (v) => Helpers.formatCurrency(v) },
    { key: 'stock', label: 'Stock', sortable: true, width: '90px' },
    { key: 'status', label: 'Estado', sortable: true, width: '110px', render: (v) => statusBadge(v) }
  ].flat();
}
