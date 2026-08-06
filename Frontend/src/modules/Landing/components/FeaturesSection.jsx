import { Building2, DollarSign, BarChart3, Users } from 'lucide-react';

const features = [
  {
    id: 'multi-business',
    icon: Building2,
    title: 'Multi-negocio',
    description: 'Gestiona varios negocios o puntos de venta desde una sola cuenta. Ideal para emprendedores con múltiples proyectos.',
    detailedInfo: 'Con DonApp, puedes centralizar la administración de todos tus establecimientos. Cambia entre perfiles en segundos, consolida reportes financieros y gestiona inventarios compartidos o independientes. La escalabilidad es parte de nuestro ADN.',
    benefits: [
      'Cambio rápido entre sedes',
      'Reportes consolidados por grupo',
      'Gestión de inventario centralizada',
      'Perfiles de acceso por sucursal'
    ]
  },
  {
    id: 'free',
    icon: DollarSign,
    title: 'Gratuito para Todos',
    description: 'Acceso gratuito a herramientas profesionales. El crecimiento no debería tener barreras.',
    detailedInfo: 'Creemos en democratizar la tecnología. Ofrecemos un plan base potente y gratuito que incluye facturación esencial, control de inventario y gestión de clientes. Sin letras pequeñas, sin límites de tiempo. Queremos crecer contigo.',
    benefits: [
      'Sin costo de suscripción mensual',
      'Módulos esenciales desbloqueados',
      'Usuarios ilimitados',
      'Soporte técnico comunitario'
    ]
  },
  {
    id: 'stats',
    icon: BarChart3,
    title: 'Estadísticas Claras',
    description: 'Dashboards intuitivos con las métricas que realmente importan para tomar decisiones informadas.',
    detailedInfo: 'Visualiza el rendimiento de tu negocio en tiempo real. Gráficos de ventas, productos más vendidos, horas pico y proyecciones mensuales. Convierte tus datos en estrategias ganadoras sin complicaciones técnicas.',
    benefits: [
      'Gráficos en tiempo real',
      'Exportación de reportes a PDF/Excel',
      'Seguimiento de metas de ventas',
      'Análisis de rentabilidad por producto'
    ]
  },
  {
    id: 'community',
    icon: Users,
    title: 'Comunidad Activa',
    description: 'Forma parte de una red de negocios que se apoyan mutuamente y contribuyen al bienestar común.',
    detailedInfo: 'DonApp es más que un sistema; es un ecosistema. Accede a foros exclusivos, alianzas con proveedores locales y programas de mentoría entre dueños de negocios. Juntos, fortalecemos el comercio local.',
    benefits: [
      'Red de networking local',
      'Descuentos exclusivos con proveedores',
      'Capacitaciones mensuales gratis',
      'Espacio para feedback colaborativo'
    ]
  }
];

export default function FeaturesSection({ onFeatureClick }) {
  return (
    <section className="features-section" id="servicios">
      <div className="container">
        <span className="section-label" style={{ textAlign: 'center' }}>Ventajas</span>
        <h2 className="features-title">Por qué elegir <span>DonApp</span></h2>
        <p className="features-subtitle">
          No es solo un software. Es una comunidad de negocios que demuestran que servir es el único negocio donde todos ganan.
        </p>

        <div className="features-grid">
          {features.map((feature) => (
            <div 
              key={feature.id} 
              className="feature-card" 
              onClick={() => onFeatureClick(feature)}
            >
              <div className="feature-icon">
                <feature.icon size={32} />
              </div>
              <h3 className="feature-card-title">{feature.title}</h3>
              <p className="feature-card-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
