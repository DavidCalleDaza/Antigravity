import React from 'react';
import { Download, TrendingUp, AlertCircle, Target } from 'lucide-react';
import { APP_CONFIG } from '../../config/appConfig';
import { MockData } from '../../utils/mockData';
import Helpers from '../../utils/helpers';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function Statistics() {
  const sales = MockData.stats.salesByMonth;
  const top = MockData.stats.topProducts;
  const cats = MockData.stats.salesByCategory;

  const revenueData = {
    labels: sales.map(d => d.month),
    datasets: [{ label: 'Ingresos', data: sales.map(d => d.value), backgroundColor: '#14b8a6' }]
  };

  const productsData = {
    labels: top.map(d => d.name),
    datasets: [{ 
      label: 'Unidades vendidas', 
      data: top.map(d => d.sales), 
      backgroundColor: APP_CONFIG.CHART_COLORS.slice(0, 5) 
    }]
  };

  const catChartData = {
    labels: cats.map(d => d.category),
    datasets: [{
      data: cats.map(d => d.value),
      backgroundColor: APP_CONFIG.CHART_COLORS.slice(0, cats.length),
      borderWidth: 0
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: { legend: { position: 'right' } }
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h2 className="page-title">Estadísticas</h2>
          <p className="page-description">Análisis de rendimiento y recomendaciones</p>
        </div>
        <div className="page-actions">
          <select className="form-select" style={{ width: 'auto', padding: 'var(--space-2) var(--space-4)' }}>
            <option>Últimos 30 días</option>
            <option>Esta semana</option>
            <option>Este mes</option>
            <option>Este año</option>
          </select>
          <button className="btn btn-outline"><Download width="16" height="16" /> Exportar</button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="card">
          <div className="card-header"><h3 className="card-title">Ingresos por Mes</h3></div>
          <div className="card-body">
            <div className="chart-container" style={{ height: '300px' }}>
              <Bar data={revenueData} options={options} />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h3 className="card-title">Top Productos</h3></div>
          <div className="card-body">
            <div className="rank-list">
              {top.map((p, i) => (
                <div className="rank-item" key={i}>
                  <div className="rank-number">{i + 1}</div>
                  <div className="rank-name">{p.name}</div>
                  <div className="rank-value">{Helpers.formatCurrency(p.revenue)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="card">
          <div className="card-header"><h3 className="card-title">Productos más Vendidos</h3></div>
          <div className="card-body">
            <div className="chart-container" style={{ height: '300px' }}>
              <Bar data={productsData} options={options} />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h3 className="card-title">Distribución por Categoría</h3></div>
          <div className="card-body">
            <div className="chart-container" style={{ height: '300px' }}>
              <Doughnut data={catChartData} options={doughnutOptions} />
            </div>
          </div>
        </div>
      </div>

      {/* AI Suggestions */}
      <div className="card mt-6">
        <div className="card-header">
          <h3 className="card-title">💡 Sugerencias Inteligentes</h3>
          <span className="badge badge-primary">Basado en tus datos</span>
        </div>
        <div className="card-body d-flex flex-col gap-4">
          <div className="suggestion-card">
            <div className="suggestion-icon"><TrendingUp width="20" height="20" /></div>
            <div>
              <div className="suggestion-title">El Café Orgánico tiene demanda creciente</div>
              <div className="suggestion-text">Las ventas aumentaron 25% el último mes. Considera aumentar el stock y negociar con proveedores un mejor precio por volumen.</div>
            </div>
          </div>
          <div className="suggestion-card" style={{ borderLeftColor: 'var(--accent)' }}>
            <div className="suggestion-icon" style={{ background: 'var(--accent-50)', color: 'var(--accent-700)' }}><AlertCircle width="20" height="20" /></div>
            <div>
              <div className="suggestion-title">La Mermelada de Guayaba está agotada</div>
              <div className="suggestion-text">Llevas 2 semanas sin stock. Clientes han preguntado 8 veces por este producto. Reabastecer podría generar ~$120,000 adicionales.</div>
            </div>
          </div>
          <div className="suggestion-card" style={{ borderLeftColor: 'var(--success)' }}>
            <div className="suggestion-icon" style={{ background: 'var(--success-50)', color: 'var(--success)' }}><Target width="20" height="20" /></div>
            <div>
              <div className="suggestion-title">Oportunidad: Jabones artesanales en tendencia</div>
              <div className="suggestion-text">Negocios similares en tu zona reportan un aumento del 40% en ventas de productos de belleza natural.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
