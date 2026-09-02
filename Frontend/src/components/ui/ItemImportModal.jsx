import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  X,
  FileCheck
} from 'lucide-react';
import Modal from './Modal';
import { useToast } from './Toast';
import { downloadExcelTemplate, parseExcelFile } from '../../utils/excelUtils';
import { productClient, serviceClient } from '../../utils/apiClient';

export default function ItemImportModal({
  isOpen,
  onClose,
  type = 'product',
  categories = [],
  storeLocations = [],
  onSuccess,
}) {
  const isProduct = type === 'product';
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importSummary, setImportSummary] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleReset = () => {
    setFile(null);
    setParsedRows([]);
    setIsParsing(false);
    setIsImporting(false);
    setProgress(0);
    setImportSummary(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    if (isImporting) return;
    handleReset();
    onClose();
  };

  const handleFileChange = async (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setIsParsing(true);
    setImportSummary(null);

    try {
      const rows = await parseExcelFile(selectedFile, type);
      setParsedRows(rows);
    } catch (err) {
      console.error('Error al procesar el archivo Excel:', err);
      toast.error(err.message || 'No se pudo leer el archivo Excel.');
      setFile(null);
      setParsedRows([]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFileChange(droppedFile);
    }
  };

  const validRows = parsedRows.filter((r) => r.isValid);
  const invalidRows = parsedRows.filter((r) => !r.isValid);

  const handleExecuteImport = async () => {
    if (validRows.length === 0 || isImporting) return;

    setIsImporting(true);
    setProgress(0);

    let successCount = 0;
    let errorCount = 0;

    const defaultCategoryId = categories[0]?.id || null;
    const defaultLocationId = storeLocations.find((l) => l.is_primary)?.id || storeLocations[0]?.id || null;

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];

      // Resolver category_id
      let categoryId = defaultCategoryId;
      if (row.categoryName && categories.length > 0) {
        const found = categories.find(
          (c) => c.name.toLowerCase().trim() === row.categoryName.toLowerCase().trim()
        );
        if (found) categoryId = found.id;
      }

      // Resolver store_location_id
      let locationId = defaultLocationId;
      if (row.locationName && storeLocations.length > 0) {
        const foundLoc = storeLocations.find(
          (l) => l.name.toLowerCase().trim() === row.locationName.toLowerCase().trim()
        );
        if (foundLoc) locationId = foundLoc.id;
      }

      const payload = isProduct
        ? {
            name: row.name,
            category_id: categoryId,
            price: row.price,
            stock: row.stock ?? 0,
            status: row.status || 'active',
            description: row.description || '',
            store_location_id: locationId,
          }
        : {
            name: row.name,
            category_id: categoryId,
            price: row.price,
            duration: row.duration ?? 30,
            status: row.status || 'active',
            description: row.description || '',
            store_location_id: locationId,
          };

      try {
        if (isProduct) {
          await productClient.create(payload);
        } else {
          await serviceClient.create(payload);
        }
        successCount++;
      } catch (err) {
        console.error(`Error importando fila #${row._index}:`, err);
        errorCount++;
      }

      setProgress(Math.round(((i + 1) / validRows.length) * 100));
    }

    setIsImporting(false);
    setImportSummary({ successCount, errorCount, total: validRows.length });

    if (successCount > 0) {
      toast.success(
        `Se importaron ${successCount} ${isProduct ? 'producto' : 'servicio'}${successCount > 1 ? 's' : ''} exitosamente.`
      );
      onSuccess?.();
    }

    if (errorCount > 0) {
      toast.error(`Ocurrió un error al importar ${errorCount} registro(s).`);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Importar ${isProduct ? 'Productos' : 'Servicios'} desde Excel`}
      size="lg"
    >
      <div className="import-modal-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        
        {/* Encabezado informativo y botón de descarga de plantilla */}
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: '12px 16px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 'var(--radius-lg)',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
            Sube un archivo <strong>Excel (.xlsx, .xls)</strong> o <strong>CSV</strong> con las columnas correspondientes.
          </div>
          <button
            type="button"
            className="btn btn-outline btn-sm d-flex items-center gap-2"
            onClick={() => downloadExcelTemplate({ type })}
            style={{ fontSize: '11px', fontWeight: 600, padding: '6px 12px' }}
          >
            <Download width="14" height="14" style={{ color: 'var(--gold, #d4af37)' }} />
            <span>Descargar Plantilla</span>
          </button>
        </div>

        {/* Zona de Drop / Carga de archivo */}
        {!file && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '36px 20px',
              border: `2px dashed ${isDragOver ? 'var(--gold, #d4af37)' : 'rgba(255, 255, 255, 0.15)'}`,
              borderRadius: 'var(--radius-xl)',
              background: isDragOver ? 'rgba(212, 175, 55, 0.08)' : 'rgba(0, 0, 0, 0.25)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textAlign: 'center',
              gap: '10px'
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileChange(f);
              }}
            />
            <div 
              style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '50%', 
                background: 'rgba(212, 175, 55, 0.12)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'var(--gold, #d4af37)'
              }}
            >
              <UploadCloud width="24" height="24" />
            </div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
              Haz clic para seleccionar o arrastra tu archivo Excel aquí
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Formatos soportados: .xlsx, .xls, .csv
            </div>
          </div>
        )}

        {/* Cargando parseo */}
        {isParsing && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '30px' }}>
            <Loader2 className="animate-spin" width="20" height="20" style={{ color: 'var(--gold)' }} />
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Leyendo y validando archivo...</span>
          </div>
        )}

        {/* Vista previa de archivo cargado */}
        {file && !isParsing && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            
            {/* Tarjeta del archivo seleccionado */}
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileSpreadsheet width="20" height="20" style={{ color: '#22c55e' }} />
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{file.name}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{(file.size / 1024).toFixed(1)} KB</div>
                </div>
              </div>

              {!isImporting && !importSummary && (
                <button 
                  className="btn btn-ghost btn-sm btn-icon-only" 
                  onClick={handleReset} 
                  title="Cambiar archivo"
                >
                  <X width="16" height="16" />
                </button>
              )}
            </div>

            {/* Resumen de filas encontradas */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <div 
                style={{ 
                  flex: 1, 
                  minWidth: '120px', 
                  padding: '8px 12px', 
                  background: 'rgba(255, 255, 255, 0.03)', 
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <FileCheck width="16" height="16" style={{ color: 'var(--gold)' }} />
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Total Registros</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{parsedRows.length}</div>
                </div>
              </div>

              <div 
                style={{ 
                  flex: 1, 
                  minWidth: '120px', 
                  padding: '8px 12px', 
                  background: 'rgba(34, 197, 94, 0.08)', 
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(34, 197, 94, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <CheckCircle2 width="16" height="16" style={{ color: '#22c55e' }} />
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Válidos para importar</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#22c55e' }}>{validRows.length}</div>
                </div>
              </div>

              {invalidRows.length > 0 && (
                <div 
                  style={{ 
                    flex: 1, 
                    minWidth: '120px', 
                    padding: '8px 12px', 
                    background: 'rgba(239, 68, 68, 0.08)', 
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <AlertCircle width="16" height="16" style={{ color: '#ef4444' }} />
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Con errores</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#ef4444' }}>{invalidRows.length}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Tabla con Vista Previa */}
            <div 
              style={{ 
                maxHeight: '220px', 
                overflowY: 'auto', 
                border: '1px solid rgba(255, 255, 255, 0.1)', 
                borderRadius: 'var(--radius-md)',
                background: 'rgba(0, 0, 0, 0.2)'
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ background: '#000000', color: '#ffffff', textAlign: 'left' }}>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>#</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Nombre</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Categoría</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Precio</th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      {isProduct ? 'Stock' : 'Duración'}
                    </th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 30).map((row) => (
                    <tr 
                      key={row._index}
                      style={{ 
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        background: !row.isValid ? 'rgba(239, 68, 68, 0.08)' : 'transparent'
                      }}
                    >
                      <td style={{ padding: '6px 10px', color: 'var(--text-secondary)' }}>{row._index}</td>
                      <td style={{ padding: '6px 10px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {row.name || <span style={{ color: 'var(--danger)', fontStyle: 'italic' }}>Sin nombre</span>}
                      </td>
                      <td style={{ padding: '6px 10px', color: 'var(--text-secondary)' }}>
                        {row.categoryName || 'General'}
                      </td>
                      <td style={{ padding: '6px 10px', color: 'var(--text-primary)' }}>
                        ${Number(row.price).toLocaleString('es-CO')}
                      </td>
                      <td style={{ padding: '6px 10px', color: 'var(--text-secondary)' }}>
                        {isProduct ? `${row.stock ?? 0} uds` : `${row.duration ?? 30} min`}
                      </td>
                      <td style={{ padding: '6px 10px' }}>
                        <span 
                          style={{ 
                            fontSize: '9px', 
                            padding: '2px 6px', 
                            borderRadius: '4px',
                            fontWeight: 600,
                            background: row.status === 'active' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.1)',
                            color: row.status === 'active' ? '#22c55e' : 'var(--text-secondary)'
                          }}
                        >
                          {row.status === 'active' ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedRows.length > 30 && (
                <div style={{ padding: '6px 10px', textAlign: 'center', fontSize: '10px', color: 'var(--text-secondary)' }}>
                  ... y {parsedRows.length - 30} registros más.
                </div>
              )}
            </div>

            {/* Barra de progreso de importación */}
            {isImporting && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  <span>Importando registros a la base de datos...</span>
                  <span style={{ fontWeight: 600 }}>{progress}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: `${progress}%`, 
                      height: '100%', 
                      background: 'var(--gold, #d4af37)',
                      transition: 'width 0.2s ease'
                    }} 
                  />
                </div>
              </div>
            )}

            {/* Resumen tras finalizar */}
            {importSummary && (
              <div 
                style={{ 
                  padding: '12px', 
                  borderRadius: 'var(--radius-md)', 
                  background: 'rgba(34, 197, 94, 0.12)', 
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <CheckCircle2 width="20" height="20" style={{ color: '#22c55e' }} />
                <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                  Importación completada: <strong>{importSummary.successCount}</strong> de <strong>{importSummary.total}</strong> registros guardados.
                </div>
              </div>
            )}

          </div>
        )}

        {/* Botones de acción */}
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            gap: '10px', 
            marginTop: '8px', 
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '14px'
          }}
        >
          <button 
            type="button" 
            className="btn btn-outline" 
            onClick={handleClose} 
            disabled={isImporting}
          >
            {importSummary ? 'Cerrar' : 'Cancelar'}
          </button>

          {file && !importSummary && (
            <button
              type="button"
              className="btn btn-primary d-flex items-center gap-2"
              onClick={handleExecuteImport}
              disabled={validRows.length === 0 || isImporting}
            >
              {isImporting ? (
                <>
                  <Loader2 className="animate-spin" width="16" height="16" />
                  <span>Importando...</span>
                </>
              ) : (
                <>
                  <UploadCloud width="16" height="16" />
                  <span>Importar ({validRows.length}) Registros</span>
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </Modal>
  );
}
