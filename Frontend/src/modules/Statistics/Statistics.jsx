import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CountUp from 'react-countup';
import {
  Download, TrendingUp, TrendingDown, AlertCircle, Target, Package, Wrench,
  Loader2, PackageX, PackageMinus, Users, FileText, Wallet, Clock, Sparkles,
  BarChart2, AreaChart as AreaIcon, CreditCard, ShieldCheck, UserCheck, Calendar, BarChart3
} from 'lucide-react';

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, PieChart, Pie, Cell, AreaChart, Area, Sector, Rectangle
} from 'recharts';

import { APP_CONFIG } from '../../config/appConfig';
import Helpers from '../../utils/helpers';
import { billingClient, productClient, serviceClient } from '../../utils/apiClient';
import { useToast } from '../../components/ui/Toast';
import Dropdown from '../../components/ui/Dropdown';
import ExportMenu from '../../components/ui/ExportMenu';

// Colores de alta distinción para segmentar productos, servicios y alertas de forma inequívoca
const COLORS = [
  '#3b82f6', // Productos: Azul Eléctrico
  '#10b981', // Servicios: Verde Esmeralda
  '#8b5cf6', // Totales / Común: Violeta
  '#f59e0b', // Alertas de Stock Bajo: Ámbar
  '#ef4444', // Alertas Críticas / Agotados: Rojo Coral
  '#ec4899'  // Auxiliar / Otros: Rosa
];
const LOW_STOCK_THRESHOLD = 5;
const INVOICE_PAGE_SIZE = 100;
const MAX_INVOICE_PAGES = 30; // límite de seguridad: hasta 3000 facturas por período

const PERIOD_OPTIONS = [
  { value: 'last_30', label: 'Últimos 30 días' },
  { value: 'this_month', label: 'Este mes' },
  { value: 'last_month', label: 'Mes anterior' },
  { value: 'this_year', label: 'Este año' },
  { value: 'custom', label: 'Rango personalizado' },
];

const COMPARISON_OPTIONS = [
  { value: 'previous_period', label: 'Período inmediatamente anterior' },
  { value: 'previous_quarter', label: 'Trimestre anterior' },
  { value: 'previous_year', label: 'Año fiscal anterior' },
];

// ───────────────────────────────────────────────────────────────────────
// Utilidades de fecha / rango de período
// ───────────────────────────────────────────────────────────────────────

function toISODate(d) {
  return d.toISOString().split('T')[0];
}

function buildRange(preset, customFrom, customTo) {
  const now = new Date();
  let from, to;

  if (preset === 'this_month') {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    to = now;
  } else if (preset === 'last_month') {
    from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    to = new Date(now.getFullYear(), now.getMonth(), 0);
  } else if (preset === 'this_year') {
    from = new Date(now.getFullYear(), 0, 1);
    to = now;
  } else if (preset === 'custom') {
    from = customFrom ? new Date(customFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
    to = customTo ? new Date(customTo) : now;
  } else {
    from = new Date(now);
    from.setDate(from.getDate() - 30);
    to = now;
  }
  return { from: toISODate(from), to: toISODate(to) };
}

function buildPreviousRange(from, to, mode = 'previous_period') {
  const fromD = new Date(from);
  const toD = new Date(to);

  if (mode === 'previous_year') {
    const prevFrom = new Date(fromD); prevFrom.setFullYear(prevFrom.getFullYear() - 1);
    const prevTo = new Date(toD); prevTo.setFullYear(prevTo.getFullYear() - 1);
    return { from: toISODate(prevFrom), to: toISODate(prevTo) };
  }

  if (mode === 'previous_quarter') {
    const prevFrom = new Date(fromD); prevFrom.setMonth(prevFrom.getMonth() - 3);
    const prevTo = new Date(toD); prevTo.setMonth(prevTo.getMonth() - 3);
    return { from: toISODate(prevFrom), to: toISODate(prevTo) };
  }

  const spanMs = toD.getTime() - fromD.getTime();
  const prevTo = new Date(fromD.getTime() - 24 * 60 * 60 * 1000);
  const prevFrom = new Date(prevTo.getTime() - spanMs);
  return { from: toISODate(prevFrom), to: toISODate(prevTo) };
}

const COMPARISON_LABELS = {
  previous_period: 'vs. período anterior',
  previous_year: 'vs. año anterior',
  previous_quarter: 'vs. trimestre anterior',
};

function pctChange(curr, prev) {
  if (!prev) return curr > 0 ? 100 : 0;
  return ((curr - prev) / prev) * 100;
}

function parseDurationToMinutes(duration) {
  if (duration === null || duration === undefined || duration === '') return null;

  // Ya viene como número (minutos), que es tu caso actual
  if (typeof duration === 'number') return duration || null;

  const str = String(duration).toLowerCase();
  const hourMatch = str.match(/(\d+(\.\d+)?)\s*hora/);
  const minMatch = str.match(/(\d+(\.\d+)?)\s*min/);
  let total = 0;
  if (hourMatch) total += parseFloat(hourMatch[1]) * 60;
  if (minMatch) total += parseFloat(minMatch[1]);
  return total || null;
}

// Trae TODAS las páginas de facturas del período, no solo la primera.
// El backend pagina /billing/invoices (se vio LIMIT 50 OFFSET 0 en los logs),
// así que si hay más facturas que el tamaño de página, cualquier cálculo
// hecho en el frontend (ranking de clientes, estado de facturación, fallback
// de ingresos mensuales) quedaba corto. Aquí se sigue pidiendo con
// limit/offset hasta que el backend devuelva menos de una página completa.
async function fetchAllInvoices(baseParams) {
  let all = [];
  let offset = 0;
  for (let page = 0; page < MAX_INVOICE_PAGES; page++) {
    const batch = await billingClient.listInvoices({ ...baseParams, limit: INVOICE_PAGE_SIZE, offset });
    if (!Array.isArray(batch) || batch.length === 0) break;
    all = all.concat(batch);
    if (batch.length < INVOICE_PAGE_SIZE) break;
    offset += INVOICE_PAGE_SIZE;
  }
  return all;
}

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const INVOICE_STATUS_LABELS = {
  draft: 'Borrador',
  issued: 'Emitida',
  sent: 'Enviada',
  paid: 'Pagada',
  overdue: 'Vencida',
  void: 'Anulada',
};

const INVOICE_STATUS_COLORS = {
  draft: '#94a3b8',
  issued: '#3b82f6',
  sent: '#6366f1',
  paid: '#10b981',
  overdue: '#f59e0b',
  void: '#ef4444',
};

// ───────────────────────────────────────────────────────────────────────
// Animaciones e Interfaces de Control Reutilizables
// ───────────────────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 16 } }
};

