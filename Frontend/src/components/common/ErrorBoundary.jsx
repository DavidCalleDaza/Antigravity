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
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          backgroundColor: '#0b0c10',
          color: '#f5f0e8',
          textAlign: 'center',
        }}>
          <div style={{ maxWidth: '480px' }}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              width="48"
              height="48"
              style={{ margin: '0 auto 1.5rem', color: '#c9a55a' }}
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              marginBottom: '0.75rem',
              color: '#f5f0e8',
            }}>
              Algo no cargó correctamente
            </h2>
            <p style={{
              fontSize: '0.95rem',
              color: '#8a8d97',
              lineHeight: 1.6,
              marginBottom: '1.5rem',
            }}>
              Por favor recarga la página. Si el problema persiste, intenta desactivar las
              protecciones de privacidad avanzada en los ajustes de tu navegador.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '0.75rem 2rem',
                fontSize: '0.95rem',
                fontWeight: 600,
                color: '#0b0c10',
                backgroundColor: '#c9a55a',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
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
