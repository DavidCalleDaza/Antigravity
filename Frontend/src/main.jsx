import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/common/ErrorBoundary'
import './utils/formValidationTooltip.js'
import './utils/customTooltip.js'

// Inyección de consola móvil Eruda para depuración en iPhone / iOS WebKit (?debug=true)
if (typeof window !== 'undefined') {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('debug') === 'true' || localStorage.getItem('donapp_debug') === 'true') {
      localStorage.setItem('donapp_debug', 'true');
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/eruda';
      script.onload = () => {
        if (window.eruda) window.eruda.init();
      };
      document.head.appendChild(script);
    }
  } catch (e) {
    // Ignorar si localStorage está deshabilitado en modo privado
  }
}

// Global CSS Imports
import '../css/variables.css'
import '../css/reset.css'
import '../css/base.css'
import '../css/animations.css'
import '../css/components.css'
import '../css/utilities.css'
import '../css/layout.css'

// Page Specific CSS (preserving original architecture)
import '../css/pages/landing.css'
import '../css/pages/auth.css'
import '../css/pages/products.css'
import '../css/pages/services.css'
import '../css/pages/billing.css'
import '../css/pages/agenda.css'
import '../css/pages/wall.css'
import '../css/pages/statistics.css'
import '../css/pages/profile.css'
import '../css/pages/Customers.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
