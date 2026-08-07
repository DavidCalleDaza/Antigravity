import { Package, BarChart3, FileText, TrendingUp, Calendar, HeartHandshake } from 'lucide-react';

export const FEATURE_CARDS = [
  {
    id: 'productos',
    title: 'Gestión de Productos',
    shortDescription: 'Registra, organiza y gestiona productos y servicios con CRUD completo. Categorías, precios, stock — todo bajo control.',
    icon: Package,
    tags: ['Inventario', 'Categorías', 'Precios']
  },
  {
    id: 'estadisticas',
    title: 'Estadísticas Inteligentes',
    shortDescription: 'Analiza ventas, identifica tendencias y recibe sugerencias para potenciar tu negocio basadas en oferta y demanda.',
    icon: BarChart3,
    tags: ['KPIs', 'Tendencias', 'Reportes']
  },
  {
    id: 'facturacion',
    title: 'Facturación Digital',
    shortDescription: 'Crea facturas electrónicas, lleva contabilidad de ventas y gastos. Todo organizado y exportable para tu tranquilidad.',
    icon: FileText,
    tags: ['DIAN', 'PDF', 'Exportar']
  },
  {
    id: 'marketing',
    title: 'Estudio de Mercadeo',
    shortDescription: 'Conoce negocios cercanos con productos similares en tiempo real. Compara precios y encuentra oportunidades de crecimiento.',
    icon: TrendingUp,
    tags: ['Competencia', 'Precios', 'Oportunidades']
  },
  {
    id: 'agenda',
    title: 'Agenda Inteligente',
    shortDescription: 'Gestiona citas y horarios. Tus clientes ven tu disponibilidad y solicitan espacios que tú apruebes.',
    icon: Calendar,
    tags: ['Citas', 'Horarios', 'Disponibilidad']
  },
  {
    id: 'impacto',
    title: 'Muro de Impacto',
    shortDescription: 'Comparte evidencias de donaciones y testimonios. Sin likes, sin métricas vacías — solo impacto real en tu comunidad.',
    icon: HeartHandshake,
    tags: ['Donaciones', 'Testimonios', 'Comunidad']
  }
];

export const BENEFIT_CARDS = [
  {
    id: 'multinegocio',
    title: 'Multi-negocio',
    shortDescription: 'Gestiona varios negocios o puntos de venta desde una sola cuenta. Ideal para emprendedores con múltiples proyectos.',
    icon: 'building'
  },
  {
    id: 'gratuito',
    title: 'Gratuito para Todos',
    shortDescription: 'Acceso gratuito a herramientas profesionales. El crecimiento no debería tener barreras.',
    icon: 'dollar'
  },
  {
    id: 'estadisticasclaras',
    title: 'Estadísticas Claras',
    shortDescription: 'Dashboards intuitivos con las métricas que realmente importan para tomar decisiones informadas.',
    icon: 'chart'
  },
  {
    id: 'comunidad',
    title: 'Comunidad Activa',
    shortDescription: 'Forma parte de una red de negocios que se apoyan mutuamente y contribuyen al bienestar común.',
    icon: 'users'
  }
];

