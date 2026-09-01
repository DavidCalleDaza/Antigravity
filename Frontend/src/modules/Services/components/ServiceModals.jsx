import React from 'react';
import Modal from '../../../components/ui/Modal';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import ShareModal from '../../../components/ShareModal';

export default function ServiceModals({
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
        title="Eliminar Servicio"
        size="sm"
        actions={[
          { label: 'Cancelar', onClick: () => setIsConfirmOpen(false) },
          { label: 'Confirmar', className: 'btn-danger', onClick: onDelete }
        ]}
      >
        <div style={{ color: 'var(--text-secondary)', gridColumn: '1 / -1' }}>¿Estás seguro de que deseas eliminar este servicio?</div>
      </Modal>

      <Modal
        isOpen={isBulkConfirmOpen}
        onClose={() => !isBulkDeleting && setIsBulkConfirmOpen(false)}
        title={`Eliminar ${selectedCount} servicio${selectedCount === 1 ? '' : 's'}`}
        size="sm"
        actions={[
          { label: 'Cancelar', onClick: () => setIsBulkConfirmOpen(false), disabled: isBulkDeleting },
          { label: isBulkDeleting ? 'Eliminando...' : 'Confirmar', className: 'btn-danger', onClick: onBulkDelete, disabled: isBulkDeleting }
        ]}
      >
        <div style={{ color: 'var(--text-secondary)', gridColumn: '1 / -1' }}>
          ¿Estás seguro de que deseas eliminar los <strong>{selectedCount}</strong> servicios seleccionados permanentemente? Esta acción no se puede deshacer.
        </div>
      </Modal>

      <ShareModal
        isOpen={shareModal.isOpen}
        onClose={() => setShareModal({ isOpen: false, item: null })}
        item={shareModal.item}
        onPublish={onPublish}
        view={view}
        setView={setView}
        dbCategories={dbCategories}
        onCategoryCreated={onCategoryCreated}
        onItemUpdated={onItemUpdated}
      />

      {/* MODAL DE CONFIRMACIÓN MODERNO (Toggle de Estado) */}
      <ConfirmModal
        isOpen={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={onConfirmToggle}
        title={toggleTarget?.status === 'active' ? '¿Desactivar este servicio?' : '¿Reactivar este servicio?'}
        confirmText={toggleTarget?.status === 'active' ? 'Sí, Desactivar' : 'Sí, Reactivar'}
        isDanger={toggleTarget?.status === 'active'}
        loading={toggling}
      >
        {toggleTarget?.status === 'active' ? (
          <>¿Está seguro de que desea desactivar <strong>{toggleTarget?.name}</strong>? Este servicio ya no aparecerá disponible para ser agendado.</>
        ) : (
          <>¿Está seguro de que desea reactivar <strong>{toggleTarget?.name}</strong>? Este servicio volverá a estar disponible.</>
        )}
      </ConfirmModal>
    </>
  );
}
