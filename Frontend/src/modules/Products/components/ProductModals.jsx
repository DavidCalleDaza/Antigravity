import React from 'react';
import Modal from '../../../components/ui/Modal';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import ShareModal from '../../../components/ShareModal';
import ItemDetailDrawer from '../../../components/ui/ItemDetailDrawer';

export default function ProductModals({
  isConfirmOpen,
  setIsConfirmOpen,
  onDelete,
  isBulkConfirmOpen,
  setIsBulkConfirmOpen,
  selectedCount = 0,
  onBulkDelete,
  isBulkDeleting = false,
  toggleTarget,
  setToggleTarget,
  onConfirmToggle,
  toggling,
  isDetailOpen,
  setIsDetailOpen,
  detailItem,
  setDetailItem,
  onToggleStatus,
  onEditFromDetail,
  canManage = true,
  storeLocations = [],
  shareModal,
  setShareModal,
  onPublish,
  view,
  setView,
  dbCategories,
  onCategoryCreated,
  onItemUpdated,
}) {
  return (
    <>
      <Modal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title="Eliminar Producto"
        size="sm"
        actions={[
          { label: 'Cancelar', onClick: () => setIsConfirmOpen(false) },
          { label: 'Confirmar', className: 'btn-danger', onClick: onDelete }
        ]}
      >
        <div style={{ color: 'var(--text-secondary)', gridColumn: '1 / -1' }}>¿Estás seguro de que deseas eliminar este producto permanentemente? Esta acción no se puede deshacer.</div>
      </Modal>

      <Modal
        isOpen={isBulkConfirmOpen}
        onClose={() => !isBulkDeleting && setIsBulkConfirmOpen(false)}
        title={`Eliminar ${selectedCount} producto${selectedCount === 1 ? '' : 's'}`}
        size="sm"
        actions={[
          { label: 'Cancelar', onClick: () => setIsBulkConfirmOpen(false), disabled: isBulkDeleting },
          { label: isBulkDeleting ? 'Eliminando...' : 'Confirmar', className: 'btn-danger', onClick: onBulkDelete, disabled: isBulkDeleting }
        ]}
      >
        <div style={{ color: 'var(--text-secondary)', gridColumn: '1 / -1' }}>
          ¿Estás seguro de que deseas eliminar los <strong>{selectedCount}</strong> productos seleccionados permanentemente? Esta acción no se puede deshacer.
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={onConfirmToggle}
        title={toggleTarget?.status === 'active' ? '¿Desactivar este producto?' : '¿Reactivar este producto?'}
        confirmText={toggleTarget?.status === 'active' ? 'Sí, Desactivar' : 'Sí, Reactivar'}
        isDanger={toggleTarget?.status === 'active'}
        loading={toggling}
      >
        {toggleTarget?.status === 'active' ? (
          <>¿Está seguro de que desea desactivar <strong>{toggleTarget?.name}</strong>? Este producto ya no aparecerá disponible para ser añadido al carrito.</>
        ) : (
          <>¿Está seguro de que desea reactivar <strong>{toggleTarget?.name}</strong>? Este producto volverá a estar disponible.</>
        )}
      </ConfirmModal>

      <ItemDetailDrawer
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen?.(false);
          setDetailItem?.(null);
        }}
        item={detailItem}
        variant="product"
        canManage={canManage}
        onEdit={onEditFromDetail}
        onToggleStatus={onToggleStatus}
        storeLocations={storeLocations}
        dbCategories={dbCategories}
      />
    </>
  );
}
