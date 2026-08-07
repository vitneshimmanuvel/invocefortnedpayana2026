import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Home, FileText, BarChart3, History, Plus, Menu, X, User, Settings, LogOut } from 'lucide-react';

const PayanaNavbar = ({ onNavigate, currentPage = "dashboard" }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Detect dark mode preference
  useEffect(() => {
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(darkModeQuery.matches);
    
    const handleChange = (e) => setIsDarkMode(e.matches);
    darkModeQuery.addEventListener('change', handleChange);
    
    return () => darkModeQuery.removeEventListener('change', handleChange);
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'payanaCreateInvoice', label: 'Create Invoice', icon: Plus },
    { id: 'payanaInvoice', label: 'Invoices', icon: FileText },
    { id: 'payanaAnalytics', label: 'Analytics', icon: BarChart3 }
  ];

  const handleNavigation = (pageId) => {
    console.log('Navigating to:', pageId);
    if (onNavigate) {
      onNavigate(pageId);
    }
    setIsMobileMenuOpen(false);
  };

  const NavItem = ({ item, isMobile = false }) => {
    const isActive = currentPage === item.id;
    const Icon = item.icon;

    return (
      <button
        onClick={() => handleNavigation(item.id)}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
          isMobile ? 'w-full justify-start' : ''
        } ${
          isActive
            ? isDarkMode
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-white bg-opacity-20 text-white shadow-lg'
            : isDarkMode
            ? 'text-slate-300 hover:text-white hover:bg-slate-700'
            : 'text-white text-opacity-80 hover:text-white hover:bg-white hover:bg-opacity-10'
        }`}
      >
        <Icon className="w-4 h-4" />
        <span className={`${isMobile ? 'block' : 'hidden lg:block'}`}>{item.label}</span>
      </button>
    );
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 ${
      isDarkMode
        ? 'bg-gradient-to-r from-slate-800 to-slate-700'
        : 'bg-gradient-to-r from-blue-500 to-cyan-500'
    } shadow-lg`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div
            className="flex items-center cursor-pointer"
            onClick={() => handleNavigation('dashboard')}
          >
            <div className="flex items-center justify-center h-10 px-2 rounded-lg bg-white p-1 shadow-sm">
              <img
                src="https://settlo-invoices.s3.ap-south-1.amazonaws.com/assets/payana-logo.png"
                alt="Payana Overseas Solutions"
                className="h-full w-auto object-contain"
              />
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <NavItem key={item.id} item={item} />
            ))}
          </div>

          {/* Right Side */}
          <div className="flex items-center space-x-4">
            {/* Quick Create Button - Desktop */}
            <button
              onClick={() => handleNavigation('payanaCreateInvoice')}
              className="hidden sm:flex items-center space-x-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create</span>
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden flex items-center justify-center w-10 h-10 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5 text-white" />
              ) : (
                <Menu className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className={`md:hidden border-t ${
          isDarkMode ? 'border-slate-600 bg-slate-800' : 'border-blue-400 bg-blue-600'
        } bg-opacity-95`}>
          <div className="px-4 py-4 space-y-2">
            {navItems.map((item) => (
              <NavItem key={item.id} item={item} isMobile={true} />
            ))}

            {/* Mobile Quick Create */}
            <button
              onClick={() => handleNavigation('payanaCreateInvoice')}
              className="w-full flex items-center justify-center space-x-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors mt-4"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Invoice</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default PayanaNavbar;
