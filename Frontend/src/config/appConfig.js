export const APP_CONFIG = {
  name: '',
  tagline: 'Servir es el único negocio donde todos ganan',
  version: '1.0.0',
  
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

  AGENDA_STATUS: {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    CANCELLED: 'cancelled',
    COMPLETED: 'completed'
  },

  AGENDA_STATUS_LABELS: {
    pending: 'Pendiente',
    confirmed: 'Confirmada',
    cancelled: 'Cancelada',
    completed: 'Completada'
  },

  CATEGORIES: [
    'Alimentos', 'Bebidas', 'Ropa', 'Calzado', 'Tecnología',
    'Hogar', 'Salud', 'Belleza', 'Deportes', 'Mascotas',
    'Papelería', 'Servicios', 'Otros'
  ],

  CURRENCY: 'COP',
  CURRENCY_SYMBOL: '$',
  LOCALE: 'es-CO',

  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [5, 10, 25, 50],

  CHART_COLORS: [
    '#14b8a6', '#f59e0b', '#f97316', '#0f766e',
    '#fcd34d', '#10b981', '#3b82f6', '#8b5cf6',
    '#ec4899', '#64748b'
  ],

  WHATSAPP: {
    TEST_PHONE: '+1 555 180 3391',
  },

  NAV_ITEMS: [
    {
      section: 'Principal',
      items: [
        { id: 'wall', label: 'Muro de Impacto', icon: 'Sprout', page: '/wall', badge: null }
      ]
    },
    {
      section: 'Gestión',
      items: [
        { id: 'products', label: 'Productos', icon: 'Package', page: '/products' },
        { id: 'services', label: 'Servicios', icon: 'Wrench', page: '/services' },
        { id: 'billing', label: 'Facturación', icon: 'FileText', page: '/billing' }
      ]
    },
    {
      section: 'Análisis',
      items: [
        { id: 'statistics', label: 'Estadísticas', icon: 'BarChart3', page: '/statistics' },
        { id: 'market', label: 'Mercadeo', icon: 'TrendingUp', page: '/market' }
      ]
    },
    {
      section: 'Planificación',
      items: [
        { id: 'agenda', label: 'Agenda', icon: 'Calendar', page: '/agenda' }
      ]
    }
  ]
};

Object.freeze(APP_CONFIG);
