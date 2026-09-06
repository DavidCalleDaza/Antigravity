import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/common/ErrorBoundary'
import { useStore } from './store/useStore'
import { setApiTokenGetter, setApiLogoutHandler } from './utils/apiClient'
import './utils/formValidationTooltip.js'
import './utils/customTooltip.js'


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

// Conectar apiClient con el store de Zustand sin crear dependencia circular.
// IMPORTANTE: Esto se hace en runtime (no en evaluación de módulo), lo que
// permite que WebKit resuelva el grafo de módulos correctamente.
setApiTokenGetter(() => {
  try {
    return useStore.getState()?.currentUser?.token ?? null;
  } catch {
    return null;
  }
});
setApiLogoutHandler(() => {
  try {
    useStore.getState().logout();
  } catch {
    // Ignorar si el store no está disponible
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