// Custom Active Segment Renderer para Pie/Donut (Efecto interactivo sutil)
const renderActiveShape = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  return (
    <g>
      <text x={cx} y={cy - 10} dy={8} textAnchor="middle" fill="var(--text-primary)" style={{ fontSize: '13px', fontWeight: 600 }}>
        {payload.name}
      </text>
      <text x={cx} y={cy + 12} dy={8} textAnchor="middle" fill="var(--text-secondary)" style={{ fontSize: '11px', fontWeight: 600 }}>
        {`${Helpers.formatCurrency(value)} (${(percent * 100).toFixed(1)}%)`}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 3}
        outerRadius={innerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.3}
      />
    </g>
  );
};

// ───────────────────────────────────────────────────────────────────────
// Sub-componentes visuales refinados
// ───────────────────────────────────────────────────────────────────────

function GrowthPill({ value, comparisonLabel }) {
  if (value === null || value === undefined || !isFinite(value)) return null;
  const isUp = value >= 0;
  return (
    <div className={`stats-growth-tag ${isUp ? 'growth-up' : 'growth-down'}`} title={comparisonLabel}>
      {isUp ? <TrendingUp width="12" height="12" /> : <TrendingDown width="12" height="12" />}
      <span>{Math.abs(value).toFixed(1)}%</span>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, isCurrency = true, growth, comparisonLabel }) {
  return (
    <motion.div className="stats-metric-card" variants={itemVariants}>
      <div className="stats-card-glow" />
      <div className="stats-card-header">
        <span className="stats-card-label">{label}</span>
        <div className="stats-card-icon-wrapper">
          <Icon width="16" height="16" />
        </div>
      </div>
      <div className="stats-card-content">
        <h4 className="stats-card-number">
          {isCurrency && <span className="stats-card-currency-symbol">$</span>}
          <CountUp end={Number(value) || 0} duration={1.2} separator="." decimal="," decimals={0} />
        </h4>
        {growth !== undefined && (
          <div className="stats-card-footer">
            <GrowthPill value={growth} comparisonLabel={comparisonLabel} />
            <span className="stats-card-context-text">{comparisonLabel}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function PendingBackendCard({ title, note }) {
  return (
    <div className="stats-panel-card">
      <div className="panel-header"><h3 className="panel-title">{title}</h3></div>
      <div className="panel-body">
        <div className="stats-placeholder-container">
          <div className="placeholder-icon-ring"><Sparkles width="20" height="20" /></div>
          <p className="placeholder-text-muted">{note}</p>
        </div>
      </div>
    </div>
  );
}

// Customtooltip para mostrar información adicional cuando se pasa el mouse sobre un punto de datos
function CustomTooltip({ active, payload, label, formatter, activeKey }) {
  if (!active || !payload || !payload.length) return null;
  const items = activeKey ? payload.filter((p) => p.dataKey === activeKey) : payload;
  if (!items.length) return null;
  return (
    <div className="stats-custom-tooltip">
      {label && <div className="tooltip-title">{label}</div>}
      <div className="tooltip-items">
        {items.map((p, i) => (
          <div key={i} className="tooltip-row">
            <span className="tooltip-indicator-dot" style={{ background: p.color || p.fill }} />
            <span className="tooltip-key">{p.name}:</span>
            <span className="tooltip-val">{formatter ? formatter(p.value) : p.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Funcion para calcular las coordenadas polares
function polarToXY(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutSegmentPath(cx, cy, innerR, outerR, startAngle, endAngle) {
  const startOuter = polarToXY(cx, cy, outerR, endAngle);
  const endOuter = polarToXY(cx, cy, outerR, startAngle);
  const startInner = polarToXY(cx, cy, innerR, startAngle);
  const endInner = polarToXY(cx, cy, innerR, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return [
    'M', startOuter.x, startOuter.y,
    'A', outerR, outerR, 0, largeArc, 0, endOuter.x, endOuter.y,
    'L', startInner.x, startInner.y,
    'A', innerR, innerR, 0, largeArc, 1, endInner.x, endInner.y,
    'Z',
  ].join(' ');
}

// Donut interactivo generico y reutilizable
function InteractiveDonut({ data, nameKey = 'name', colorOffset = 0, formatter = (v) => v, valueSuffixLabel }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const shellRef = React.useRef(null);
  if (!data || !data.length) return null;

  const total = data.reduce((s, d) => s + (Number(d.value) || 0), 0);
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const baseOuterR = 88;
  const innerR = 58;
  const growR = 8;
  const gapDeg = total ? 3 : 0;
  const active = activeIndex !== null ? data[activeIndex] : null;
  const activeColor = activeIndex !== null ? COLORS[(activeIndex + colorOffset) % COLORS.length] : null;

  let cumulative = 0;
  const segments = data.map((d, i) => {
    const angle = total ? ((Number(d.value) || 0) / total) * 360 : 0;
    const rawStart = cumulative;
    const rawEnd = cumulative + angle;
    cumulative = rawEnd;
    const startAngle = rawStart + gapDeg / 2;
    const endAngle = Math.max(rawEnd - gapDeg / 2, startAngle);
    return { ...d, startAngle, endAngle };
  });

  const handleMouseMove = (e) => {
    if (!shellRef.current) return;
    const rect = shellRef.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div className="chart-interactive-wrapper" onMouseLeave={() => setActiveIndex(null)}>
      <div className="donut-svg-shell" ref={shellRef} onMouseMove={handleMouseMove}>
        <svg viewBox={`0 0 ${size} ${size}`} width="100%" height="260" style={{ overflow: 'visible' }}>
          {segments.map((seg, i) => {
            const isActive = activeIndex === i;
            const outerR = isActive ? baseOuterR + growR : baseOuterR;
            const path = donutSegmentPath(cx, cy, innerR, outerR, seg.startAngle, seg.endAngle);
            return (
              <path
                key={seg[nameKey] || i}
                d={path}
                fill={COLORS[(i + colorOffset) % COLORS.length]}
                opacity={activeIndex === null || isActive ? 1 : 0.3}
                onMouseEnter={() => setActiveIndex(i)}
                style={{ transition: 'all 0.2s ease', cursor: 'pointer' }}
              />
            );
          })}
        </svg>

        {active && (
          <div
            className="donut-hover-tooltip stats-custom-tooltip"
            style={{ left: mousePos.x, top: mousePos.y }}
          >
            <div className="tooltip-items">
              <div className="tooltip-row">
                <span className="tooltip-indicator-dot" style={{ background: activeColor }} />
                <span className="tooltip-key">{active[nameKey]}:</span>
                <span className="tooltip-val">{formatter(active.value)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="custom-chart-legend">
        {data.map((item, idx) => {
          const pct = total ? ((Number(item.value) || 0) / total) * 100 : 0;
          return (
            <div
              key={item[nameKey] || idx}
              className="legend-indicator-row"
              onMouseEnter={() => setActiveIndex(idx)}
              style={{ opacity: activeIndex === null || activeIndex === idx ? 1 : 0.5, transition: 'opacity 0.2s ease' }}
            >
              <div className="indicator-label-side">
                <span className="indicator-color-dot" style={{ backgroundColor: COLORS[(idx + colorOffset) % COLORS.length] }} />
                <span className="indicator-name">{item[nameKey]}</span>
              </div>
              <span className="indicator-value">
                {valueSuffixLabel ? formatter(item.value) : `${pct.toFixed(1)}%`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Funnel interactivo generico y reutilizable
function InteractiveStatusFunnel({ data, formatter = (v) => v }) {
  const [activeIndex, setActiveIndex] = useState(null);
  if (!data || !data.length) return null;
  const total = data.reduce((s, d) => s + (Number(d.value) || 0), 0);
  const max = Math.max(...data.map((d) => Number(d.value) || 0));
  const viewW = 300;
  const viewH = 150;
  const topMargin = 8;
  const rowH = (viewH - topMargin) / data.length;
  const maxBarW = 210;
  const centerX = viewW / 2;
  const minTaperW = maxBarW * 0.22;
  const widths = data.map((d) => (max ? (Number(d.value) / max) * maxBarW : 0));
  const active = activeIndex !== null ? data[activeIndex] : null;
  const activePct = active && total ? ((Number(active.value) || 0) / total) * 100 : 0;

  const buildPoints = (topW, botW, y, h) => [
    [centerX - topW / 2, y],
    [centerX + topW / 2, y],
    [centerX + botW / 2, y + h],
    [centerX - botW / 2, y + h],
  ].map((p) => p.join(',')).join(' ');

  return (
    <div className="chart-interactive-wrapper" onMouseLeave={() => setActiveIndex(null)}>
      <div className="status-funnel-hover-label">
        {active && (
          <>
            <span className="status-funnel-hover-name">{active.name}</span>
            <span className="status-funnel-hover-value">{formatter(active.value)} ({activePct.toFixed(1)}%)</span>
          </>
        )}
      </div>
      <svg viewBox={`0 0 ${viewW} ${viewH}`} width="100%" height="170" preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible' }}>
        {data.map((entry, i) => {
          const y = topMargin + i * rowH;
          const topW = Math.max(widths[i], minTaperW * (1 - i / data.length) + minTaperW);
          const nextRaw = i < data.length - 1 ? widths[i + 1] : widths[i] * 0.6;
          const botW = Math.max(nextRaw, minTaperW);
          const isActive = activeIndex === i;

          const growW = 1.14;
          const growH = 6;
          const gTopW = topW * growW;
          const gBotW = botW * growW;
          const gY = y - growH / 2;
          const gH = rowH + growH;

          return (
            <polygon
              key={entry.key}
              points={isActive ? buildPoints(gTopW, gBotW, gY, gH) : buildPoints(topW, botW, y, rowH)}
              fill={entry.color}
              opacity={activeIndex === null || isActive ? 1 : 0.32}
              stroke="var(--surface, #111015)"
              strokeWidth={i === 0 ? 0 : 1.5}
              onMouseEnter={() => setActiveIndex(i)}
              style={{ transition: 'all 0.2s ease', cursor: 'pointer' }}
            />
          );
        })}
      </svg>
      <div className="custom-chart-legend status-funnel-legend">
        {data.map((item, idx) => (
          <div
            key={item.key}
            className="legend-indicator-row"
            onMouseEnter={() => setActiveIndex(idx)}
            style={{ opacity: activeIndex === null || activeIndex === idx ? 1 : 0.5, transition: 'opacity 0.2s ease' }}
          >
            <div className="indicator-label-side">
              <span className="indicator-color-dot" style={{ backgroundColor: item.color }} />
              <span className="indicator-name">{item.name}</span>
            </div>
            <span className="indicator-value">
              {item.value} · {total ? ((item.value / total) * 100).toFixed(1) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
// Shape custom para barras apiladas: ensancha la barra activa
// centrada en su eje X, sin alterar su altura (que representa el valor real).
function GrowingBarShape(props) {
  const { x, y, width, height, isActive, ...rest } = props;
  const growW = isActive ? 1.16 : 1;
  const newWidth = width * growW;
  const newX = x - (newWidth - width) / 2;

  return (
    <Rectangle
      {...rest}
      x={newX}
      y={y}
      width={newWidth}
      height={height}
      style={{ transition: 'all 0.2s ease', cursor: 'pointer' }}
    />
  );
}

// ───────────────────────────────────────────────────────────────────────
// Componente principal
// ───────────────────────────────────────────────────────────────────────

export default function Statistics() {
  const toast = useToast();

  const [preset, setPreset] = useState('last_30');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [comparisonMode, setComparisonMode] = useState('previous_period');
  const [activeTab, setActiveTab] = useState('products');
  const [loading, setLoading] = useState(true);

  // Modos de visualización dinámicos
  const [revenueChartType, setRevenueChartType] = useState('area'); // 'area' | 'bar'
  const [activePieIndex, setActivePieIndex] = useState(0);
  const [activeRevenueSeries, setActiveRevenueSeries] = useState(null);
  const toNum = (v) => Number(v) || 0;

  // Datos soportados por el backend
  const [summary, setSummary] = useState(null);
  const [prevSummary, setPrevSummary] = useState(null);
  const [topSelling, setTopSelling] = useState({ products: [], services: [] });
  const [prevTopSelling, setPrevTopSelling] = useState({ products: [], services: [] });
  const [invoices, setInvoices] = useState([]);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState(null);
  const [paymentMethodsRaw, setPaymentMethodsRaw] = useState(null);

  // Datos estructurados con fallback
  const [revenueByLine, setRevenueByLine] = useState(null);
  const [revenueSplitAvailable, setRevenueSplitAvailable] = useState(false);
  const [catDistProducts, setCatDistProducts] = useState(null);
  const [catDistServices, setCatDistServices] = useState(null);

  const { from, to } = useMemo(() => buildRange(preset, customFrom, customTo), [preset, customFrom, customTo]);
  const { from: prevFrom, to: prevTo } = useMemo(
    () => buildPreviousRange(from, to, comparisonMode),
    [from, to, comparisonMode]
  );

  const loadAll = useCallback(async () => {
    setLoading(true);
    const rangeParams = { date_from: from, date_to: to };
    const prevRangeParams = { date_from: prevFrom, date_to: prevTo };

    // 1. Resumen actual y anterior
    try {
      const [curr, prev] = await Promise.all([
        billingClient.getSummary(rangeParams),
        billingClient.getSummary(prevRangeParams),
      ]);
      setSummary(curr);
      setPrevSummary(prev);
    } catch (err) {
      console.error('Error cargando resumen:', err);
      toast.error('No se pudo cargar el resumen general.');
    }

    // 2. Top productos y servicios
    const fetchTopSellingSafe = async (params) => {
      try {
        return await billingClient.getTopSelling({ ...params, limit: 20 });
      } catch (err) {
        if (err?.status === 422) {
          try {
            return await billingClient.getTopSelling(params);
          } catch (err2) {
            console.error('Error alternativo cargando top-selling:', err2);
            return null;
          }
        }
        console.error('Error cargando top-selling:', err);
        return null;
      }
    };

    try {
      const [curr, prev] = await Promise.all([
        fetchTopSellingSafe(rangeParams),
        fetchTopSellingSafe(prevRangeParams),
      ]);
      setTopSelling({ products: curr?.products || [], services: curr?.services || [] });
      setPrevTopSelling({ products: prev?.products || [], services: prev?.services || [] });
      if ((curr?.products?.length || 0) === 0 && (curr?.services?.length || 0) > 0) {
        console.warn('[Statistics] /billing/top-selling no devolvió productos en este período. Revisa que invoice_items.product_id se esté guardando al crear la factura.');
      }
      if ((curr?.services?.length || 0) === 0 && (curr?.products?.length || 0) > 0) {
        console.warn('[Statistics] /billing/top-selling no devolvió servicios en este período. Revisa que invoice_items.service_id se esté guardando al crear la factura.');
      }
    } catch (err) {
      console.error('Error cargando catálogo destacado:', err);
    }

    // 3. Facturas — TODAS las páginas del período (ver fetchAllInvoices).
    try {
      const invoiceList = await fetchAllInvoices(rangeParams);
      setInvoices(invoiceList);
    } catch (err) {
      console.error('Error cargando facturación:', err);
      toast.error('No se pudo cargar el listado completo de facturas.');
    }

    // 4. Catálogos para niveles de inventario
    try {
      const productList = await productClient.list();
      setProducts(productList || []);
    } catch (err) {
      console.error('Error cargando productos:', err);
    }
    try {
      const serviceList = await serviceClient.list();
      setServices(serviceList || []);
    } catch (err) {
      console.error('Error cargando servicios:', err);
    }

    // 5. Métodos de pago (Fase 2)
    try {
      const pm = await billingClient.getPaymentStats(rangeParams);
      setPaymentMethods(pm || null);
      setPaymentMethodsRaw(pm ?? null);
    } catch (err) {
      setPaymentMethods(null);
      setPaymentMethodsRaw(null);
    }

    // 6. Líneas de negocio divididas por fecha (Fase 1/2)
    try {
      const rbl = await billingClient.getRevenueByLine(rangeParams);
      if (Array.isArray(rbl) && rbl.length) {
        const normalized = rbl.map((r) => ({
          ...r,
          products: Number(r.products) || 0,
          services: Number(r.services) || 0,
          total: Number(r.total) || 0,
        }));
        setRevenueByLine(normalized);
        setRevenueSplitAvailable(true);
      } else {
        throw new Error('Sin datos en endpoint directo');
      }
    } catch (err) {
      setRevenueSplitAvailable(false);
    }

    // 7. Distribuciones por categorías (Fase 2)
    try {
      const dist = await billingClient.getCategoryDistribution('product', rangeParams);
      setCatDistProducts(Array.isArray(dist) && dist.length ? dist.map(d => ({ ...d, value: Number(d.revenue) })) : null);
    } catch (err) {
      setCatDistProducts(null);
    }
    try {
      const dist = await billingClient.getCategoryDistribution('service', rangeParams);
      setCatDistServices(Array.isArray(dist) && dist.length ? dist.map(d => ({ ...d, value: Number(d.revenue) })) : null);
    } catch (err) {
      setCatDistServices(null);
    }

    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, prevFrom, prevTo]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Procesamiento de datos locales de apoyo ─────────────────────────
  const revenueMix = useMemo(() => {
    const productsTotal = topSelling.products.reduce((s, p) => s + (Number(p.total_amount) || 0), 0);
    const servicesTotal = topSelling.services.reduce((s, p) => s + (Number(p.total_amount) || 0), 0);
    const total = productsTotal + servicesTotal;
    if (!total) return null;
    return [
      { name: 'Productos', value: productsTotal, pct: (productsTotal / total) * 100 },
      { name: 'Servicios', value: servicesTotal, pct: (servicesTotal / total) * 100 },
    ];
  }, [topSelling]);

  const monthlyRevenueFallback = useMemo(() => {
    const byMonth = {};
    invoices.forEach((inv) => {
      if (!inv.issued_at || inv.status === 'void') return;
      const d = new Date(inv.issued_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!byMonth[key]) byMonth[key] = { key, month: MONTH_LABELS[d.getMonth()], total: 0, sortKey: d.getFullYear() * 12 + d.getMonth() };
      byMonth[key].total += Number(inv.total) || 0;
    });
    return Object.values(byMonth).sort((a, b) => a.sortKey - b.sortKey);
  }, [invoices]);

  const monthlyRevenueData = revenueSplitAvailable ? revenueByLine : monthlyRevenueFallback;

  const inventoryAlerts = useMemo(() => {
    const outOfStock = products.filter((p) => (p.stock ?? 0) <= 0 || p.status === 'out_of_stock');
    const lowStock = products
      .filter((p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= LOW_STOCK_THRESHOLD)
      .sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0));
    return { outOfStock, lowStock };
  }, [products]);

  const invoiceStatusData = useMemo(() => {
    const counts = {};
    invoices.forEach((inv) => {
      const key = inv.status || 'draft';
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([key, value]) => ({ key, name: INVOICE_STATUS_LABELS[key] || key, value, color: INVOICE_STATUS_COLORS[key] || '#94a3b8' }))
      .filter((d) => d.value > 0);
  }, [invoices]);

  const dianActivity = useMemo(() => {
    return invoices.some((inv) => inv.dian_status && inv.dian_status !== 'none');
  }, [invoices]);

  const topClients = useMemo(() => {
    const byClient = {};
    invoices.forEach((inv) => {
      if (inv.status === 'void') return;
      const name = inv.customer_name || 'Sin Cliente Asignado';
      if (!byClient[name]) byClient[name] = { name, total: 0, count: 0 };
      byClient[name].total += Number(inv.total) || 0;
      byClient[name].count += 1;
    });
    return Object.values(byClient)
      .filter((c) => c.name !== 'Sin Cliente Asignado')
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [invoices]);

  const paymentMethodsData = useMemo(() => {
    const hasField = invoices.some((inv) => inv.payment_method && inv.status !== 'void');
    if (!hasField) return null;
    const byMethod = {};
    invoices.forEach((inv) => {
      if (inv.status === 'void') return;
      const key = inv.payment_method || 'Otro';
      byMethod[key] = (byMethod[key] || 0) + 1;
    });
    return Object.entries(byMethod).map(([name, value]) => ({ name, value }));
  }, [invoices]);

  const serviceUtilization = useMemo(() => {
    const durations = services.map((s) => parseDurationToMinutes(s.duration)).filter(Boolean);
    const avgDuration = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null;
    const totalRequests = topSelling.services.reduce((s, x) => s + (Number(x.total_quantity) || 0), 0);
    const mostRequested = [...topSelling.services].sort((a, b) => (b.total_quantity || 0) - (a.total_quantity || 0))[0];
    return { avgDuration, totalRequests, mostRequested };
  }, [services, topSelling]);

  const suggestions = useMemo(() => {
    const items = [];

    topSelling.products.forEach((p) => {
      const prev = prevTopSelling.products.find((x) => x.description === p.description);
      const growth = pctChange(Number(p.total_amount) || 0, Number(prev?.total_amount) || 0);
      if (prev && growth >= 20) {
        items.push({
          type: 'growth',
          icon: TrendingUp,
          title: `${p.description} tiene demanda creciente`,
          text: `Las ventas aumentaron ${growth.toFixed(0)}% frente al período anterior. Considera asegurar stock suficiente.`,
        });
      }
    });

    topSelling.services.forEach((s) => {
      const prev = prevTopSelling.services.find((x) => x.description === s.description);
      const growth = pctChange(Number(s.total_amount) || 0, Number(prev?.total_amount) || 0);
      if (prev && growth >= 20) {
        items.push({
          type: 'growth',
          icon: TrendingUp,
          title: `${s.description} registra un crecimiento continuo`,
          text: `Los ingresos de este servicio aumentaron un ${growth.toFixed(0)}% en comparación con el rango histórico anterior.`,
        });
      }
    });

    inventoryAlerts.outOfStock.slice(0, 2).forEach((p) => {
      items.push({
        type: 'alert',
        icon: AlertCircle,
        title: `${p.name} se encuentra agotado`,
        text: 'Nivel crítico. Considere programar una orden de reposición con prioridad.',
      });
    });

    const soldServiceNames = new Set(topSelling.services.map((s) => s.description));
    services
      .filter((s) => s.status === 'active' && !soldServiceNames.has(s.name))
      .slice(0, 2)
      .forEach((s) => {
        items.push({
          type: 'idle',
          icon: Target,
          title: `Baja rotación en ${s.name}`,
          text: 'No se registran ordenes de servicio facturadas en este período. Podría beneficiarse de una campaña promocional.',
        });
      });

    return items.slice(0, 5);
  }, [topSelling, prevTopSelling, inventoryAlerts, services]);

  const clientCount = useMemo(() => {
    const names = new Set(invoices.filter((i) => i.status !== 'void').map((i) => i.customer_name).filter(Boolean));
    return names.size;
  }, [invoices]);

  const currencyFormatter = (v) => Helpers.formatCurrency(v);

  function compactCurrencyFormatter(v) {
    const num = Number(v) || 0;
    const abs = Math.abs(num);
    if (abs >= 1_000_000) return `$${(num / 1_000_000).toFixed(1).replace('.', ',')}M`;
    if (abs >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
    return `$${num}`;
  }

  return (
    <div className="stats-dashboard-wrapper">

      <div className="page-header">
        <div>
          <BarChart3 width="20" height="20" className="page-title-icon" />
          <h2 className="page-title">Estadísticas</h2>
          <p className="page-description">Indicadores unificados de transacciones comerciales, servicios e inventario</p>
        </div>

        <div className="actions-button-group">
          <ExportMenu
            exportBasePath="/billing/statistics/export"
            filters={{ date_from: from, date_to: to }}
            filename={`Estadisticas_${from}_a_${to}`}
          />
        </div>
      </div>

      <div className="stats-filters-row">
        <div className="control-group">
          <label className="control-label"><Calendar width="12" height="12" /> Período analítico</label>
          <Dropdown value={preset} onChange={setPreset} options={PERIOD_OPTIONS} />
        </div>

        {preset === 'custom' && (
          <div className="control-group animate-fade-in">
            <label className="control-label">Rango</label>
            <div className="date-input-pair">
              <input type="date" className="control-date-input" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
              <span className="date-separator">a</span>
              <input type="date" className="control-date-input" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </div>
          </div>
        )}

        <div className="control-group">
          <label className="control-label">Comparar con</label>
          <Dropdown value={comparisonMode} onChange={setComparisonMode} options={COMPARISON_OPTIONS} />
        </div>
      </div>

      {loading && (
        <div className="stats-system-loader-bar">
          <div className="loader-inner-progress" />
          <div className="loader-content">
            <Loader2 className="animate-spin" width="14" height="14" />
            <span>Sincronizando modelos con el servidor...</span>
          </div>
        </div>
      )}

      <motion.div
        className="stats-kpi-layout-grid"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <KpiCard
          icon={Wallet}
          label="Ingresos Netos"
          value={summary?.income}
          growth={pctChange(summary?.income || 0, prevSummary?.income || 0)}
          comparisonLabel={COMPARISON_LABELS[comparisonMode]}
        />
        <KpiCard
          icon={FileText}
          label="Facturación Total"
          value={(summary?.income || 0) + (summary?.pending || 0)}
          growth={pctChange((summary?.income || 0) + (summary?.pending || 0), (prevSummary?.income || 0) + (prevSummary?.pending || 0))}
          comparisonLabel={COMPARISON_LABELS[comparisonMode]}
        />
        <KpiCard
          icon={ShieldCheck}
          label="Documentos Emitidos"
          value={summary?.invoice_count}
          isCurrency={false}
          growth={pctChange(summary?.invoice_count || 0, prevSummary?.invoice_count || 0)}
          comparisonLabel={COMPARISON_LABELS[comparisonMode]}
        />
        <KpiCard
          icon={UserCheck}
          label="Clientes Únicos"
          value={clientCount}
          isCurrency={false}
        />
      </motion.div>

      <div className="stats-charts-row">
        <div className="stats-panel-card main-chart-panel">
          <div className="panel-header flex-header">
            <div>
              <h3 className="panel-title">Evolución de Ingresos</h3>
              <p className="panel-subtitle">Análisis temporal continuo clasificado por línea de facturación</p>
            </div>

            <div className="panel-segmented-control">
              <button
                className={`segmented-btn ${revenueChartType === 'area' ? 'active' : ''}`}
                onClick={() => setRevenueChartType('area')}
                title="Área Continua"
              >
                <AreaIcon width="14" height="14" />
              </button>
              <button
                className={`segmented-btn ${revenueChartType === 'bar' ? 'active' : ''}`}
                onClick={() => setRevenueChartType('bar')}
                title="Barras Apiladas"
              >
                <BarChart2 width="14" height="14" />
              </button>
            </div>
          </div>
          <div className="panel-body">
            <div className="chart-wrapper-container">
              <ResponsiveContainer width="100%" height={320}>
                {revenueChartType === 'area' ? (
                  <AreaChart data={monthlyRevenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradProducts" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.4}/>
                        <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0.01}/>
                      </linearGradient>
                      <linearGradient id="gradServices" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS[1]} stopOpacity={0.4}/>
                        <stop offset="95%" stopColor={COLORS[1]} stopOpacity={0.01}/>
                      </linearGradient>
                      <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.01}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle, rgba(255, 255, 255, 0.05))" />
                    <XAxis dataKey="month" stroke="var(--text-muted, #6b7280)" tick={{ fontSize: 11 }} />
                    <YAxis
                      tickFormatter={compactCurrencyFormatter}
                      width={65}
                      stroke="var(--text-muted, #6b7280)"
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip cursor={false} content={<CustomTooltip formatter={compactCurrencyFormatter} activeKey={activeRevenueSeries} />} />
                      {revenueSplitAvailable ? (
                        <>
                          <Legend
                            verticalAlign="top"
                            height={36}
                            onMouseEnter={(o) => setActiveRevenueSeries(o.dataKey)}
                            onMouseLeave={() => setActiveRevenueSeries(null)}
                          />
                          <Area
                            type="monotone"
                            dataKey="products"
                            name="Ventas de Productos"
                            stackId="revenue"
                            stroke={COLORS[0]}
                            strokeWidth={2}
                            fillOpacity={activeRevenueSeries === null || activeRevenueSeries === 'products' ? 1 : 0.15}
                            fill="url(#gradProducts)"
                            dot={{ r: 4, fill: COLORS[0], stroke: COLORS[0], onMouseEnter: () => setActiveRevenueSeries('products'), onMouseLeave: () => setActiveRevenueSeries(null), style: { cursor: 'pointer' } }}
                            activeDot={{ r: 6, onMouseEnter: () => setActiveRevenueSeries('products'), onMouseLeave: () => setActiveRevenueSeries(null), style: { cursor: 'pointer' } }}
                            onMouseEnter={() => setActiveRevenueSeries('products')}
                            onMouseLeave={() => setActiveRevenueSeries(null)}
                            style={{ transition: 'fill-opacity 0.2s ease', cursor: 'pointer' }}
                          />
                          <Area
                            type="monotone"
                            dataKey="services"
                            name="Ordenes de Servicio"
                            stackId="revenue"
                            stroke={COLORS[1]}
                            strokeWidth={2}
                            fillOpacity={activeRevenueSeries === null || activeRevenueSeries === 'services' ? 1 : 0.15}
                            fill="url(#gradServices)"
                            dot={{ r: 4, fill: COLORS[1], stroke: COLORS[1], onMouseEnter: () => setActiveRevenueSeries('services'), onMouseLeave: () => setActiveRevenueSeries(null), style: { cursor: 'pointer' } }}
                            activeDot={{ r: 6, onMouseEnter: () => setActiveRevenueSeries('services'), onMouseLeave: () => setActiveRevenueSeries(null), style: { cursor: 'pointer' } }}
                            onMouseEnter={() => setActiveRevenueSeries('services')}
                            onMouseLeave={() => setActiveRevenueSeries(null)}
                            style={{ transition: 'fill-opacity 0.2s ease', cursor: 'pointer' }}
                          />
                        </>
                      ) : (
                        <Area type="monotone" dataKey="total" name="Ingreso Total" stroke="var(--accent, #8b5cf6)" strokeWidth={2.5} fillOpacity={1} fill="url(#gradTotal)" />
                      )}
                  </AreaChart>
                ) : (
                  <BarChart data={monthlyRevenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle, rgba(255, 255, 255, 0.05))" />
                    <XAxis dataKey="month" stroke="var(--text-muted, #6b7280)" tick={{ fontSize: 11 }} />
                    <YAxis
                    tickFormatter={compactCurrencyFormatter}
                    width={65}
                    stroke="var(--text-muted, #6b7280)"
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip cursor={false} content={<CustomTooltip formatter={compactCurrencyFormatter} activeKey={activeRevenueSeries} />} />
                    {revenueSplitAvailable ? (
                      <>
                        <Legend
                          verticalAlign="top"
                          height={36}
                          onMouseEnter={(o) => setActiveRevenueSeries(o.dataKey)}
                          onMouseLeave={() => setActiveRevenueSeries(null)}
                        />
                        <Bar
                          dataKey="products"
                          name="Productos"
                          stackId="revenue"
                          fill={COLORS[0]}
                          fillOpacity={activeRevenueSeries === null || activeRevenueSeries === 'products' ? 1 : 0.3}
                          radius={[0, 0, 0, 0]}
                          barSize={36}
                          onMouseEnter={() => setActiveRevenueSeries('products')}
                          onMouseLeave={() => setActiveRevenueSeries(null)}
                          shape={(props) => <GrowingBarShape {...props} isActive={activeRevenueSeries === 'products'} />}
                        />
                        <Bar
                          dataKey="services"
                          name="Servicios"
                          stackId="revenue"
                          fill={COLORS[1]}
                          fillOpacity={activeRevenueSeries === null || activeRevenueSeries === 'services' ? 1 : 0.3}
                          radius={[4, 4, 0, 0]}
                          barSize={36}
                          onMouseEnter={() => setActiveRevenueSeries('services')}
                          onMouseLeave={() => setActiveRevenueSeries(null)}
                          shape={(props) => <GrowingBarShape {...props} isActive={activeRevenueSeries === 'services'} />}
                        />
                      </>
                      ) : (
                        <Bar dataKey="total" name="Ingresos Totales" fill="var(--primary, #6366f1)" radius={[4, 4, 0, 0]} barSize={40} />
                      )}
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="stats-panel-card donut-panel">
          <div className="panel-header">
            <h3 className="panel-title">Mix de Ingresos</h3>
            <p className="panel-subtitle">Distribución porcentual de las líneas operativas del negocio</p>
          </div>
          <div className="panel-body flex-body-centered">
            {revenueMix ? (
              <InteractiveDonut data={revenueMix} formatter={currencyFormatter} />
            ) : (
              <div className="stats-placeholder-container">
                <Sparkles width="20" height="20" style={{ opacity: 0.6 }} />
                <p className="placeholder-text-muted">Aún no se registran transacciones para estructurar el mix comercial.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="stats-segmented-workspace-card">
        <div className="workspace-tab-header">
          <div className="workspace-tab-switcher">
            <button
              className={`workspace-tab-trigger ${activeTab === 'products' ? 'active' : ''}`}
              onClick={() => setActiveTab('products')}
            >
              <Package width="14" height="14" />
              <span>Línea de Productos</span>
            </button>
            <button
              className={`workspace-tab-trigger ${activeTab === 'services' ? 'active' : ''}`}
              onClick={() => setActiveTab('services')}
            >
              <Wrench width="14" height="14" />
              <span>Línea de Servicios</span>
            </button>
          </div>
        </div>

        <div className="workspace-tab-body">
          <AnimatePresence mode="wait">
            {activeTab === 'products' ? (
              <motion.div
                key="products-workspace"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="workspace-grid-container"
              >
                <div className="stats-charts-row">
                  <div className="stats-panel-card">
                    <div className="panel-header">
                      <h3 className="panel-title">Top 5 Productos de Mayor Ingreso</h3>
                    </div>
                    <div className="panel-body">
                      <div className="stats-ranking-list">
                        {topSelling.products.slice(0, 5).map((p, index) => (
                          <div className="ranking-list-item" key={p.description || index}>
                            <div className="item-position-badge" style={{ backgroundColor: 'rgba(212, 175, 55, 0.1)', color: 'var(--gold, #d4af37)' }}>{index + 1}</div>
                            <div className="item-meta-info">
                              <span className="item-title-name">{p.description}</span>
                              <span className="item-secondary-count">
                                {Math.round(Number(p.total_quantity))} unidades despachadas
                              </span>
                            </div>
                            <div className="item-primary-value">{Helpers.formatCurrency(p.total_amount)}</div>
                          </div>
                        ))}
                        {!topSelling.products.length && (
                          <div className="stats-placeholder-container"><p className="placeholder-text-muted">Sin actividad registrada en este rango.</p></div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="stats-panel-card">
                    <div className="panel-header">
                      <h3 className="panel-title">Volumen de Unidades Despachadas</h3>
                    </div>
                    <div className="panel-body">
                      <div className="chart-wrapper-container">
                        <ResponsiveContainer width="100%" height={260}>
                          <BarChart data={topSelling.products.slice(0, 5).map(p => ({ ...p, total_quantity: Math.round(Number(p.total_quantity)) }))} layout="vertical" margin={{ left: 15, right: 15, top: 10, bottom: 10 }}>
                            <defs>
                              <linearGradient id="gradProdBars" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="var(--gold, #d4af37)" stopOpacity={0.85}/>
                                <stop offset="100%" stopColor="var(--primary, #6366f1)" stopOpacity={1}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-subtle, rgba(255, 255, 255, 0.05))" />
                            <XAxis type="number" allowDecimals={false} stroke="var(--text-muted, #6b7280)" tick={{ fontSize: 10 }} />
                            <YAxis type="category" dataKey="description" width={100} stroke="var(--text-muted, #6b7280)" tick={{ fontSize: 10 }} />
                            <Tooltip cursor={false} content={<CustomTooltip formatter={(v) => `${Math.round(Number(v))} unidades`} />} /> 
                            <Bar dataKey="total_quantity" name="Cantidad Vendida" fill="url(#gradProdBars)" radius={[0, 4, 4, 0]} barSize={16} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="stats-charts-row mt-4">
                  {catDistProducts ? (
                    <div className="stats-panel-card">
                      <div className="panel-header">
                        <h3 className="panel-title">Distribución de Categorías</h3>
                      </div>
                      <div className="panel-body flex-body-centered">
                        <InteractiveDonut data={catDistProducts} nameKey="category" colorOffset={0} formatter={currencyFormatter} />
                      </div>
                    </div>
                  ) : (
                    <PendingBackendCard
                      title="Distribución de Categorías (Productos)"
                      note="Este widget requiere habilitar el endpoint /billing/category-distribution?entity_type=product en el backend (ver README). Por ahora responde 404, así que no hay nada que mostrar todavía — no es un error de esta pantalla."
                    />
                  )}

                  <div className="stats-panel-card">
                    <div className="panel-header">
                      <h3 className="panel-title">Niveles Críticos de Stock e Inventario</h3>
                    </div>
                    <div className="panel-body">
                      <div className="stats-inventory-scroller">
                        {inventoryAlerts.outOfStock.length === 0 && inventoryAlerts.lowStock.length === 0 && (
                          <div className="stats-placeholder-container">
                            <p className="placeholder-text-muted">Todos los niveles de almacén se encuentran en rango óptimo.</p>
                          </div>
                        )}
                        {inventoryAlerts.outOfStock.map((p) => (
                          <div className="inventory-metric-row border-danger" key={p.id}>
                            <div className="metric-row-status-dot bg-danger" />
                            <div className="metric-row-info">
                              <span className="metric-item-name">{p.name}</span>
                              <span className="metric-item-desc">Agotado - Sin existencia en almacén central</span>
                            </div>
                            <div className="metric-badge-tag badge-danger">
                              <PackageX width="12" height="12" />
                              <span>0 unidades</span>
                            </div>
                          </div>
                        ))}
                        {inventoryAlerts.lowStock.map((p) => (
                          <div className="inventory-metric-row border-warning" key={p.id}>
                            <div className="metric-row-status-dot bg-warning" />
                            <div className="metric-row-info">
                              <span className="metric-item-name">{p.name}</span>
                              <span className="metric-item-desc">Stock de seguridad alcanzado</span>
                            </div>
                            <div className="metric-badge-tag badge-warning">
                              <PackageMinus width="12" height="12" />
                              <span>{p.stock} unidades</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="services-workspace"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="workspace-grid-container"
              >
                <div className="stats-charts-row">
                  <div className="stats-panel-card">
                    <div className="panel-header">
                      <h3 className="panel-title">Top 5 Servicios de Mayor Facturación</h3>
                    </div>
                    <div className="panel-body">
                      <div className="stats-ranking-list">
                        {topSelling.services.slice(0, 5).map((s, index) => (
                          <div className="ranking-list-item" key={s.description || index}>
                            <div className="item-position-badge service-accent">{index + 1}</div>
                            <div className="item-meta-info">
                              <span className="item-title-name">{s.description}</span>
                              <span className="item-secondary-count">
                                {Math.round(Number(s.total_quantity))} prestaciones registradas
                              </span>
                            </div>
                            <div className="item-primary-value">{Helpers.formatCurrency(s.total_amount)}</div>
                          </div>
                        ))}
                        {!topSelling.services.length && (
                          <div className="stats-placeholder-container"><p className="placeholder-text-muted">Sin actividad de servicio prestada en este rango.</p></div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="stats-panel-card">
                    <div className="panel-header">
                      <h3 className="panel-title">Ingresos Brutos por Prestación</h3>
                    </div>
                    <div className="panel-body">
                      <div className="chart-wrapper-container">
                        <ResponsiveContainer width="100%" height={260}>
                          <BarChart data={topSelling.services.slice(0, 5)} layout="vertical" margin={{ left: 15, right: 15, top: 10, bottom: 10 }}>
                            <defs>
                              <linearGradient id="gradServBars" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="var(--success, #10b981)" stopOpacity={0.85}/>
                                <stop offset="100%" stopColor="var(--primary, #6366f1)" stopOpacity={1}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-subtle, rgba(255, 255, 255, 0.05))" />
                            <XAxis type="number" tickFormatter={compactCurrencyFormatter} stroke="var(--text-muted, #6b7280)" tick={{ fontSize: 10 }} />
                            <YAxis type="category" dataKey="description" width={100} stroke="var(--text-muted, #6b7280)" tick={{ fontSize: 10 }} />
                            <Tooltip cursor={false} content={<CustomTooltip formatter={currencyFormatter} />} />
                            <Bar dataKey="total_amount" name="Ingreso Acumulado" fill="url(#gradServBars)" radius={[0, 4, 4, 0]} barSize={16} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="stats-charts-row mt-4">
                  {catDistServices ? (
                    <div className="stats-panel-card">
                      <div className="panel-header">
                        <h3 className="panel-title">Distribución de Categorías</h3>
                      </div>
                      <div className="panel-body flex-body-centered">
                        <InteractiveDonut data={catDistServices} nameKey="category" colorOffset={2} formatter={currencyFormatter} />
                      </div>
                    </div>
                  ) : (
                    <PendingBackendCard
                      title="Distribución de Categorías (Servicios)"
                      note="Este widget requiere habilitar el endpoint /billing/category-distribution?entity_type=service en el backend (ver README). Por ahora responde 404, así que no hay nada que mostrar todavía — no es un error de esta pantalla."
                    />
                  )}

                  <div className="stats-panel-card">
                    <div className="panel-header">
                      <h3 className="panel-title">Uso Operativo e Indicadores de Gestión</h3>
                    </div>
                    <div className="panel-body">
                      <div className="stats-operational-insights">
                        <div className="operational-card">
                          <div className="op-card-icon icon-emerald">
                            <Clock width="16" height="16" />
                          </div>
                          <div className="op-card-meta">
                            <span className="op-card-val">
                              {serviceUtilization.avgDuration ? `${Math.round(serviceUtilization.avgDuration)} min` : 'N/A'}
                            </span>
                            <span className="op-card-label">Duración media estimada</span>
                          </div>
                        </div>

                        <div className="operational-card">
                          <div className="op-card-icon icon-indigo">
                            <Target width="16" height="16" />
                          </div>
                          <div className="op-card-meta">
                            <span className="op-card-val" title={serviceUtilization.mostRequested?.description}>
                              {serviceUtilization.mostRequested ? serviceUtilization.mostRequested.description : 'Ninguno'}
                            </span>
                            <span className="op-card-label">Servicio estrella del período</span>
                          </div>
                        </div>

                        <div className="operational-card">
                          <div className="op-card-icon icon-purple">
                            <Wrench width="16" height="16" />
                          </div>
                          <div className="op-card-meta">
                            <span className="op-card-val">{serviceUtilization.totalRequests}</span>
                            <span className="op-card-label">Servicios completados</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="stats-charts-row mt-6">
        <div className="stats-panel-card">
          <div className="panel-header">
            <h3 className="panel-title">Métodos de Pago Utilizados</h3>
            <p className="panel-subtitle">Distribución del recaudo según el canal de cobro</p>
          </div>
          <div className="panel-body flex-body-centered">
            {paymentMethodsData ? (
              <InteractiveDonut
                data={paymentMethodsData}
                colorOffset={4}
                formatter={(v) => `${v} ${v === 1 ? 'factura' : 'facturas'}`}
                valueSuffixLabel
              />
            ) : (
              <div className="stats-placeholder-container">
                <CreditCard width="20" height="20" style={{ opacity: 0.6 }} />
                <p className="placeholder-text-muted">
                  No se pudieron interpretar los métodos de pago para este período.
                  {paymentMethodsRaw
                    ? ' El endpoint respondió, pero con un formato distinto al esperado — revisa la consola del navegador para ver la forma exacta y ajustar el parser.'
                    : ' Verifica que las facturas tengan un método de pago asignado.'}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="stats-panel-card">
          <div className="panel-header">
            <h3 className="panel-title">Estado de Facturación</h3>
            <p className="panel-subtitle">
              Distribución de las facturas del período por estado
              {dianActivity ? ' (incluye documentos ya transmitidos a la DIAN)' : ''}
            </p>
          </div>
          <div className="panel-body flex-body-centered">
            {invoiceStatusData.length ? (
              <InteractiveStatusFunnel
                data={invoiceStatusData}
                formatter={(v) => `${v} ${v === 1 ? 'factura' : 'facturas'}`}
              />
            ) : (
              <div className="stats-placeholder-container">
                <p className="placeholder-text-muted">No se registran facturas en el período consultado.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="stats-panel-card mt-6">
        <div className="panel-header">
          <h3 className="panel-title">Clientes Destacados (Top 5)</h3>
          <p className="panel-subtitle">Principales cuentas comerciales por volumen de facturación y transacciones completadas</p>
        </div>
        <div className="panel-body">
          {topClients.length ? (
            <div className="stats-top-clients-table">
              <div className="table-header-row">
                <span>Cliente</span>
                <span className="text-center">Volumen de Transacciones</span>
                <span className="text-right">Total Acumulado</span>
              </div>
              {topClients.map((client, i) => (
                <div className="table-data-row" key={client.name}>
                  <div className="client-data-meta">
                    <span className="client-avatar-badge">{client.name.charAt(0).toUpperCase()}</span>
                    <div>
                      <span className="client-primary-name">{client.name}</span>
                      <span className="client-rank-label">Cuenta comercial Nivel {i + 1}</span>
                    </div>
                  </div>
                  <div className="client-count-col">
                    <span className="transaction-pill">{client.count} {client.count === 1 ? 'Factura' : 'Facturas'}</span>
                  </div>
                  <div className="client-total-col">
                    {Helpers.formatCurrency(client.total)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="stats-placeholder-container">
              <p className="placeholder-text-muted">Sin histórico de transacciones comerciales facturadas.</p>
            </div>
          )}
        </div>
      </div>

      <div className="stats-panel-card stats-insights-panel mt-6">
        <div className="panel-header flex-header">
          <div>
            <h3 className="panel-title">Sugerencias Operativas</h3>
            <p className="panel-subtitle">Diagnósticos comerciales generados en función del histórico y la rotación</p>
          </div>
          <span className="insights-badge">Análisis Automático</span>
        </div>
        <div className="panel-body">
          <div className="stats-suggestions-column">
            {suggestions.length === 0 && (
              <div className="stats-placeholder-container">
                <p className="placeholder-text-muted">Los flujos de datos no muestran desviaciones significativas para el periodo evaluado.</p>
              </div>
            )}
            {suggestions.map((s, idx) => {
              const Icon = s.icon;
              const accentColor = s.type === 'alert' ? 'var(--danger)' : s.type === 'idle' ? 'var(--warning)' : 'var(--gold)';
              return (
                <motion.div
                  className={`stats-suggestion-item-row type-${s.type}`}
                  key={idx}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  style={{ borderLeft: `4px solid ${accentColor}` }}
                >
                  <div className="suggestion-icon-ring">
                    <Icon width="16" height="16" />
                  </div>
                  <div className="suggestion-text-content">
                    <h5 className="suggestion-title-label">{s.title}</h5>
                    <p className="suggestion-body-desc">{s.text}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}