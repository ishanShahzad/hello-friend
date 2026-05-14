import AppRoutes from './routes/AppRoutes'
import SubdomainStorePage from './pages/SubdomainStorePage'
import DocsPage from './pages/DocsPage'
import { isSubdomain, isDocsSubdomain } from './utils/subdomainHelper'
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify'
import { HelmetProvider } from 'react-helmet-async'
import Analytics from './components/common/Analytics'

function App() {
  // Reserved system subdomain: docs.rozare.com
  const onDocs = isDocsSubdomain();
  // Store subdomain (storename.rozare.com) 
  const onStoreSubdomain = !onDocs && isSubdomain();

  return (
    <HelmetProvider>
      <Analytics />
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
      {onDocs ? <DocsPage /> : onStoreSubdomain ? <SubdomainStorePage /> : <AppRoutes />}
    </HelmetProvider>
  )
}

export default App
