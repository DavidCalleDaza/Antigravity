/* ============================================
   SERVINOW — App Configuration
   Global constants, roles, and settings
   ============================================ */

const APP_CONFIG = {
  name: 'Servinow',
  tagline: 'Servir es el único negocio donde todos ganan',
  version: '1.0.0',
  
  // Roles del sistema
  ROLES: {
    ADMIN: 'admin',
    SELLER: 'seller',
    CLIENT: 'client'
  },

  ROLE_LABELS: {
    admin: 'Administrador',
    seller: 'Vendedor',
    client: 'Cliente'
  },

  // Estados de productos
  PRODUCT_STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    OUT_OF_STOCK: 'out_of_stock'
  },

  PRODUCT_STATUS_LABELS: {
    active: 'Activo',
    inactive: 'Inactivo',
    out_of_stock: 'Agotado'
  },

  // Estados de facturas
  INVOICE_STATUS: {
    PAID: 'paid',
    PENDING: 'pending',
    OVERDUE: 'overdue',
    CANCELLED: 'cancelled'
  },

  INVOICE_STATUS_LABELS: {
    paid: 'Pagada',
    pending: 'Pendiente',
    overdue: 'Vencida',
    cancelled: 'Cancelada'
  },

  // Estados de agenda
  AGENDA_STATUS: {
    FREE: 'free',
    PENDING: 'pending',
    BUSY: 'busy',
    BLOCKED: 'blocked'
  },

  AGENDA_STATUS_LABELS: {
    free: 'Libre',
    pending: 'Pendiente',
    busy: 'Ocupado',
    blocked: 'Bloqueado'
  },

  // Categorías genéricas
  CATEGORIES: [
    'Alimentos', 'Bebidas', 'Ropa', 'Calzado', 'Tecnología',
    'Hogar', 'Salud', 'Belleza', 'Deportes', 'Mascotas',
    'Papelería', 'Servicios', 'Otros'
  ],

  // Moneda por defecto
  CURRENCY: 'COP',
  CURRENCY_SYMBOL: '$',
  LOCALE: 'es-CO',

  // Paginación
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [5, 10, 25, 50],

  // Colores para gráficos (paleta Servinow)
  CHART_COLORS: [
    '#14b8a6', '#f59e0b', '#f97316', '#0f766e',
    '#fcd34d', '#10b981', '#3b82f6', '#8b5cf6',
    '#ec4899', '#64748b'
  ],

  // Navigation items
  NAV_ITEMS: [
    {
      section: 'Principal',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard', page: 'dashboard.html' },
        { id: 'wall', label: 'Muro Social', icon: 'heart-handshake', page: 'wall.html', badge: null }
      ]
    },
    {
      section: 'Gestión',
      items: [
        { id: 'products', label: 'Productos', icon: 'package', page: 'products.html' },
        { id: 'services', label: 'Servicios', icon: 'wrench', page: 'services.html' },
        { id: 'billing', label: 'Facturación', icon: 'file-text', page: 'billing.html' }
      ]
    },
    {
      section: 'Análisis',
      items: [
        { id: 'statistics', label: 'Estadísticas', icon: 'bar-chart-3', page: 'statistics.html' },
        { id: 'market', label: 'Mercadeo', icon: 'trending-up', page: 'market.html' }
      ]
    },
    {
      section: 'Planificación',
      items: [
        { id: 'agenda', label: 'Agenda', icon: 'calendar', page: 'agenda.html' }
      ]
    }
  ]
};

// Freeze config to prevent mutations
Object.freeze(APP_CONFIG);
