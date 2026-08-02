import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  confirmText, 
  cancelText = "Cancelar", 
  isDanger = false,
  loading = false,
  icon: Icon = AlertTriangle,   // 👈 nuevo: ícono personalizable, con AlertTriangle por defecto
  children 
}) {
  if (!isOpen) return null;

  return createPortal(
    <div 
      className="modal-overlay active" 
      onClick={(e) => {
        e.stopPropagation();
        if (!loading) onClose();
      }} 
      style={{ zIndex: 11000 }}
    >
      <div className="standard-confirm-modal" onClick={e => e.stopPropagation()}>
        
        <div className={`standard-confirm-icon ${isDanger ? 'is-danger' : 'is-success'}`}>
          <Icon width="18" height="18" />
        </div>

        <h3>{title}</h3>
        
        <p>{children}</p> 

        <div className="standard-confirm-actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn ${isDanger ? 'btn-danger' : 'btn-primary'}`}
            onClick={(e) => {
              e.stopPropagation();
              onConfirm();
            }}
            disabled={loading}
          >
            {loading ? 'Guardando...' : confirmText}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}