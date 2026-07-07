/* ============================================
   SERVINOW — Navbar Component
   Top navigation bar with search & actions
   ============================================ */

const Navbar = {
  /**
   * Render navbar
   * @param {string} title - Page title
   * @param {Array} breadcrumb - [{label, href}]
   */
  render(title, breadcrumb = []) {
    const container = document.querySelector('.app-main');
    if (!container) return;

    const breadcrumbHTML = breadcrumb.length > 0 ? `
      <div class="navbar-breadcrumb">
        <a href="dashboard.html">Inicio</a>
        ${breadcrumb.map((item, i) => `
          <span class="separator">/</span>
          ${i === breadcrumb.length - 1 
            ? `<span>${item.label}</span>` 
            : `<a href="${item.href}">${item.label}</a>`}
        `).join('')}
      </div>
    ` : '';

    const navbarHTML = `
      <header class="navbar" id="navbar">
        <div class="navbar-left">
          <button class="navbar-toggle" id="sidebar-toggle" aria-label="Toggle sidebar">
            <i data-lucide="menu" width="20" height="20"></i>
          </button>
          <div>
            <h1 class="navbar-title">${title}</h1>
            ${breadcrumbHTML}
          </div>
        </div>

        <div class="navbar-right">
          <div class="navbar-search">
            <span class="search-icon">
              <i data-lucide="search" width="16" height="16"></i>
            </span>
            <input type="text" class="form-input search-input" placeholder="Buscar..." id="global-search">
          </div>

          <button class="navbar-notification" id="notifications-btn" data-tooltip="Notificaciones">
            <i data-lucide="bell" width="20" height="20"></i>
            <span class="notification-dot"></span>
          </button>

          <button class="theme-toggle" id="theme-toggle" data-tooltip="Cambiar tema">
            <i data-lucide="moon" width="20" height="20" id="theme-icon"></i>
          </button>
        </div>
      </header>
    `;

    container.insertAdjacentHTML('afterbegin', navbarHTML);
    this.bindEvents();
    this.updateThemeIcon();
  },

  bindEvents() {
    const toggleBtn = document.getElementById('sidebar-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => Sidebar.toggle());
    }

    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        Storage.toggleTheme();
        this.updateThemeIcon();
        // Re-render lucide icons after theme change
        if (typeof lucide !== 'undefined') {
          lucide.createIcons();
        }
      });
    }
  },

  updateThemeIcon() {
    const icon = document.getElementById('theme-icon');
    if (!icon) return;
    const theme = Storage.getTheme();
    icon.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon');
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }
};
