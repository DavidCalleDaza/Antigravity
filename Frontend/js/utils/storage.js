/* ============================================
   SERVINOW — LocalStorage Wrapper
   Simulates persistence for the template
   ============================================ */

const Storage = {
  PREFIX: 'servinow_',

  /**
   * Get item from storage
   * @param {string} key
   * @param {*} defaultValue
   * @returns {*}
   */
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(this.PREFIX + key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  /**
   * Set item in storage
   * @param {string} key
   * @param {*} value
   */
  set(key, value) {
    try {
      localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.warn('Storage: Failed to save', key, e);
    }
  },

  /**
   * Remove item from storage
   * @param {string} key
   */
  remove(key) {
    localStorage.removeItem(this.PREFIX + key);
  },

  /**
   * Clear all Servinow data
   */
  clear() {
    Object.keys(localStorage)
      .filter(k => k.startsWith(this.PREFIX))
      .forEach(k => localStorage.removeItem(k));
  },

  /**
   * Get current theme
   * @returns {string}
   */
  getTheme() {
    return this.get('theme', 'light');
  },

  /**
   * Set theme
   * @param {string} theme
   */
  setTheme(theme) {
    this.set('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  },

  /**
   * Toggle theme
   * @returns {string} new theme
   */
  toggleTheme() {
    const current = this.getTheme();
    const next = current === 'light' ? 'dark' : 'light';
    this.setTheme(next);
    return next;
  },

  /**
   * Get current user (simulated)
   * @returns {object}
   */
  getCurrentUser() {
    return this.get('currentUser', {
      id: 'usr_001',
      name: 'David Calle',
      email: 'david@servinow.com',
      role: 'admin',
      avatar: null
    });
  },

  /**
   * Get sidebar state
   * @returns {boolean}
   */
  isSidebarCollapsed() {
    return this.get('sidebarCollapsed', false);
  },

  /**
   * Set sidebar state
   * @param {boolean} collapsed
   */
  setSidebarCollapsed(collapsed) {
    this.set('sidebarCollapsed', collapsed);
  }
};
