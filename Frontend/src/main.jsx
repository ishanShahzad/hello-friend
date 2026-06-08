import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { BrowserRouter } from 'react-router-dom'
import { GlobalProvider } from './contexts/GlobalContext.jsx'
import { CurrencyProvider } from './contexts/CurrencyContext.jsx'
import { BuyerLocationProvider } from './contexts/BuyerLocationContext.jsx'
import { ThemeProvider } from './contexts/ThemeContext.jsx'
import { installHttpResilience } from './utils/httpResilience.js'
import { captureTikTokClickId } from './utils/tiktokPixel.js'
import AppErrorBoundary from './components/common/AppErrorBoundary.jsx'

installHttpResilience()
captureTikTokClickId() 

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <ThemeProvider>
      <AuthProvider>
        <CurrencyProvider>
          <BuyerLocationProvider>
            <GlobalProvider>
              <AppErrorBoundary>
                <App />
              </AppErrorBoundary>
            </GlobalProvider>
          </BuyerLocationProvider>
        </CurrencyProvider>
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
)
