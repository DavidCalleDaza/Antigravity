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

export const FEATURE_DETAILS = {
  productos: {
    title: 'Gestión de Productos',
    icon: Package,
    description: 'Administra tu inventario completo con operaciones CRUD (Crear, Leer, Actualizar, Eliminar) para productos y servicios.',
    functionalities: [
      { name: 'Registro de productos', detail: 'Crea productos con nombre, descripción, categoría, precio de compra, precio de venta y stock inicial.' },
      { name: 'Categorización inteligente', detail: 'Organiza tus productos en categorías personalizadas para una navegación más rápida.' },
      { name: 'Control de stock', detail: 'Gestiona inventarios en tiempo real. Recepciones, salidas y existencias visibles al instante.' },
      { name: 'Gestión de precios', detail: 'Actualiza precios masivos o individuales. Histórico de cambios para control total.' },
      { name: 'Productos compuestos', detail: 'Crea kits o combos que agrupen varios productos con precio especial.' },
      { name: 'Importación masiva', detail: 'Importa cientos de productos desde archivos CSV o Excel en segundos.' }
    ]
  },
  estadisticas: {
    title: 'Estadísticas Inteligentes',
    icon: BarChart3,
    description: 'Analiza el rendimiento de tu negocio con métricas clave, tendencias y Suggestions basadas en datos reales.',
    functionalities: [
      { name: 'Dashboard de ventas', detail: 'Visualiza tus ventas diarias, semanales y mensuales en tiempo real.' },
      { name: 'Tendencias de demanda', detail: 'Identifica qué productos se venden más y cuáles necesitan promoción.' },
      { name: 'Análisis de márgenes', detail: 'Compara precios de compra vs venta para maximizar ganancias.' },
      { name: 'Reportes exportables', detail: 'Genera reportes en PDF, Excel o CSV para tu contabilidad.' },
      { name: 'KPIs personalizados', detail: 'Configura los indicadores clave que son más relevantes para tu negocio.' },
      { name: 'Pronósticos inteligentes', detail: 'Recibe Suggestions basadas en patrones de comportamiento para planificar inventario.' }
    ]
  },
  facturacion: {
    title: 'Facturación Digital',
    icon: FileText,
    description: 'Crea facturas electrónicas compatibles con la DIAN y lleva un control detallado de tus ingresos y gastos.',
    functionalities: [
      { name: 'Facturas electrónicas', detail: 'Genera facturas electrónicas 100% compatibles con los estándares de la DIAN.' },
      { name: 'Numeración automática', detail: 'Sistema de numeración consecutive que garantiza el cumplimiento legal.' },
      { name: 'Plantillas personalizables', detail: 'Personaliza el diseño de tus facturas con tu logo y colores.' },
      { name: 'Control de caja', detail: 'Registra cada movimiento de dinero, entradas y salidas con trazabilidad completa.' },
      { name: 'Gestión de gastos', detail: 'Clasifica y registra tus gastos operativos para un mejor control financiero.' },
      { name: 'Exportación contable', detail: 'Genera archivos de exportación para tu contador en los formatos que necesite.' }
    ]
  },
  marketing: {
    title: 'Estudio de Mercadeo',
    icon: TrendingUp,
    description: 'Analiza tu entorno competitivo con datos actualizados para tomar mejores decisiones comerciales.',
    functionalities: [
      { name: 'Mapa de competencia', detail: 'Visualiza negocios cercanos que ofrecen productos similares al tuyo.' },
      { name: 'Comparativa de precios', detail: 'Analiza cómo están precios tus productos frente a la competencia.' },
      { name: 'Oportunidades de mercado', detail: 'Identifica nichos con baja competencia y alta demanda.' },
      { name: 'Segmentación de clientes', detail: 'Clasifica tus clientes por comportamiento de compra y preferencias.' },
      { name: 'Campañas promocionales', detail: 'Crea y gestiona campañas con descuentos y ofertas especiales.' },
      { name: 'Análisis de sentimientos', detail: 'Monitorea cómo perciben los clientes tu negocio en reseñas.' }
    ]
  },
  agenda: {
    title: 'Agenda Inteligente',
    icon: Calendar,
    description: 'Gestiona citas y horarios de forma automática. Tus clientes reservan online y tú controlas tu disponibilidad.',
    functionalities: [
      { name: 'Reservas online', detail: 'Tus clientes reservan desde cualquier dispositivo sin necesidad de llamadas.' },
      { name: 'Horarios flexibles', detail: 'Define franjashorarias, días disponibles y tiempos de servicio personalizados.' },
      { name: 'Confirmación automática', detail: 'Envío de confirmaciones por email o WhatsApp para reducir no-shows.' },
      { name: 'Buffer entre citas', detail: 'Configura tiempos de descanso entre servicios para organizar mejor tu jornada.' },
      { name: 'Recordatorios inteligente', detail: 'Sistema de recordatorios que se envían automáticamente antes de cada cita.' },
      { name: 'Gestión de cancelaciones', detail: 'Manejo fluido de cancelaciones y reprogramación sin fricción.' }
    ]
  },
  impacto: {
    title: 'Muro de Impacto',
    icon: HeartHandshake,
    description: 'Comparte las evidencias de tus donaciones y testimonios. Sin likes, sin métricas vacías — solo impacto real.',
    functionalities: [
      { name: 'Publicación de evidencias', detail: 'Comparte fotos, videos y documentos que demuestran tu aporte a la comunidad.' },
      { name: 'Testimonios verificados', detail: 'Recibe y muestra testimonios reales de beneficiarios sin filtros.' },
      { name: 'Muro comunitario', detail: 'Un espacio donde todos los negocios comparten su impacto y se inspiran mutuamente.' },
      { name: 'Medición de impacto', detail: 'Lleva registro cuantificable de productos donados, tiempo contributed y familias atendidas.' },
      { name: 'Certificados de donación', detail: 'Genera certificados de donación para que las empresas puedan deducir impuestos.' },
      { name: 'Red de apoyo mutuo', detail: 'Conecta con otros negocios para colaborar en campañas de impacto conjunto.' }
    ]
  }
};

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

