/* ============================================
   SERVINOW — Chart Component Wrapper
   Thin wrapper over Chart.js with Servinow theme
   ============================================ */

const ChartComponent = {
  instances: {},

  defaults: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: { family: "'Inter', sans-serif", size: 12 }
        }
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleFont: { family: "'Inter', sans-serif", size: 13 },
        bodyFont: { family: "'Inter', sans-serif", size: 12 },
        padding: 12,
        cornerRadius: 8,
        displayColors: true
      }
    }
  },

  /**
   * Create a line chart
   */
  line(canvasId, { labels, datasets, options = {} }) {
    return this._create(canvasId, 'line', labels, datasets.map(ds => ({
      ...ds,
      borderWidth: 2.5,
      pointRadius: 4,
      pointHoverRadius: 6,
      tension: 0.4,
      fill: ds.fill !== undefined ? ds.fill : true
    })), options);
  },

  /**
   * Create a bar chart
   */
  bar(canvasId, { labels, datasets, options = {} }) {
    return this._create(canvasId, 'bar', labels, datasets.map(ds => ({
      ...ds,
      borderRadius: 8,
      borderWidth: 0,
      maxBarThickness: 48
    })), options);
  },

  /**
   * Create a doughnut chart
   */
  doughnut(canvasId, { labels, data, options = {} }) {
    return this._create(canvasId, 'doughnut', labels, [{
      data,
      backgroundColor: APP_CONFIG.CHART_COLORS.slice(0, data.length),
      borderWidth: 0,
      hoverOffset: 8
    }], {
      cutout: '70%',
      ...options
    });
  },

  /**
   * Internal: Create chart instance
   */
  _create(canvasId, type, labels, datasets, extraOptions = {}) {
    // Destroy existing instance
    if (this.instances[canvasId]) {
      this.instances[canvasId].destroy();
    }

    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');

    const config = {
      type,
      data: { labels, datasets },
      options: {
        ...this.defaults,
        ...extraOptions,
        plugins: {
          ...this.defaults.plugins,
          ...(extraOptions.plugins || {})
        },
        scales: type !== 'doughnut' ? {
          x: {
            grid: { display: false },
            ticks: { font: { family: "'Inter', sans-serif", size: 11 }, color: '#94a3b8' }
          },
          y: {
            grid: { color: 'rgba(148, 163, 184, 0.1)' },
            ticks: { font: { family: "'Inter', sans-serif", size: 11 }, color: '#94a3b8' },
            beginAtZero: true
          },
          ...(extraOptions.scales || {})
        } : undefined
      }
    };

    this.instances[canvasId] = new Chart(ctx, config);
    return this.instances[canvasId];
  },

  destroy(canvasId) {
    if (this.instances[canvasId]) {
      this.instances[canvasId].destroy();
      delete this.instances[canvasId];
    }
  }
};
