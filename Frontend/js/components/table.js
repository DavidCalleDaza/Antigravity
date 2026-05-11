/* ============================================
   SERVINOW — Table Component
   Dynamic table with sort, search, pagination
   ============================================ */

const Table = {
  /**
   * Create a dynamic table
   * @param {object} config
   * @param {string} config.containerId - Target container ID
   * @param {Array} config.columns - [{key, label, sortable, render}]
   * @param {Array} config.data - Row data
   * @param {number} config.pageSize - Items per page
   * @param {boolean} config.searchable - Enable search
   * @param {Function} config.onRowClick - Row click handler
   * @param {Function} config.actions - Row actions renderer
   */
  create(config) {
    const {
      containerId,
      columns = [],
      data = [],
      pageSize = APP_CONFIG.DEFAULT_PAGE_SIZE,
      searchable = true,
      onRowClick = null,
      actions = null
    } = config;

    const container = document.getElementById(containerId);
    if (!container) return;

    const state = {
      data: [...data],
      filtered: [...data],
      page: 1,
      pageSize,
      sortKey: null,
      sortDir: 'asc',
      search: ''
    };

    function render() {
      const start = (state.page - 1) * state.pageSize;
      const end = start + state.pageSize;
      const pageData = state.filtered.slice(start, end);
      const totalPages = Math.ceil(state.filtered.length / state.pageSize);

      const allCols = actions 
        ? [...columns, { key: '_actions', label: 'Acciones', sortable: false }] 
        : columns;

      container.innerHTML = `
        ${searchable ? `
          <div class="d-flex justify-between items-center gap-4 mb-4" style="flex-wrap:wrap">
            <div class="input-group" style="max-width:320px;flex:1">
              <span class="input-icon"><i data-lucide="search" width="16" height="16"></i></span>
              <input type="text" class="form-input search-input" placeholder="Buscar..." id="${containerId}-search" value="${state.search}">
            </div>
            <small class="text-secondary">${state.filtered.length} resultado${state.filtered.length !== 1 ? 's' : ''}</small>
          </div>
        ` : ''}
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                ${allCols.map(col => `
                  <th class="${col.sortable !== false ? 'sortable' : ''}" data-sort="${col.key}">
                    ${col.label}
                    ${col.sortable !== false && state.sortKey === col.key ? 
                      `<i data-lucide="${state.sortDir === 'asc' ? 'chevron-up' : 'chevron-down'}" width="14" height="14" style="display:inline;vertical-align:middle"></i>` : ''}
                  </th>
                `).join('')}
              </tr>
            </thead>
            <tbody>
              ${pageData.length === 0 ? `
                <tr><td colspan="${allCols.length}" style="text-align:center;padding:var(--space-12)">
                  <div class="empty-state" style="padding:var(--space-8)">
                    <div class="empty-state-icon"><i data-lucide="inbox" width="48" height="48"></i></div>
                    <div class="empty-state-title">Sin resultados</div>
                    <div class="empty-state-text">No se encontraron registros.</div>
                  </div>
                </td></tr>
              ` : pageData.map(row => `
                <tr data-id="${row.id}" ${onRowClick ? 'class="cursor-pointer"' : ''}>
                  ${columns.map(col => `
                    <td>${col.render ? col.render(row[col.key], row) : (row[col.key] ?? '-')}</td>
                  `).join('')}
                  ${actions ? `<td>${actions(row)}</td>` : ''}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        ${totalPages > 1 ? `
          <div class="d-flex justify-between items-center mt-4" style="flex-wrap:wrap;gap:var(--space-4)">
            <small class="text-secondary">Página ${state.page} de ${totalPages}</small>
            <div class="pagination">
              <button class="pagination-btn" data-page="prev" ${state.page <= 1 ? 'disabled' : ''}>
                <i data-lucide="chevron-left" width="16" height="16"></i>
              </button>
              ${Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let p;
                if (totalPages <= 5) { p = i + 1; }
                else if (state.page <= 3) { p = i + 1; }
                else if (state.page >= totalPages - 2) { p = totalPages - 4 + i; }
                else { p = state.page - 2 + i; }
                return `<button class="pagination-btn ${p === state.page ? 'active' : ''}" data-page="${p}">${p}</button>`;
              }).join('')}
              <button class="pagination-btn" data-page="next" ${state.page >= totalPages ? 'disabled' : ''}>
                <i data-lucide="chevron-right" width="16" height="16"></i>
              </button>
            </div>
          </div>
        ` : ''}
      `;

      // Re-render icons
      if (typeof lucide !== 'undefined') lucide.createIcons();

      // Bind search
      const searchInput = document.getElementById(`${containerId}-search`);
      if (searchInput) {
        searchInput.addEventListener('input', Helpers.debounce((e) => {
          state.search = e.target.value.toLowerCase();
          state.filtered = state.data.filter(row =>
            columns.some(col => {
              const val = row[col.key];
              return val && String(val).toLowerCase().includes(state.search);
            })
          );
          state.page = 1;
          render();
        }, 250));
      }

      // Bind sorting
      container.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', () => {
          const key = th.dataset.sort;
          if (state.sortKey === key) {
            state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
          } else {
            state.sortKey = key;
            state.sortDir = 'asc';
          }
          state.filtered.sort((a, b) => {
            const va = a[key], vb = b[key];
            const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb));
            return state.sortDir === 'asc' ? cmp : -cmp;
          });
          render();
        });
      });

      // Bind pagination
      container.querySelectorAll('.pagination-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const p = btn.dataset.page;
          if (p === 'prev') state.page = Math.max(1, state.page - 1);
          else if (p === 'next') state.page = Math.min(totalPages, state.page + 1);
          else state.page = parseInt(p);
          render();
        });
      });

      // Bind row clicks
      if (onRowClick) {
        container.querySelectorAll('tbody tr[data-id]').forEach(tr => {
          tr.addEventListener('click', (e) => {
            if (e.target.closest('button')) return;
            onRowClick(tr.dataset.id);
          });
        });
      }
    }

    render();

    // Return API for external updates
    return {
      refresh(newData) {
        state.data = [...newData];
        state.filtered = [...newData];
        state.page = 1;
        render();
      },
      getState: () => ({ ...state })
    };
  }
};
