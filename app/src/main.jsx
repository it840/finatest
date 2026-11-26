import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './lib/AuthContext'
import { PropertyProvider } from './lib/PropertyContext'
import ScanPage from './pages/ScanPage.jsx'
import './index.css'

// scanning an asset QR label opens …/?scan=Asset-001: show the protected scan page instead of the app
const scanCode = new URLSearchParams(window.location.search).get('scan')

ReactDOM.createRoot(document.getElementById('root')).render(scanCode ? (
  <React.StrictMode>
    <ScanPage code={scanCode} />
  </React.StrictMode>
) : (
  <React.StrictMode>
    <AuthProvider>
      <PropertyProvider>
        <App />
      </PropertyProvider>
    </AuthProvider>
  </React.StrictMode>
))
