/* ============================================
   SERVINOW — Sidebar Component
   Collapsible navigation sidebar
   ============================================ */

const Sidebar = {
  /**
   * Render sidebar into the app
   * @param {string} activePageId - Current page ID for active state
   */
  render(activePageId) {
    const app = document.querySelector('.app');
    if (!app) return;

    const user = Storage.getCurrentUser();
    const isCollapsed = Storage.isSidebarCollapsed();
    
    if (isCollapsed) {
      app.classList.add('sidebar-collapsed');
    }

    const navSections = APP_CONFIG.NAV_ITEMS.map(section => `
      <div class="sidebar-section">
        <div class="sidebar-section-title">${section.section}</div>
        ${section.items.map(item => `
          <a href="${item.page}" class="nav-item ${item.id === activePageId ? 'active' : ''}" data-page="${item.id}" data-tooltip="${item.label}">
            <span class="nav-item-icon">
              <i data-lucide="${item.icon}"></i>
            </span>
            <span class="nav-item-text">${item.label}</span>
            ${item.badge ? `<span class="nav-item-badge">${item.badge}</span>` : ''}
          </a>
        `).join('')}
      </div>
    `).join('');

    const sidebarHTML = `
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-header">
          <div class="sidebar-logo">
            <img src="/assets/logo.png" alt="Antigravity Logo" />
          </div>
          <span class="sidebar-brand"><span class="brand-text">Antigravity</span></span>
        </div>

        <nav class="sidebar-nav">
          ${navSections}
        </nav>

        <div class="sidebar-footer">
          <div class="sidebar-user" id="sidebar-user-menu">
            <div class="avatar avatar-sm">
              ${user.avatar ? `<img src="${user.avatar}" alt="${user.name}">` : Helpers.getInitials(user.name)}
            </div>
            <div class="sidebar-user-info">
              <div class="sidebar-user-name">${user.name}</div>
              <div class="sidebar-user-role">${APP_CONFIG.ROLE_LABELS[user.role]}</div>
            </div>
          </div>
        </div>
      </aside>
      <div class="sidebar-overlay" id="sidebar-overlay"></div>
    `;

    app.insertAdjacentHTML('afterbegin', sidebarHTML);
    this.bindEvents();
  },

  bindEvents() {
    const overlay = document.getElementById('sidebar-overlay');
    if (overlay) {
      overlay.addEventListener('click', () => this.closeMobile());
    }
  },

  toggle() {
    const app = document.querySelector('.app');
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
      app.classList.toggle('sidebar-open');
    } else {
      app.classList.toggle('sidebar-collapsed');
      Storage.setSidebarCollapsed(app.classList.contains('sidebar-collapsed'));
    }
  },

  closeMobile() {
    const app = document.querySelector('.app');
    app.classList.remove('sidebar-open');
  }
};
