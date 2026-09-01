import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Error capturado:', {
      message: error?.message || String(error),
      stack: error?.stack || 'No stack',
      componentStack: errorInfo?.componentStack || 'No component stack',
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div 
          className="error-boundary-screen"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '2rem',
            fontFamily: 'var(--font-body, system-ui, -apple-system, sans-serif)',
            backgroundColor: 'var(--bg-primary, var(--card-bg, #ffffff))',
            color: 'var(--text-primary, #111827)',
            textAlign: 'center',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ maxWidth: '480px', margin: '0 auto' }}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              width="52"
              height="52"
              style={{ margin: '0 auto 1.5rem', color: 'var(--text-primary, #111827)' }}
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <h2 style={{
              fontSize: '1.35rem',
              fontWeight: 600,
              marginBottom: '0.75rem',
              color: 'var(--text-primary, #111827)',
            }}>
              Algo no cargó correctamente
            </h2>
            <p style={{
              fontSize: '0.95rem',
              color: 'var(--text-secondary, #4b5563)',
              lineHeight: 1.6,
              marginBottom: '1.75rem',
            }}>
              Por favor recarga la página. Si el problema persiste, intenta desactivar las
              protecciones de privacidad avanzada en los ajustes de tu navegador.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary"
              style={{
                padding: '0.75rem 2.25rem',
                fontSize: '0.95rem',
                fontWeight: 600,
                color: '#ffffff',
                backgroundColor: '#000000',
                border: 'none',
                borderRadius: 'var(--radius-lg, 8px)',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-md, 0 4px 12px rgba(0,0,0,0.15))',
                transition: 'all 0.2s ease',
              }}
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
