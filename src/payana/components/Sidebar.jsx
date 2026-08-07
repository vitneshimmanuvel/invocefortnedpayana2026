import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Plus,
  FileText,
  BarChart3,
  History,
  Settings,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Activity,
  DollarSign,
  Clock,
  CheckCircle
} from 'lucide-react';

const PayanaSidebar = ({ onNavigate, currentPage = 'dashboard', isCollapsed = false, onToggleCollapse }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Detect dark mode preference
  useEffect(() => {
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(darkModeQuery.matches);
    
    const handleChange = (e) => setIsDarkMode(e.matches);
    darkModeQuery.addEventListener('change', handleChange);
    
    return () => darkModeQuery.removeEventListener('change', handleChange);
  }, []);

  const mainNavItems = [
    { id: 'dashboard', name: 'Dashboard', icon: Home },
    { id: 'payanaCreateInvoice', name: 'Create Invoice', icon: Plus },
    { id: 'payanaInvoice', name: 'Invoice History', icon: History },
    { id: 'payanaAnalytics', name: 'Analytics', icon: BarChart3 }
  ];

  const secondaryNavItems = [
    { id: 'settings', name: 'Settings', icon: Settings }
  ];

  const NavItem = ({ item, isActive }) => {
    const Icon = item.icon;

    const handleClick = () => {
      console.log('Sidebar click:', item.id);
      if (item.id === 'settings') {
        console.log('Settings clicked');
      } else {
        if (onNavigate) {
          onNavigate(item.id);
        }
      }
    };

    return (
      <button
        onClick={handleClick}
        className={`w-full group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors duration-200 relative ${
          isActive
            ? isDarkMode
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-blue-500 text-white shadow-md'
            : isDarkMode
            ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
            : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700'
        } ${isCollapsed ? 'justify-center px-2' : ''}`}
      >
        {/* Active indicator */}
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full" />
        )}

        <div className={`flex items-center ${isCollapsed ? '' : 'w-full'}`}>
          <Icon className={`${isCollapsed ? 'w-5 h-5' : 'w-5 h-5 mr-3'} flex-shrink-0`} />
          
          {!isCollapsed && (
            <span className="font-medium truncate">{item.name}</span>
          )}
        </div>

        {/* Simple tooltip for collapsed state */}
        {isCollapsed && (
          <div className="absolute left-full ml-3 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
            {item.name}
          </div>
        )}
      </button>
    );
  };

  const QuickStats = () => {
    if (isCollapsed) return null;

    const stats = {
      totalRevenue: 125000,
      pendingInvoices: 3,
      paidInvoices: 12
    };

    return (
      <div className={`mx-3 p-4 rounded-lg mb-6 ${
        isDarkMode
          ? 'bg-slate-800 border border-slate-700'
          : 'bg-blue-50 border border-blue-200'
      }`}>
        <h4 className={`text-xs font-semibold mb-3 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
          Quick Overview
        </h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <DollarSign className={`w-3 h-3 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
              <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Revenue</span>
            </div>
            <span className={`text-xs font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
              ₹{(stats.totalRevenue / 1000).toFixed(0)}K
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className={`w-3 h-3 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
              <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Pending</span>
            </div>
            <span className={`text-xs font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
              {stats.pendingInvoices}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className={`w-3 h-3 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
              <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Paid</span>
            </div>
            <span className={`text-xs font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
              {stats.paidInvoices}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={false}
      animate={{ width: isCollapsed ? '5rem' : '16rem' }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={`fixed inset-y-0 left-0 z-40 flex flex-col ${
        isDarkMode
          ? 'bg-slate-900 border-r border-slate-700'
          : 'bg-white border-r border-gray-200'
      } shadow-lg`}
    >
      {/* Header */}
      <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} p-4 border-b ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
        {!isCollapsed && (
          <div className="flex items-center">
            <div className="flex items-center justify-center h-9 px-2 rounded-lg bg-white p-1 border border-gray-200 shadow-sm">
              <img
                src="https://settlo-invoices.s3.ap-south-1.amazonaws.com/assets/payana-logo.png"
                alt="Payana Logo"
                className="h-full w-auto object-contain"
              />
            </div>
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className={`p-1.5 rounded-lg transition-colors ${
            isDarkMode
              ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200'
              : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
          }`}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4">
        {/* Main Navigation */}
        <nav className="px-3 space-y-1">
          {mainNavItems.map((item) => (
            <NavItem key={item.id} item={item} isActive={currentPage === item.id} />
          ))}
        </nav>

        {/* Quick Stats */}
        <QuickStats />

        {/* Secondary Navigation */}
        <nav className="px-3 space-y-1 mt-6">
          {!isCollapsed && (
            <div className={`px-3 py-2 text-xs font-semibold ${
              isDarkMode ? 'text-slate-400' : 'text-gray-500'
            } border-t ${isDarkMode ? 'border-slate-700' : 'border-gray-200'} pt-4 mb-2`}>
              ACCOUNT
            </div>
          )}

          {secondaryNavItems.map((item) => (
            <NavItem key={item.id} item={item} isActive={false} />
          ))}
        </nav>
      </div>

      {/* User Profile */}
      <div className={`p-3 border-t ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
        <button
          className={`w-full flex items-center space-x-3 p-2 rounded-lg transition-colors ${
            isDarkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-gray-100 text-gray-700'
          } ${isCollapsed ? 'justify-center' : ''}`}
        >
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
            isDarkMode ? 'bg-slate-700' : 'bg-gray-200'
          }`}>
            <User className="w-4 h-4" />
          </div>
          
          {!isCollapsed && (
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">Admin</span>
              <span className="text-xs opacity-70">Payana User</span>
            </div>
          )}
        </button>
      </div>
    </motion.div>
  );
};

export default PayanaSidebar;
