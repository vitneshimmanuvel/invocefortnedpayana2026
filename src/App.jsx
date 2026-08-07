import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Landing Page
import LandingPage from './LandingPage';

// Settlo Components
import SettloNavbar from '../src/settlo/components/Navbar';
import SettloSidebar from '../src/settlo/components/Sidebar';
import SettloDashboard from '../src/settlo/pages/Dashboard';
import SettloCreateInvoice from '../src/settlo/pages/CreateInvoice';
import SettloInvoiceHistory from '../src/settlo/pages/InvoiceHistory';
import SettloAnalytics from '../src/settlo/pages/Analytics';
import SettloInvoicePreview from '../src/settlo/pages/InvoicePreview';

// Payana Components
import PayanaNavbar from './payana/components/Navbar';
import PayanaSidebar from './payana/components/Sidebar';
import PayanaDashboard from './payana/pages/Dashboard';
import PayanaCreateInvoice from './payana/pages/CreateInvoice';
import PayanaInvoiceHistory from './payana/pages/InvoiceHistory';
import PayanaAnalytics from './payana/pages/Analytics';
import PayanaInvoicePreview from './payana/pages/InvoicePreview'; // NEW IMPORT

// Layout Components with proper navigation
const SettloLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const handleNavigation = (page) => {
    switch(page) {
      case 'dashboard':
        navigate('/settlo/dashboard');
        break;
      case 'create':
        navigate('/settlo/create');
        break;
      case 'history':
        navigate('/settlo/history');
        break;
      case 'analytics':
        navigate('/settlo/analytics');
        break;
      default:
        navigate('/settlo/dashboard');
    }
  };

  const getCurrentPage = () => {
    const path = location.pathname;
    if (path.includes('create')) return 'create';
    if (path.includes('history')) return 'history';
    if (path.includes('analytics')) return 'analytics';
    return 'dashboard';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SettloNavbar onNavigate={handleNavigation} currentPage={getCurrentPage()} />
      <div className="flex">
        <SettloSidebar onNavigate={handleNavigation} currentPage={getCurrentPage()} />
        <main className="flex-1 ml-64 pt-16 min-h-screen">
          <div className="p-6">
            <Routes>
              <Route path="dashboard" element={<SettloDashboard onNavigate={handleNavigation} />} />
              <Route path="create" element={<SettloCreateInvoice onNavigate={handleNavigation} />} />
              <Route path="history" element={<SettloInvoiceHistory onNavigate={handleNavigation} />} />
              <Route path="analytics" element={<SettloAnalytics onNavigate={handleNavigation} />} />
              <Route path="invoice/:invoiceNumber" element={<SettloInvoicePreview onNavigate={handleNavigation} />} />
              <Route path="" element={<SettloDashboard onNavigate={handleNavigation} />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
};

const PayanaLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // UPDATED NAVIGATION HANDLER WITH INVOICE PREVIEW
  const handleNavigation = (page, params) => {
    switch(page) {
      case 'dashboard':
        navigate('/payana/dashboard');
        break;
      case 'payanaCreateInvoice':
        navigate('/payana/create');
        break;
      case 'payanaInvoice':
        navigate('/payana/history');
        break;
      case 'payanaAnalytics':
        navigate('/payana/analytics');
        break;
      case 'payanaInvoicePreview':
        // NEW: Handle invoice preview navigation
        navigate(`/payana/invoice/${params.invoiceNumber}`);
        break;
      default:
        navigate('/payana/dashboard');
    }
  };

  const getCurrentPage = () => {
    const path = location.pathname;
    if (path.includes('create')) return 'payanaCreateInvoice';
    if (path.includes('history')) return 'payanaInvoice';
    if (path.includes('analytics')) return 'payanaAnalytics';
    if (path.includes('invoice/')) return 'payanaInvoicePreview';
    return 'dashboard';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PayanaNavbar onNavigate={handleNavigation} currentPage={getCurrentPage()} />
      <div className="flex">
        <PayanaSidebar 
          onNavigate={handleNavigation} 
          currentPage={getCurrentPage()}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <main className={`flex-1 ${sidebarCollapsed ? 'ml-20' : 'ml-64'} pt-16 min-h-screen transition-all duration-300`}>
          <div className="p-6">
            <Routes>
              <Route path="dashboard" element={<PayanaDashboard onNavigate={handleNavigation} />} />
              <Route path="create" element={<PayanaCreateInvoice onNavigate={handleNavigation} />} />
              <Route path="history" element={<PayanaInvoiceHistory onNavigate={handleNavigation} />} />
              <Route path="analytics" element={<PayanaAnalytics onNavigate={handleNavigation} />} />
              {/* NEW: Invoice Preview Route */}
              <Route path="invoice/:invoiceNumber" element={<PayanaInvoicePreview onNavigate={handleNavigation} />} />
              <Route path="" element={<PayanaDashboard onNavigate={handleNavigation} />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Landing Page */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Settlo Routes */}
        <Route path="/settlo/*" element={<SettloLayout />} />

        {/* Payana Routes */}
        <Route path="/payana/*" element={<PayanaLayout />} />
      </Routes>

      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            style: {
              background: '#10b981',
            },
          },
          error: {
            style: {
              background: '#ef4444',
            },
          },
        }}
      />
    </Router>
  );
}

export default App;
