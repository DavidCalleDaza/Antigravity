import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, TrendingDown, Package, Calendar, HeartHandshake,
  ShoppingBag, Heart, FileText, Plus, FilePlus, CalendarPlus
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
    { label: 'Ventas del Mes', value: Helpers.formatCurrency(s.totalSales), change: s.totalSalesChange, icon: TrendingUp, color: 'primary' },
    { label: 'Productos Activos', value: s.activeProducts, change: s.activeProductsChange, icon: Package, color: 'accent' },
    { label: 'Citas Pendientes', value: s.pendingAppointments, change: s.pendingAppointmentsChange, icon: Calendar, color: 'success' },
    { label: 'Impacto Social', value: `${s.socialImpact} familias`, change: s.socialImpactChange, icon: HeartHandshake, color: 'danger' }
  ];

  const icons = { sale: ShoppingBag, appointment: Calendar, donation: Heart, invoice: FileText };

  const salesData = MockData.stats.salesByMonth;
  const lineChartData = {
    labels: salesData.map(d => d.month),
    datasets: [{
      label: 'Ventas',
      data: salesData.map(d => d.value),
      borderColor: '#14b8a6',
      backgroundColor: 'rgba(20, 184, 166, 0.1)',
      fill: true,
      tension: 0.4
    }]
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, grid: { borderDash: [5, 5] } },
      x: { grid: { display: false } }
    }
  };

  const catData = MockData.stats.salesByCategory;
  const doughnutChartData = {
    labels: catData.map(d => d.category),
    datasets: [{
      data: catData.map(d => d.value),
      backgroundColor: [
        '#14b8a6', '#f59e0b', '#f97316', '#0f766e', '#fcd34d'
      ],
      borderWidth: 0
    }]
  };

  const doughnutChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '75%',
    plugins: { legend: { position: 'right' } }
  };

  return (
    <div className="page-content">
      {/* KPIs */}
      <div className="dashboard-kpis" id="kpi-section">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          const isPositive = kpi.change >= 0;
          return (
            <div className="card animate-fadeInUp" style={{ animationDelay: `${i * 0.1}s` }} key={i}>
              <div className="kpi-card">
                <div className={`kpi-icon ${kpi.color}`}>
                  <Icon />
                </div>
                <div>
                  <div className="kpi-value">{kpi.value}</div>
                  <div className="kpi-label">{kpi.label}</div>
                  <div className={`kpi-change ${isPositive ? 'positive' : 'negative'}`}>
                    {isPositive ? <TrendingUp width="12" height="12" /> : <TrendingDown width="12" height="12" />}
                    {Helpers.formatPercent(kpi.change)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts + Activity */}
      <div className="dashboard-grid">
        <div className="card" id="chart-card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Tendencia de Ventas</h3>
              <p className="card-subtitle">Últimos 5 meses</p>
            </div>
            <div className="tabs" style={{ border: 'none', margin: 0 }}>
              <button className="tab active" data-period="monthly">Mensual</button>
              <button className="tab" data-period="weekly">Semanal</button>
            </div>
          </div>
          <div className="card-body">
            <div className="chart-container">
              <Line data={lineChartData} options={lineChartOptions} />
            </div>
          </div>
        </div>

        <div className="card" id="activity-card">
          <div className="card-header">
            <h3 className="card-title">Actividad Reciente</h3>
            <button className="btn btn-ghost btn-sm">Ver todo</button>
          </div>
          <div className="card-body">
            <div className="activity-list" id="activity-list">
              {MockData.stats.recentActivity.map((item, i) => {
                const Icon = icons[item.type];
                return (
                  <div className="activity-item" key={i}>
                    <div className={`activity-icon ${item.type}`}>
                      {Icon && <Icon width="16" height="16" />}
                    </div>
                    <div className="flex-1">
                      <div className="activity-text">{item.text}</div>
                      <div className="activity-meta">
                        <span>{Helpers.formatDate(item.time, 'relative')}</span>
                        {item.amount && <span className="activity-amount">{Helpers.formatCurrency(item.amount)}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions + Categories */}
      <div className="dashboard-grid">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Accesos Rápidos</h3>
          </div>
          <div className="quick-actions">
            <Link to="/products" className="quick-action-btn">
              <div className="quick-action-icon">
                <Plus width="20" height="20" />
              </div>
              <div>
                <div className="quick-action-label">Nuevo Producto</div>
                <div className="quick-action-desc">Agregar al inventario</div>
              </div>
            </Link>
            <Link to="/billing" className="quick-action-btn">
              <div className="quick-action-icon" style={{ background: 'var(--accent-50)', color: 'var(--accent-700)' }}>
                <FilePlus width="20" height="20" />
              </div>
              <div>
                <div className="quick-action-label">Nueva Factura</div>
                <div className="quick-action-desc">Registrar venta</div>
              </div>
            </Link>
            <Link to="/agenda" className="quick-action-btn">
              <div className="quick-action-icon" style={{ background: 'var(--success-50)', color: 'var(--success)' }}>
                <CalendarPlus width="20" height="20" />
              </div>
              <div>
                <div className="quick-action-label">Agendar Cita</div>
                <div className="quick-action-desc">Gestionar agenda</div>
              </div>
            </Link>
            <Link to="/wall" className="quick-action-btn">
              <div className="quick-action-icon" style={{ background: 'var(--secondary-50)', color: 'var(--secondary)' }}>
                <Heart width="20" height="20" />
              </div>
              <div>
                <div className="quick-action-label">Publicar en Muro</div>
                <div className="quick-action-desc">Compartir impacto</div>
              </div>
            </Link>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Ventas por Categoría</h3>
          </div>
          <div className="card-body">
            <div className="chart-container" style={{ height: '220px' }}>
              <Doughnut data={doughnutChartData} options={doughnutChartOptions} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
