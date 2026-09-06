import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, showDetails: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary] Error capturado en WebKit/iOS:', {
      message: error?.message || String(error),
      stack: error?.stack || 'No stack',
      componentStack: errorInfo?.componentStack || 'No component stack',
    });
  }

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, showDetails } = this.state;
      const errorMessage = error?.message || String(error || 'Error desconocido');
      const errorStack = error?.stack || errorInfo?.componentStack || '';

      return (
        <div 
          className="error-boundary-screen"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '1.5rem',
            fontFamily: 'var(--font-body, system-ui, -apple-system, sans-serif)',
            backgroundColor: 'var(--bg-primary, #0f172a)',
            color: '#f8fafc',
            textAlign: 'center',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ maxWidth: '560px', width: '100%', margin: '0 auto', background: 'rgba(30, 41, 59, 0.95)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
              width="48"
              height="48"
              style={{ margin: '0 auto 1rem' }}
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              marginBottom: '0.5rem',
              color: '#f8fafc',
            }}>
              {this.props.fallbackTitle || 'Algo no cargó correctamente en esta vista'}
            </h2>
            <p style={{
              fontSize: '0.875rem',
              color: '#94a3b8',
              lineHeight: 1.5,
              marginBottom: '1.25rem',
            }}>
              Se ha detectado un fallo en el renderizado. Puedes recargar la página o revisar los detalles técnicos abajo.
            </p>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '0.65rem 1.5rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#ffffff',
                  backgroundColor: '#3b82f6',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                Recargar página
              </button>
              <button
                onClick={() => this.setState({ showDetails: !showDetails })}
                style={{
                  padding: '0.65rem 1.25rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#cbd5e1',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                {showDetails ? 'Ocultar diagnóstico' : 'Ver diagnóstico'}
              </button>
            </div>

            {showDetails && (
              <div style={{
                textAlign: 'left',
                backgroundColor: '#020617',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '12px',
                maxHeight: '220px',
                overflowY: 'auto',
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                color: '#f87171',
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '6px', color: '#fb7185' }}>
                  {errorMessage}
                </div>
                {errorStack}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
