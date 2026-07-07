/* ============================================
   SERVINOW — Helper Utilities
   Formatting, validation, and common functions
   ============================================ */

const Helpers = {
  /**
   * Format currency value
   * @param {number} value
   * @param {string} currency
   * @returns {string}
   */
  formatCurrency(value, currency = APP_CONFIG.CURRENCY) {
    return new Intl.NumberFormat(APP_CONFIG.LOCALE, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  },

  /**
   * Format number with locale
   * @param {number} value
   * @returns {string}
   */
  formatNumber(value) {
    return new Intl.NumberFormat(APP_CONFIG.LOCALE).format(value);
  },

  /**
   * Format percentage
   * @param {number} value
   * @param {number} decimals
   * @returns {string}
   */
  formatPercent(value, decimals = 1) {
    return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
  },

  /**
   * Format date
   * @param {Date|string} date
   * @param {string} format - 'short', 'long', 'relative'
   * @returns {string}
   */
  formatDate(date, format = 'short') {
    const d = new Date(date);
    
    if (format === 'relative') {
      return this.timeAgo(d);
    }
    
    const options = format === 'long'
      ? { year: 'numeric', month: 'long', day: 'numeric' }
      : { year: 'numeric', month: 'short', day: 'numeric' };
    
    return d.toLocaleDateString(APP_CONFIG.LOCALE, options);
  },

  /**
   * Format time
   * @param {Date|string} date
   * @returns {string}
   */
  formatTime(date) {
    return new Date(date).toLocaleTimeString(APP_CONFIG.LOCALE, {
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  /**
   * Relative time ago
   * @param {Date} date
   * @returns {string}
   */
  timeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    const intervals = [
      { label: 'año', seconds: 31536000 },
      { label: 'mes', seconds: 2592000 },
      { label: 'semana', seconds: 604800 },
      { label: 'día', seconds: 86400 },
      { label: 'hora', seconds: 3600 },
      { label: 'minuto', seconds: 60 }
    ];

    for (const interval of intervals) {
      const count = Math.floor(seconds / interval.seconds);
      if (count >= 1) {
        const plural = count > 1 ? (interval.label.endsWith('s') ? 'es' : 's') : '';
        return `hace ${count} ${interval.label}${plural}`;
      }
    }
    return 'hace un momento';
  },

  /**
   * Generate unique ID
   * @param {string} prefix
   * @returns {string}
   */
  generateId(prefix = 'sn') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  },

  /**
   * Debounce function
   * @param {Function} fn
   * @param {number} delay
   * @returns {Function}
   */
  debounce(fn, delay = 300) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  },

  /**
   * Truncate text
   * @param {string} text
   * @param {number} maxLength
   * @returns {string}
   */
  truncate(text, maxLength = 50) {
    if (!text || text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  },

  /**
   * Capitalize first letter
   * @param {string} str
   * @returns {string}
   */
  capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  /**
   * Get initials from name
   * @param {string} name
   * @returns {string}
   */
  getInitials(name) {
    if (!name) return '';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  },

  /**
   * Simple email validation
   * @param {string} email
   * @returns {boolean}
   */
  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  /**
   * Clamp value between min and max
   * @param {number} value
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  },

  /**
   * Random integer between min and max (inclusive)
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  /**
   * Intersection Observer for reveal animations
   */
  initRevealAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(el => {
      observer.observe(el);
    });
  }
};
