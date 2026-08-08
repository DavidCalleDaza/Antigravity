import React from 'react';
import { PackageX, ShoppingCart } from 'lucide-react';
import MediaCard from '../../../components/ui/MediaCard';

export default function ProductsGrid({ filteredProducts, canManage, openEditModal, onDeleteRequest, onShare, toast }) {
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
            onEdit={openEditModal}
            onDelete={(item) => onDeleteRequest(item)}
            onAction={(product) => toast.success(`${product.name} añadido`)}
            onShare={(item) => onShare(item)}
            actionLabel="Añadir"
            actionIcon={ShoppingCart}
          />
        ))
      )}
    </div>
  );
}
