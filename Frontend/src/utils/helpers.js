import { APP_CONFIG } from '../config/appConfig';
import { SERVER_BASE_URL } from './apiClient';

export const Helpers = {
  formatCurrency(value, currency = APP_CONFIG.CURRENCY) {
    return new Intl.NumberFormat(APP_CONFIG.LOCALE, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  },

  formatNumber(value) {
    return new Intl.NumberFormat(APP_CONFIG.LOCALE).format(value);
  },

  formatPercent(value, decimals = 1) {
    return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
  },

  parseDate(date) {
    if (!date) return null;
    if (date instanceof Date) {
      return isNaN(date.getTime()) ? null : date;
    }
    if (typeof date === 'string') {
      const trimmed = date.trim();
      if (!trimmed) return null;
      // Reemplaza espacio con 'T' para compatibilidad estricta con Safari/WebKit
      const normalized = trimmed.includes(' ') && !trimmed.includes('T') ? trimmed.replace(' ', 'T') : trimmed;
      const parsed = new Date(normalized);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    if (typeof date === 'number') {
      const parsed = new Date(date);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  },

  formatDate(date, format = 'short') {
    const d = this.parseDate(date);
    if (!d) return '';
    
    if (format === 'relative') {
      return this.timeAgo(d);
    }
    
    const options = format === 'long'
      ? { year: 'numeric', month: 'long', day: 'numeric' }
      : { year: 'numeric', month: 'short', day: 'numeric' };
    
    try {
      return d.toLocaleDateString(APP_CONFIG.LOCALE, options);
    } catch {
      return '';
    }
  },

  formatTime(date) {
    const d = this.parseDate(date);
    if (!d) return '';
    try {
      return d.toLocaleTimeString(APP_CONFIG.LOCALE, {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  },

  timeAgo(date) {
    const d = this.parseDate(date);
    if (!d) return 'hace un momento';

    const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
    if (isNaN(seconds) || seconds < 5) {
      return 'hace un momento';
    }

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

  generateId(prefix = 'sn') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  },

  debounce(fn, delay = 300) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  },

  truncate(text, maxLength = 50) {
    if (!text || text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  },

  capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  getInitials(name) {
    if (!name) return '';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  },

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  },

  randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

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

    // Retornamos el observer para que el caller pueda hacer disconnect()
    // y evitar acumulación en memoria (crítico en iOS con memoria limitada).
    return observer;
  },

  resolveMediaUrl(url) {
    if (!url) return null;
    if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) {
      return url;
    }
    // Si empieza con /, asumimos que es una ruta relativa del servidor
    return `${SERVER_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  }
};

export default Helpers;
