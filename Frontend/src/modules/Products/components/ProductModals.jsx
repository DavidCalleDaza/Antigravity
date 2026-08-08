import React from 'react';
import Modal from '../../../components/ui/Modal';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import ShareModal from '../../../components/ShareModal';

export default function ProductModals({
  isConfirmOpen,
  setIsConfirmOpen,
  onDelete,
  toggleTarget,
  setToggleTarget,
  onConfirmToggle,
  toggling,
  shareModal,
  setShareModal,
  onPublish,
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

      <ShareModal
        isOpen={shareModal.isOpen}
        onClose={() => setShareModal({ isOpen: false, item: null })}
        item={shareModal.item}
        onPublish={onPublish}
      />
    </>
  );
}
