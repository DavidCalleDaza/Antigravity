import { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown, FileSpreadsheet, FileText } from 'lucide-react';
import { SERVER_BASE_URL } from '../../utils/apiClient';
import { useStore } from '../../store/useStore';
import { triggerBlobDownload } from '../../utils/apiClient';

/**
 * Botón único de exportación (Excel / CSV), reutilizable en cualquier
 * módulo. Recibe la ruta base del endpoint (ej. '/billing/export') y los
 * mismos filtros que la vista actual está usando, así el archivo exportado
 * siempre coincide con lo que el usuario está viendo.
 */
export default function ExportMenu({ exportBasePath, filters = {}, filename = 'Reporte' }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = async (format) => {
    setOpen(false);
    setLoading(true);
    try {
      const token = useStore.getState().currentUser?.token;
      const query = new URLSearchParams(filters).toString();
      const url = `${SERVER_BASE_URL}/api/v1${exportBasePath}/${format}${query ? `?${query}` : ''}`;
      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('Error al exportar');
      const blob = await response.blob();
      const ext = format === 'excel' ? 'xlsx' : 'csv';
      triggerBlobDownload(blob, `${filename}.${ext}`);
    } catch (err) {
      console.error('Error exportando:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="export-menu-wrapper" ref={ref}>
    <button className="stats-action-btn" onClick={() => setOpen(!open)} disabled={loading}>
        <Download width="14" height="14" />
        <span>Exportar</span>
        <ChevronDown width="12" height="12" />
    </button>
    {open && (
        <div className="export-menu-panel">
        <button className="export-menu-item" onClick={() => handleExport('excel')}>
            <span className="export-menu-icon">
            <FileSpreadsheet width="14" height="14" style={{ color: 'var(--gold, #d4af37)' }} />
            </span>
            <span>Excel (.xlsx)</span>
        </button>
        <button className="export-menu-item" onClick={() => handleExport('csv')}>
            <span className="export-menu-icon">
            <FileText width="14" height="14" />
            </span>
            <span>CSV (.csv)</span>
        </button>
        </div>
    )}
    </div>
  );
}