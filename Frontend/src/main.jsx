import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/common/ErrorBoundary'

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
