/* ============================================
   SERVINOW — Modal Component
   Reusable modal dialog system
   ============================================ */

const Modal = {
  activeModal: null,

  /**
   * Open a modal
   * @param {object} options
   * @param {string} options.id - Unique modal ID
   * @param {string} options.title - Modal title
   * @param {string} options.content - HTML content
   * @param {string} options.size - 'sm', 'md', 'lg'
   * @param {Array} options.actions - [{label, class, onClick}]
   * @param {Function} options.onClose - Callback on close
   */
  open({ id = 'modal', title = '', content = '', size = 'md', actions = [], onClose = null }) {
    this.close(); // Close any existing modal

    const sizeClass = size === 'lg' ? 'modal-lg' : size === 'sm' ? 'modal-sm' : '';

    const actionsHTML = actions.map(action => `
      <button class="btn ${action.class || 'btn-outline'}" data-action="${action.id || ''}">${action.label}</button>
    `).join('');

    const html = `
      <div class="modal-overlay active" id="${id}-overlay">
        <div class="modal ${sizeClass}" id="${id}" role="dialog" aria-modal="true" aria-labelledby="${id}-title">
          <div class="modal-header">
            <h3 class="modal-title" id="${id}-title">${title}</h3>
            <button class="modal-close" id="${id}-close" aria-label="Cerrar">
              <i data-lucide="x" width="20" height="20"></i>
            </button>
          </div>
          <div class="modal-body" id="${id}-body">
            ${content}
          </div>
          ${actions.length > 0 ? `
            <div class="modal-footer" id="${id}-footer">
              ${actionsHTML}
            </div>
          ` : ''}
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
    this.activeModal = { id, onClose };

    // Render icons
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Bind close events
    const overlay = document.getElementById(`${id}-overlay`);
    const closeBtn = document.getElementById(`${id}-close`);

    closeBtn.addEventListener('click', () => this.close());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    });

    // Bind action buttons
    actions.forEach(action => {
      if (action.onClick) {
        const btn = overlay.querySelector(`[data-action="${action.id}"]`);
        if (btn) btn.addEventListener('click', action.onClick);
      }
    });

    // Escape key
    this._escHandler = (e) => {
      if (e.key === 'Escape') this.close();
    };
    document.addEventListener('keydown', this._escHandler);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    return overlay;
  },

  /**
   * Close active modal
   */
  close() {
    if (!this.activeModal) return;

    const overlay = document.getElementById(`${this.activeModal.id}-overlay`);
    if (overlay) {
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 250);
    }

    if (this.activeModal.onClose) {
      this.activeModal.onClose();
    }

    document.removeEventListener('keydown', this._escHandler);
    document.body.style.overflow = '';
    this.activeModal = null;
  },

  /**
   * Confirm dialog shorthand
   * @param {string} title
   * @param {string} message
   * @param {Function} onConfirm
   */
  confirm(title, message, onConfirm) {
    this.open({
      id: 'confirm-modal',
      title,
      content: `<p style="color: var(--text-secondary)">${message}</p>`,
      size: 'sm',
      actions: [
        { id: 'cancel', label: 'Cancelar', class: 'btn-outline', onClick: () => this.close() },
        { id: 'confirm', label: 'Confirmar', class: 'btn-danger', onClick: () => { onConfirm(); this.close(); } }
      ]
    });
  }
};