export const BENEFIT_DETAILS = {
  multinegocio: {
    title: 'Multi-negocio',
    description: 'Gestiona varios negocios o puntos de venta desde una sola cuenta. Ideal para emprendedores con múltiples proyectos.',
    functionalities: [
      { name: 'Panel unificado', detail: 'Visualiza todos tus negocios en un solo dashboard con métricas consolidadas.' },
      { name: 'Permisos diferenciados', detail: 'Configura accesos específicos para cada punto de venta o empleado.' },
      { name: 'Inventario compartido', detail: 'Sincroniza productos entre negocios o gestiona inventarios independientes.' },
      { name: 'Reportes por negocio', detail: 'Analiza el rendimiento de cada punto de venta de forma individual.' },
      { name: 'Migración sencilla', detail: 'Importa datos de negocios existentes de forma rápida y segura.' },
      { name: 'Soporte especializado', detail: 'Equipo de soporte entrenado para ayudarte con múltiples configuraciones.' }
    ]
  },
  gratuito: {
    title: 'Gratuito para Todos',
    description: 'Acceso gratuito a herramientas profesionales. El crecimiento no debería tener barreras.',
    functionalities: [
      { name: 'Sin costos ocultos', detail: 'Todas las funcionalidades básicas están disponibles sin cargo.' },
      { name: 'Herramientas premium', detail: 'Acceso a funcionalidades avanzadas que otras plataformas cobran.' },
      { name: 'Actualizaciones gratis', detail: 'Nuevas funcionalidades sin costo adicional de por vida.' },
      { name: 'Soporte community', detail: 'Foro y comunidad de usuarios para resolver dudas entre pares.' },
      { name: 'Datos tuyos', detail: 'Tu información es tuya. Exporta tus datos cuando quieras, sin restricciones.' },
      { name: 'Escalabilidad', detail: 'Crece sin límites. Sin planes que se acaben o capacidades restringidas.' }
    ]
  },
  estadisticasclaras: {
    title: 'Estadísticas Claras',
    description: 'Dashboards intuitivos con las métricas que realmente importan para tomar decisiones informadas.',
    functionalities: [
      { name: 'KPIs en tiempo real', detail: 'Visualiza indicadores clave actualizados al instante.' },
      { name: 'Gráficos interactivos', detail: 'Explora tus datos con visualizaciones que permiten drill-down.' },
      { name: 'Comparaciones periódicas', detail: 'Compara rendimiento entre semanas, meses o años.' },
      { name: 'Alertas personalizadas', detail: 'Recibe notificaciones cuando métricas crucen umbrales definidos.' },
      { name: 'Exportación flexible', detail: 'Descarga reportes en PDF, Excel o CSV para presentar o analizar.' },
      { name: 'Proyecciones inteligentes', detail: 'Sugerencias basadas en tendencias históricas de tu negocio.' }
    ]
  },
  comunidad: {
    title: 'Comunidad Activa',
    description: 'Forma parte de una red de negocios que se apoyan mutuamente y contribuyen al bienestar común.',
    functionalities: [
      { name: 'Foro de negocios', detail: 'Conecta con otros emprendedores para compartir experiencias y consejos.' },
      { name: 'Muro de impacto', detail: 'Publica y descubre cómo otros negocios están contribuyendo a su comunidad.' },
      { name: 'Eventos networking', detail: 'Participa en encuentros virtuales y presenciales con otros miembros.' },
      { name: 'Mentorías grupales', detail: 'Accede a sesiones de formación dictadas por expertos del ecosistema.' },
      { name: 'Directorio de negocios', detail: 'Encuentra proveedores, socios o clientes dentro de la comunidad.' },
      { name: 'Colaboraciones', detail: 'Crea campañas conjuntas con otros negocios para maximizar impacto.' }
    ]
  }
};