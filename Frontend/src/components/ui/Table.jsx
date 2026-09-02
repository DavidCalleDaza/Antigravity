import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Inbox, GripVertical } from 'lucide-react';
import { APP_CONFIG } from '../../config/appConfig';
import Helpers from '../../utils/helpers';

const Table = ({ 
  columns = [], 
  data = [], 
  pageSize = APP_CONFIG.DEFAULT_PAGE_SIZE,
  searchable = true,
  onRowClick = null,
  actions = null,
  footer = null,
  enableDragAndDrop = true
}) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Column order state
  const [colOrder, setColOrder] = useState(columns);

  useEffect(() => {
    setColOrder(columns);
  }, [columns]);

  // Data order state
  const [tableData, setTableData] = useState(data);

  useEffect(() => {
    setTableData(data);
  }, [data]);

  // Drag and Drop States for Columns
  const dragColIdx = useRef(null);
  const [dragOverColIdx, setDragOverColIdx] = useState(null);

  // Drag and Drop States for Rows
  const dragRowIdx = useRef(null);
  const [dragOverRowIdx, setDragOverRowIdx] = useState(null);

  // Filter and Sort Data
  const filteredData = useMemo(() => {
    let result = [...tableData];

    // Search
    if (search) {
      const lowerSearch = search.toLowerCase();
      result = result.filter(row =>
        colOrder.some(col => {
          const val = row[col.key];
          return val && String(val).toLowerCase().includes(lowerSearch);
        })
      );
    }

    // Sort
    if (sortConfig.key) {
      result.sort((a, b) => {
        const va = a[sortConfig.key];
        const vb = b[sortConfig.key];
        
        let cmp = 0;
        if (typeof va === 'number' && typeof vb === 'number') {
          cmp = va - vb;
        } else {
          cmp = String(va).localeCompare(String(vb));
        }
        
        return sortConfig.direction === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [tableData, search, sortConfig, colOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page, pageSize]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Drag Handlers for Columns
  const handleColDragStart = (e, index) => {
    dragColIdx.current = index;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleColDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColIdx !== index) {
      setDragOverColIdx(index);
    }
  };

  const handleColDrop = (e, dropIndex) => {
    e.preventDefault();
    const startIndex = dragColIdx.current;
    if (startIndex !== null && startIndex !== dropIndex) {
      setColOrder((prevCols) => {
        const newCols = [...prevCols];
        const [movedCol] = newCols.splice(startIndex, 1);
        newCols.splice(dropIndex, 0, movedCol);
        return newCols;
      });
    }
    dragColIdx.current = null;
    setDragOverColIdx(null);
  };

  const handleColDragEnd = () => {
    dragColIdx.current = null;
    setDragOverColIdx(null);
  };

  // Drag Handlers for Rows
  const handleRowDragStart = (e, index) => {
    dragRowIdx.current = index;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleRowDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverRowIdx !== index) {
      setDragOverRowIdx(index);
    }
  };

  const handleRowDrop = (e, dropIndex) => {
    e.preventDefault();
    const startIndex = dragRowIdx.current;
    if (startIndex !== null && startIndex !== dropIndex) {
      const draggedItem = paginatedData[startIndex];
      const targetItem = paginatedData[dropIndex];

      if (draggedItem && targetItem) {
        setTableData((prevData) => {
          const newData = [...prevData];
          const actualStart = newData.findIndex(r => (r.id ? r.id === draggedItem.id : r === draggedItem));
          const actualDrop = newData.findIndex(r => (r.id ? r.id === targetItem.id : r === targetItem));
          
          if (actualStart !== -1 && actualDrop !== -1) {
            const [moved] = newData.splice(actualStart, 1);
            newData.splice(actualDrop, 0, moved);
          }
          return newData;
        });
      }
    }
    dragRowIdx.current = null;
    setDragOverRowIdx(null);
  };

  const handleRowDragEnd = () => {
    dragRowIdx.current = null;
    setDragOverRowIdx(null);
  };

  const allCols = [
    ...(enableDragAndDrop ? [{ key: '_drag_handle', label: '', sortable: false, width: '32px' }] : []),
    ...colOrder,
    ...(actions ? [{ key: '_actions', label: 'Acciones', sortable: false, width: '120px' }] : []),
  ];

  return (
    <div className="table-wrapper">
      <div className="table-container">
        <table className="table">
          <colgroup>
            {allCols.map((col, idx) => (
              <col key={idx} style={col.width ? { width: col.width } : {}} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {allCols.map((col, idx) => {
                const isDataCol = col.key !== '_drag_handle' && col.key !== '_actions';
                const colDataIdx = colOrder.findIndex(c => c.key === col.key);
                const isOver = isDataCol && dragOverColIdx === colDataIdx;

                return (
                  <th 
                    key={idx}
                    className={`${col.sortable !== false ? 'sortable' : ''} ${isOver ? 'col-drag-over' : ''}`} 
                    draggable={enableDragAndDrop && isDataCol}
                    onDragStart={(e) => isDataCol && handleColDragStart(e, colDataIdx)}
                    onDragOver={(e) => isDataCol && handleColDragOver(e, colDataIdx)}
                    onDrop={(e) => isDataCol && handleColDrop(e, colDataIdx)}
                    onDragEnd={handleColDragEnd}
                    onClick={() => col.sortable !== false && handleSort(col.key)}
                    style={isDataCol && enableDragAndDrop ? { cursor: 'grab' } : {}}
                  >
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px', width: '100%' }}>
                      {enableDragAndDrop && isDataCol && (
                        <GripVertical width="12" height="12" style={{ opacity: 0.4 }} />
                      )}
                      <span>{col.label}</span>
                      {col.sortable !== false && sortConfig.key === col.key && (
                        sortConfig.direction === 'asc' ? 
                        <ChevronUp width="14" height="14" style={{ display: 'inline', verticalAlign: 'middle' }} /> : 
                        <ChevronDown width="14" height="14" style={{ display: 'inline', verticalAlign: 'middle' }} />
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={allCols.length} style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
                  <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
                    <div className="empty-state-icon"><Inbox width="48" height="48" /></div>
                    <div className="empty-state-title">Sin resultados</div>
                    <div className="empty-state-text">No se encontraron registros.</div>
                  </div>
                </td>
              </tr>
            ) : paginatedData.map((row, idx) => {
              const isRowOver = dragOverRowIdx === idx;
              const isRowDragging = dragRowIdx.current === idx;

              return (
                <tr 
                  key={row.id || idx} 
                  className={`${onRowClick ? 'cursor-pointer' : ''} ${isRowOver ? 'row-drag-over' : ''} ${isRowDragging ? 'row-dragging' : ''}`}
                  draggable={enableDragAndDrop}
                  onDragStart={(e) => enableDragAndDrop && handleRowDragStart(e, idx)}
                  onDragOver={(e) => enableDragAndDrop && handleRowDragOver(e, idx)}
                  onDrop={(e) => enableDragAndDrop && handleRowDrop(e, idx)}
                  onDragEnd={handleRowDragEnd}
                  onClick={() => onRowClick && onRowClick(row)}
                >
                  {enableDragAndDrop && (
                    <td style={{ textAlign: 'center', padding: '0 4px', cursor: 'grab' }} title="Arrastrar para reordenar registro">
                      <GripVertical width="14" height="14" style={{ opacity: 0.4 }} />
                    </td>
                  )}
                  {colOrder.map((col, cIdx) => (
                    <td key={cIdx} style={{ textAlign: 'center' }}>{col.render ? col.render(row[col.key], row) : (row[col.key] ?? '-')}</td>
                  ))}
                  {actions && <td style={{ textAlign: 'center' }}>{actions(row)}</td>}
                </tr>
              );
            })}
          </tbody>
          {footer && paginatedData.length > 0 && (
            <tfoot>
              {footer({ paginatedData, filteredData, allColsCount: allCols.length })}
            </tfoot>
          )}
        </table>
      </div>

      {totalPages > 1 && (
        <div className="d-flex justify-between items-center mt-4" style={{ flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <small className="text-secondary">Página {page} de {totalPages}</small>
          <div className="pagination">
            <button 
              className="pagination-btn" 
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft width="16" height="16" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let p;
              if (totalPages <= 5) p = i + 1;
              else if (page <= 3) p = i + 1;
              else if (page >= totalPages - 2) p = totalPages - 4 + i;
              else p = page - 2 + i;
              return (
                <button 
                  key={i}
                  className={`pagination-btn ${p === page ? 'active' : ''}`} 
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              );
            })}
            <button 
              className="pagination-btn" 
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
            >
              <ChevronRight width="16" height="16" />
            </button>
          </div>
        </div>
      )}

      <style>{`
        .col-drag-over {
          border-left: 2px solid var(--primary, #3EB489) !important;
          background: rgba(62, 180, 137, 0.15) !important;
        }
        .row-drag-over {
          border-top: 2px solid var(--primary, #3EB489) !important;
          background: rgba(62, 180, 137, 0.12) !important;
        }
        .row-dragging {
          opacity: 0.4;
        }
      `}</style>
    </div>
  );
};

export default Table;

