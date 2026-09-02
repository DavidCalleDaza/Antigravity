import React from 'react';
import { PackageX, ShoppingCart } from 'lucide-react';
import MediaCard from '../../../components/ui/MediaCard';

export default function ProductsGrid({
  filteredProducts,
  canManage,
  isAdmin = false,
  selectedIds = [],
  onToggleSelect,
  onView,
  openEditModal,
  onDeleteRequest,
  onShare,
  toast,
  revealImages
}) {
  return (
    <div className="product-grid">
      {filteredProducts.length === 0 ? (
        <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
          <div className="empty-state-icon"><PackageX width="48" height="48" /></div>
          <div className="empty-state-title">Sin productos</div>
          <div className="empty-state-text">No hay productos que coincidan con los filtros.</div>
        </div>
      ) : (
        filteredProducts.map(p => (
          <MediaCard
            key={p.id}
            item={p}
            variant="product"
            canManage={canManage}
            selectable={isAdmin}
            isSelected={selectedIds.includes(p.id)}
            onToggleSelect={onToggleSelect}
            onView={onView}
            onEdit={openEditModal}
            onDelete={(item) => onDeleteRequest(item)}
            onAction={(product) => toast.success(`${product.name} añadido`)}
            actionLabel="Añadir"
            actionIcon={ShoppingCart}
            revealImages={revealImages}
          />
        ))
      )}
    </div>
  );
}
