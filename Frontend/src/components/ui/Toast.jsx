import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { create } from 'zustand';

// Store for managing toasts globally
export const useToastStore = create((set) => ({
  toasts: [],
  addToast: (toast) => set((state) => ({ 
    toasts: [...state.toasts, { ...toast, id: Date.now() + Math.random() }] 
  })),
  removeToast: (id) => set((state) => ({ 
    toasts: state.toasts.filter((t) => t.id !== id) 
  })),
}));

// Convenience hook
export const useToast = () => {
  const addToast = useToastStore((state) => state.addToast);
  
  return {
    success: (message, title = 'Éxito') => addToast({ title, message, type: 'success' }),
    error: (message, title = 'Error') => addToast({ title, message, type: 'error' }),
    warning: (message, title = 'Atención') => addToast({ title, message, type: 'warning' }),
    info: (message, title = 'Info') => addToast({ title, message, type: 'info' }),
  };
};

const ToastItem = ({ toast, onRemove }) => {
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = useCallback(() => {
    setIsRemoving(true);
    setTimeout(() => onRemove(toast.id), 250);
  }, [toast.id, onRemove]);

  useEffect(() => {
    const timer = setTimeout(handleRemove, 4000);
    return () => clearTimeout(timer);
  }, [handleRemove]);

  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info
  };
  const Icon = icons[toast.type] || Info;

  return (
    <div className={`toast ${toast.type} ${isRemoving ? 'removing' : ''}`}>
      <span className="toast-icon">
        <Icon width="20" height="20" />
      </span>
      <div className="toast-content">
        {toast.title && <div className="toast-title">{toast.title}</div>}
        <div className="toast-message">{toast.message}</div>
      </div>
      <button className="toast-close" onClick={handleRemove} aria-label="Cerrar">
        <X width="16" height="16" />
      </button>
    </div>
  );
};

export const ToastContainer = () => {
  const { toasts, removeToast } = useToastStore();

  return createPortal(
    <div className="toast-container" id="toast-container">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>,
    document.body
  );
};
