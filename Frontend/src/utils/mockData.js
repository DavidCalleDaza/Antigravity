export const MockData = {
  // ── Current User ──
  currentUser: {
    id: 'usr_001',
    name: 'David Calle',
    email: 'david@donapp.com',
    role: 'admin',
    avatar: null,
    business: 'DonApp HQ'
  },

  // ── Products ──
  products: [
    { id: 'prod_001', name: 'Café Orgánico Premium', category: 'Alimentos', price: 25000, stock: 150, status: 'active', description: 'Café cultivado por campesinos del Huila, 100% orgánico.', image: null, createdAt: '2026-03-15' },
    { id: 'prod_002', name: 'Panela Artesanal', category: 'Alimentos', price: 8000, stock: 300, status: 'active', description: 'Panela producida de forma tradicional en trapiche.', image: null, createdAt: '2026-03-18' },
    { id: 'prod_003', name: 'Miel de Abejas Pura', category: 'Alimentos', price: 35000, stock: 45, status: 'active', description: 'Miel 100% pura de apiarios locales.', image: null, createdAt: '2026-03-20' },
    { id: 'prod_004', name: 'Mochila Wayúu', category: 'Ropa', price: 120000, stock: 25, status: 'active', description: 'Mochila tejida a mano por artesanas Wayúu.', image: null, createdAt: '2026-04-01' },
    { id: 'prod_005', name: 'Jabón Artesanal de Sábila', category: 'Belleza', price: 12000, stock: 80, status: 'active', description: 'Jabón hecho a mano con ingredientes naturales.', image: null, createdAt: '2026-04-05' },
    { id: 'prod_006', name: 'Mermelada de Guayaba', category: 'Alimentos', price: 15000, stock: 0, status: 'out_of_stock', description: 'Mermelada casera de guayaba fresca.', image: null, createdAt: '2026-04-08' },
    { id: 'prod_007', name: 'Hamaca de Algodón', category: 'Hogar', price: 85000, stock: 12, status: 'active', description: 'Hamaca tejida en telar manual.', image: null, createdAt: '2026-04-10' },
    { id: 'prod_008', name: 'Chocolate de Mesa', category: 'Alimentos', price: 18000, stock: 200, status: 'active', description: 'Chocolate artesanal para preparar.', image: null, createdAt: '2026-04-12' },
    { id: 'prod_009', name: 'Sombrero Vueltiao', category: 'Ropa', price: 95000, stock: 8, status: 'active', description: 'Sombrero tradicional colombiano hecho en caña flecha.', image: null, createdAt: '2026-04-15' },
    { id: 'prod_010', name: 'Aceite de Coco Virgen', category: 'Salud', price: 22000, stock: 60, status: 'inactive', description: 'Aceite de coco prensado en frío.', image: null, createdAt: '2026-04-18' }
  ],

  // ── Services ──
  services: [
    { id: 'srv_001', name: 'Corte de Cabello', category: 'Belleza', price: 20000, duration: '30 min', status: 'active', description: 'Corte clásico o moderno.' },
    { id: 'srv_002', name: 'Reparación de Celulares', category: 'Tecnología', price: 50000, duration: '1 hora', status: 'active', description: 'Reparación de pantalla, batería y software.' },
    { id: 'srv_003', name: 'Clase de Yoga', category: 'Deportes', price: 30000, duration: '1 hora', status: 'active', description: 'Sesión grupal o personalizada.' },
    { id: 'srv_004', name: 'Asesoría Contable', category: 'Servicios', price: 80000, duration: '2 horas', status: 'active', description: 'Asesoría contable para pequeños negocios.' },
    { id: 'srv_005', name: 'Fotografía de Eventos', category: 'Servicios', price: 150000, duration: '4 horas', status: 'active', description: 'Cobertura fotográfica profesional.' }
  ],

  // ── Invoices ──
  invoices: [
    { id: 'inv_001', number: 'SN-2026-001', client: 'María García', items: 3, total: 68000, status: 'paid', date: '2026-04-28', dueDate: '2026-05-28' },
    { id: 'inv_002', number: 'SN-2026-002', client: 'Juan Rodríguez', items: 1, total: 120000, status: 'paid', date: '2026-04-27', dueDate: '2026-05-27' },
    { id: 'inv_003', number: 'SN-2026-003', client: 'Ana López', items: 5, total: 95000, status: 'pending', date: '2026-04-26', dueDate: '2026-05-26' },
    { id: 'inv_004', number: 'SN-2026-004', client: 'Carlos Pérez', items: 2, total: 43000, status: 'overdue', date: '2026-04-01', dueDate: '2026-04-15' },
    { id: 'inv_005', number: 'SN-2026-005', client: 'Luisa Martínez', items: 4, total: 210000, status: 'paid', date: '2026-04-25', dueDate: '2026-05-25' },
    { id: 'inv_006', number: 'SN-2026-006', client: 'Pedro Sánchez', items: 1, total: 35000, status: 'pending', date: '2026-04-30', dueDate: '2026-05-30' }
  ],

  // ── Agenda / Appointments ──
  appointments: [
    { id: 'apt_001', title: 'Corte - María García', date: '2026-05-01', time: '09:00', duration: 30, status: 'busy', client: 'María García' },
    { id: 'apt_002', title: 'Asesoría - Juan R.', date: '2026-05-01', time: '10:00', duration: 120, status: 'busy', client: 'Juan Rodríguez' },
    { id: 'apt_003', title: 'Pendiente de aprobar', date: '2026-05-01', time: '14:00', duration: 60, status: 'pending', client: 'Ana López' },
    { id: 'apt_004', title: 'Fotografía evento', date: '2026-05-02', time: '08:00', duration: 240, status: 'busy', client: 'Carlos Pérez' },
    { id: 'apt_005', title: 'Yoga grupal', date: '2026-05-02', time: '16:00', duration: 60, status: 'busy', client: 'Grupo Tarde' },
    { id: 'apt_006', title: 'Disponible', date: '2026-05-03', time: '09:00', duration: 60, status: 'free', client: null },
    { id: 'apt_007', title: 'Disponible', date: '2026-05-03', time: '11:00', duration: 60, status: 'free', client: null },
    { id: 'apt_008', title: 'Bloqueado - Personal', date: '2026-05-03', time: '13:00', duration: 120, status: 'blocked', client: null }
  ],

  // ── Wall / Social Feed ──
  wallPosts: [
    {
      id: 'post_001',
      author: 'DonApp',
      authorRole: 'admin',
      type: 'donation',
      text: 'Hoy llevamos 50 kits escolares a los niños de la vereda El Progreso. Cada mochila llena de lápices, cuadernos y sueños. Gracias a la tienda "Don José" por hacer esto posible con sus donaciones.',
      image: null,
      date: '2026-04-30',
      thanks: 24,
      impact: { families: 50, products: 50 }
    },
    {
      id: 'post_002',
      author: 'Tienda La Esperanza',
      authorRole: 'seller',
      type: 'testimony',
      text: 'Llevamos 3 meses usando DonApp y no solo hemos organizado nuestro inventario, sino que hemos podido donar productos a familias del barrio. Es bonito poder dar mientras creces.',
      image: null,
      date: '2026-04-28',
      thanks: 18,
      impact: null
    },
    {
      id: 'post_003',
      author: 'DonApp',
      authorRole: 'admin',
      type: 'impact',
      text: 'Doña Carmen, desplazada de Urabá, ahora vende sus dulces artesanales con facturación digital. Su negocio creció un 40% en dos meses. Esto es lo que pasa cuando la tecnología sirve a quien más lo necesita.',
      image: null,
      date: '2026-04-25',
      thanks: 42,
      impact: { families: 1, products: 0 }
    },
    {
      id: 'post_004',
      author: 'Barbería El Clásico',
      authorRole: 'seller',
      type: 'donation',
      text: 'Este mes donamos 20 cortes de cabello gratuitos a personas en situación de calle. Un corte no cambia el mundo, pero le devuelve dignidad a alguien que la sociedad olvidó.',
      image: null,
      date: '2026-04-22',
      thanks: 35,
      impact: { families: 20, products: 0 }
    },
    {
      id: 'post_005',
      author: 'DonApp',
      authorRole: 'admin',
      type: 'impact',
      text: 'En 6 meses: 127 negocios de barrio activos, 340 familias impactadas, 2,150 productos donados. Cada número es un nombre, una historia, una vida que tocamos sin buscar aplausos.',
      image: null,
      date: '2026-04-20',
      thanks: 67,
      impact: { families: 340, products: 2150 }
    }
  ],

  // ── Statistics Data ──
  stats: {
    kpis: {
      totalSales: 2450000,
      totalSalesChange: 12.5,
      activeProducts: 8,
      activeProductsChange: 2,
      pendingAppointments: 3,
      pendingAppointmentsChange: -1,
      socialImpact: 340,
      socialImpactChange: 15.3
    },
    salesByMonth: [
      { month: 'Ene', value: 1200000 },
      { month: 'Feb', value: 1800000 },
      { month: 'Mar', value: 1500000 },
      { month: 'Abr', value: 2100000 },
      { month: 'May', value: 2450000 }
    ],
    topProducts: [
      { name: 'Café Orgánico', sales: 45, revenue: 1125000 },
      { name: 'Mochila Wayúu', sales: 12, revenue: 1440000 },
      { name: 'Sombrero Vueltiao', sales: 8, revenue: 760000 },
      { name: 'Miel de Abejas', sales: 25, revenue: 875000 },
      { name: 'Panela Artesanal', sales: 60, revenue: 480000 }
    ],
    salesByCategory: [
      { category: 'Alimentos', value: 45 },
      { category: 'Ropa', value: 20 },
      { category: 'Belleza', value: 15 },
      { category: 'Hogar', value: 10 },
      { category: 'Salud', value: 10 }
    ],
    recentActivity: [
      { type: 'sale', text: 'Venta de Café Orgánico x3', amount: 75000, time: '2026-05-01T08:30:00' },
      { type: 'appointment', text: 'Nueva cita: María García', amount: null, time: '2026-05-01T07:45:00' },
      { type: 'donation', text: 'Donación registrada: 10 jabones', amount: null, time: '2026-04-30T18:00:00' },
      { type: 'sale', text: 'Venta de Mochila Wayúu', amount: 120000, time: '2026-04-30T16:30:00' },
      { type: 'invoice', text: 'Factura SN-2026-006 creada', amount: 35000, time: '2026-04-30T15:00:00' }
    ]
  },

  // ── Market Competitors (simulated) ──
  marketData: [
    { business: 'Tienda Don José', product: 'Café', price: 28000, distance: '0.3 km', rating: 4.5 },
    { business: 'Minimercado El Vecino', product: 'Café', price: 23000, distance: '0.5 km', rating: 4.2 },
    { business: 'Abastos La 14', product: 'Café', price: 22000, distance: '1.2 km', rating: 4.0 },
    { business: 'Orgánicos del Valle', product: 'Café', price: 32000, distance: '2.1 km', rating: 4.8 },
    { business: 'Tienda Campesina', product: 'Panela', price: 7500, distance: '0.8 km', rating: 4.3 },
    { business: 'Naturalmente', product: 'Miel', price: 38000, distance: '1.5 km', rating: 4.6 }
  ]
};
