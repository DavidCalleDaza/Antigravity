import React from 'react';
import Modal from './Modal';

export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  confirmText, 
  cancelText = "Cancelar", 
  isDanger = false,
  loading = false,
  children 
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !loading && onClose()}
      title={title}
      size="sm"
      actions={[
        {
          label: cancelText,
          onClick: () => !loading && onClose(),
          className: 'btn-outline',
          disabled: loading
        },
        {
          label: loading ? 'Guardando...' : confirmText,
          onClick: onConfirm,
          className: isDanger ? 'btn-danger' : 'btn-primary',
          disabled: loading
        }
      ]}
    >
      <div style={{ color: 'var(--text-secondary)', padding: '4px 0', fontSize: 'var(--text-sm)', lineHeight: '1.6' }}>
        {children}
      </div>
    </Modal>
  );
}