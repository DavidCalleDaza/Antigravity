import React, { useState, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { APP_CONFIG } from '../../config/appConfig';
import Helpers from '../../utils/helpers';

const Table = ({ 
  columns = [], 
  data = [], 
  pageSize = APP_CONFIG.DEFAULT_PAGE_SIZE,
  searchable = true,
  onRowClick = null,
  actions = null,
  footer = null
}) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Filter and Sort Data
  const filteredData = useMemo(() => {
    let result = [...data];

    // Search
    if (search) {
      const lowerSearch = search.toLowerCase();
      result = result.filter(row =>
        columns.some(col => {
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
  }, [data, search, sortConfig, columns]);

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

  const allCols = actions 
    ? [...columns, { key: '_actions', label: 'Acciones', sortable: false }] 
    : columns;

  return (
    <div className="table-wrapper">
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              {allCols.map((col, idx) => (
                <th 
                  key={idx}
                  className={col.sortable !== false ? 'sortable' : ''} 
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  style={col.width ? { width: col.width } : {}}
                >
                  {col.label}
                  {col.sortable !== false && sortConfig.key === col.key && (
                    sortConfig.direction === 'asc' ? 
                    <ChevronUp width="14" height="14" style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '4px' }} /> : 
                    <ChevronDown width="14" height="14" style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '4px' }} />
                  )}
                </th>
              ))}
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
            ) : paginatedData.map((row, idx) => (
              <tr 
                key={row.id || idx} 
                className={onRowClick ? 'cursor-pointer' : ''}
                onClick={() => onRowClick && onRowClick(row)}
              >
                {columns.map((col, cIdx) => (
                  <td key={cIdx}>{col.render ? col.render(row[col.key], row) : (row[col.key] ?? '-')}</td>
                ))}
                {actions && <td>{actions(row)}</td>}
              </tr>
            ))}
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
    </div>
  );
};

export default Table;
