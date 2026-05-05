import AppRoutes from './routes/AppRoutes'
import SubdomainStorePage from './pages/SubdomainStorePage'
import { isSubdomain } from './utils/subdomainHelper'
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify'
import { HelmetProvider } from 'react-helmet-async'

function App() {
  // Check if we're on a subdomain
  const onSubdomain = isSubdomain();

  return (
    <HelmetProvider>
      <ToastContainer
        position='bottom-right'
        autoClose={3500}
        hideProgressBar
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss={false}
        draggable={false}
        pauseOnHover
        theme='dark'
        limit={3}
        toastStyle={{
          borderRadius: '12px',
          padding: '12px 16px',
          fontSize: '14px',
          fontWeight: '500',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }}
      />
      {onSubdomain ? <SubdomainStorePage /> : <AppRoutes />}
    </HelmetProvider>
  )
}

export default App
