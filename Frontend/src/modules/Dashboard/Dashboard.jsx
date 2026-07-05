import { useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, Package, Calendar, HeartHandshake,
  ShoppingBag, Heart, FileText, ArrowRight
} from 'lucide-react';
import { MockData } from '../../utils/mockData';
import Helpers from '../../utils/helpers';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
  ArcElement
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
  ArcElement
);

export default function Dashboard() {
  const s = MockData.stats.kpis;
  const kpis = [
    { label: 'Ventas del Mes', value: Helpers.formatCurrency(s.totalSales), change: s.totalSalesChange, icon: TrendingUp },
    { label: 'Productos Activos', value: s.activeProducts, change: s.activeProductsChange, icon: Package },
    { label: 'Citas Pendientes', value: s.pendingAppointments, change: s.pendingAppointmentsChange, icon: Calendar },
    { label: 'Impacto Social', value: `${s.socialImpact}`, change: s.socialImpactChange, icon: HeartHandshake }
  ];

  const icons = { sale: ShoppingBag, appointment: Calendar, donation: Heart, invoice: FileText };

  const salesData = MockData.stats.salesByMonth;
  const lineChartData = {
    labels: salesData.map(d => d.month),
    datasets: [{
      label: 'Ventas',
      data: salesData.map(d => d.value),
      borderColor: '#3EB489',
      backgroundColor: 'transparent',
      borderWidth: 2,
      pointBackgroundColor: '#3EB489',
      pointRadius: 4,
      pointHoverRadius: 6,
      tension: 0.4
    }]
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'var(--card-bg)',
        titleColor: 'var(--text-primary)',
        bodyColor: 'var(--text-secondary)',
        borderColor: 'var(--border-color)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'var(--border-color)', lineWidth: 0.5 },
        border: { display: false },
        ticks: { color: 'var(--text-tertiary)', font: { size: 11 } }
      },
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: 'var(--text-tertiary)', font: { size: 11 } }
      }
    }
  };

  const catData = MockData.stats.salesByCategory;
  const doughnutChartData = {
    labels: catData.map(d => d.category),
    datasets: [{
      data: catData.map(d => d.value),
      backgroundColor: ['#3EB489', '#d4af37', '#c4a8e0', '#a098b0', '#6c757d'],
      borderWidth: 0,
      hoverOffset: 4
    }]
  };

  const doughnutChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: 'var(--text-secondary)',
          font: { size: 11 },
          padding: 16,
          usePointStyle: true,
          pointStyleWidth: 8
        }
      }
    }
  };

  return (
    <div className="dashboard-minimal">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Dashboard</h1>
          <p className="dashboard-subtitle">
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>

      <div className="kpi-grid">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          const isPositive = kpi.change >= 0;
          return (
            <div className="kpi-card" key={i}>
              <div className="kpi-top">
                <span className="kpi-label">{kpi.label}</span>
                <div className={`kpi-trend ${isPositive ? 'up' : 'down'}`}>
                  {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  <span>{Helpers.formatPercent(kpi.change)}</span>
                </div>
              </div>
              <div className="kpi-value">{kpi.value}</div>
              <div className="kpi-icon-wrapper">
                <Icon size={20} strokeWidth={1.5} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="chart-section">
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h2 className="chart-title">Tendencia de Ventas</h2>
              <span className="chart-period">Últimos 5 meses</span>
            </div>
            <div className="chart-legend">
              <span className="legend-dot"></span>
              <span>Ventas</span>
            </div>
          </div>
          <div className="chart-wrapper">
            <Line data={lineChartData} options={lineChartOptions} />
          </div>
        </div>
      </div>

      <div className="bottom-grid">
        <div className="activity-section">
          <div className="section-header">
            <h2 className="section-title">Actividad Reciente</h2>
            <Link to="/activity" className="section-link">
              Ver todo <ArrowRight size={14} />
            </Link>
          </div>
          <div className="activity-list">
            {MockData.stats.recentActivity.map((item, i) => {
              const Icon = icons[item.type];
              return (
                <div className="activity-item" key={i}>
                  <div className={`activity-dot ${item.type}`}></div>
                  <div className="activity-content">
                    <span className="activity-text">{item.text}</span>
                    <span className="activity-time">{Helpers.formatDate(item.time, 'relative')}</span>
                  </div>
                  {item.amount && (
                    <span className="activity-amount">{Helpers.formatCurrency(item.amount)}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="category-section">
          <div className="section-header">
            <h2 className="section-title">Por Categoría</h2>
          </div>
          <div className="donut-wrapper">
            <Doughnut data={doughnutChartData} options={doughnutChartOptions} />
          </div>
        </div>
      </div>

      <div className="quick-section">
        <h2 className="section-title">Accesos Rápidos</h2>
        <div className="quick-grid">
          <Link to="/products" className="quick-card">
            <span className="quick-name">Nuevo Producto</span>
            <ArrowRight size={16} />
          </Link>
          <Link to="/billing" className="quick-card">
            <span className="quick-name">Nueva Factura</span>
            <ArrowRight size={16} />
          </Link>
          <Link to="/agenda" className="quick-card">
            <span className="quick-name">Agendar Cita</span>
            <ArrowRight size={16} />
          </Link>
          <Link to="/wall" className="quick-card">
            <span className="quick-name">Publicar en Muro</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}