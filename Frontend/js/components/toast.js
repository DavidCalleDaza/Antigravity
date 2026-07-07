/* ============================================
   SERVINOW — Toast Notification Component
   Non-blocking notification system
   ============================================ */

const Toast = {
  container: null,

  init() {
    if (this.container) return;
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    this.container.id = 'toast-container';
    document.body.appendChild(this.container);
  },

  /**
   * Show a toast notification
   * @param {object} options
   * @param {string} options.title
   * @param {string} options.message
   * @param {string} options.type - 'success', 'error', 'warning', 'info'
   * @param {number} options.duration - ms (default 4000)
   */
  show({ title = '', message = '', type = 'info', duration = 4000 }) {
    this.init();

    const icons = {
      success: 'check-circle',
      error: 'x-circle',
      warning: 'alert-triangle',
      info: 'info'
    };

    const id = Helpers.generateId('toast');
    const html = `
      <div class="toast ${type}" id="${id}">
        <span class="toast-icon">
          <i data-lucide="${icons[type]}" width="20" height="20"></i>
        </span>
        <div class="toast-content">
          ${title ? `<div class="toast-title">${title}</div>` : ''}
          <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" aria-label="Cerrar">
          <i data-lucide="x" width="16" height="16"></i>
        </button>
      </div>
    `;

    this.container.insertAdjacentHTML('beforeend', html);
    if (typeof lucide !== 'undefined') lucide.createIcons();

    const toastEl = document.getElementById(id);
    const closeBtn = toastEl.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => this.dismiss(id));

    // Auto dismiss
    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }

    return id;
  },

  dismiss(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('removing');
    setTimeout(() => el.remove(), 250);
  },

  success(message, title = 'Éxito') { return this.show({ title, message, type: 'success' }); },
  error(message, title = 'Error') { return this.show({ title, message, type: 'error' }); },
  warning(message, title = 'Atención') { return this.show({ title, message, type: 'warning' }); },
  info(message, title = 'Info') { return this.show({ title, message, type: 'info' }); }
};
