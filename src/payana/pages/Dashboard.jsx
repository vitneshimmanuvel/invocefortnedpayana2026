import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  FileText, 
  BarChart3, 
  History, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  ArrowRight, 
  Activity, 
  Globe, 
  Settings,
  RefreshCw,
  Database,
  Wifi,
  WifiOff
} from 'lucide-react';

import toast from 'react-hot-toast';
import { payanaInvoiceAPI } from '../payanaServices/api';

const PayanaDashboard = ({ onNavigate }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [awsInfo, setAwsInfo] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    totalRevenue: 0,
    totalInvoices: 0,
    paidInvoices: 0,
    pendingInvoices: 0,
    overdueInvoices: 0,
    thisMonthRevenue: 0,
    lastMonthRevenue: 0,
    recentInvoices: [],
    upcomingDueDates: [],
    monthlyGrowth: 0
  });

  const directConnectionTest = async () => {
    try {
      const res = await payanaInvoiceAPI.testConnection();
      return { success: res.success, region: 'Neon DB (Cloud)', targetTable: 'invoices' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const getAnalyticsFromDynamoDB = async () => {
    try {
      console.log('📊 Fetching analytics via API...');
      const res = await payanaInvoiceAPI.getAnalytics();
      if (res.success && res.data) {
        return {
          success: true,
          data: {
            ...res.data,
            recentInvoices: (res.data.recentInvoices || []).map(inv => ({
              invoiceNumber: inv.invoice_number || inv.invoiceNumber,
              customerName: inv.client_name || inv.customerName,
              amount: parseFloat(inv.total_with_tax || inv.amount || 0),
              status: inv.status || 'Pending',
              createdAt: inv.created_at || inv.createdAt,
              dueDate: inv.invoice_date || inv.dueDate
            }))
          }
        };
      }
      return { success: false, data: null };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Test AWS connection on mount
  useEffect(() => {
    testAWSConnectionOnLoad();
  }, []);

  const testAWSConnectionOnLoad = async () => {
    try {
      console.log('Testing AWS connection on dashboard load...');
      const result = await directConnectionTest();

      if (result.success) {
        setConnectionStatus('connected');
        setAwsInfo(result);
        console.log('✅ AWS connection established:', result);
      } else {
        setConnectionStatus('error');
        console.error('❌ AWS connection failed:', result);
      }
    } catch (error) {
      setConnectionStatus('error');
      console.error('❌ AWS connection test error:', error);
    }
  };

  // Helper functions
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Detect dark mode preference
  useEffect(() => {
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(darkModeQuery.matches);

    const handleChange = (e) => setIsDarkMode(e.matches);
    darkModeQuery.addEventListener('change', handleChange);

    return () => darkModeQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (connectionStatus === 'connected') {
      loadDashboardData();
    }
  }, [connectionStatus]);

  const loadDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      console.log('Loading dashboard data from AWS DynamoDB...');
      const response = await getAnalyticsFromDynamoDB();

      if (!response.success) {
        toast.error(`Failed to load dashboard data: ${response.error}`);
        return;
      }

      const analytics = response.data;
      console.log('Analytics data loaded:', analytics);

      // Calculate current and last month revenue
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();

      const currentMonthData = analytics.monthlyRevenue.find(m => 
        m.year === currentYear && 
        m.month === new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' })
      );

      const lastMonthData = analytics.monthlyRevenue.find(m => {
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        return m.year === lastMonthYear && 
               m.month === new Date(lastMonthYear, lastMonth).toLocaleString('default', { month: 'long' });
      });

      const currentMonthRevenue = currentMonthData?.revenue || 0;
      const lastMonthRevenue = lastMonthData?.revenue || 0;

      const monthlyGrowth = lastMonthRevenue > 0 
        ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
        : currentMonthRevenue > 0 ? 100 : 0;

      setDashboardData({
        totalRevenue: analytics.totalRevenue,
        totalInvoices: analytics.totalInvoices,
        paidInvoices: analytics.paidInvoices,
        pendingInvoices: analytics.pendingInvoices,
        overdueInvoices: analytics.overdueInvoices || 0,
        thisMonthRevenue: currentMonthRevenue,
        lastMonthRevenue,
        recentInvoices: analytics.recentInvoices,
        upcomingDueDates: [],
        monthlyGrowth
      });

      if (isRefresh) {
        toast.success('Dashboard data refreshed successfully');
      } else {
        toast.success('Dashboard loaded from AWS DynamoDB');
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error(`Failed to load dashboard: ${error.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadDashboardData(true);
  };

  const handleTestConnection = async () => {
    setConnectionStatus('connecting');
    await testAWSConnectionOnLoad();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'Overdue':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Paid':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'Pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'Overdue':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-green-400';
      case 'connecting':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return `Connected to Neon Database`;
      case 'connecting':
        return 'Connecting to Neon Database...';
      case 'error':
        return 'Database Connection failed - Click to retry';
      default:
        return 'Unknown status';
    }
  };

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="w-4 h-4" />;
      case 'connecting':
        return <RefreshCw className="w-4 h-4 animate-spin" />;
      case 'error':
        return <WifiOff className="w-4 h-4" />;
      default:
        return <Database className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
        <div className="flex flex-col items-center space-y-4">
          <div className="flex items-center space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <Database className="w-6 h-6 text-blue-600 ml-3" />
          </div>
          <div className="text-center">
            <div className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>
              Loading Payana Dashboard
            </div>
            <div className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
              Connecting to Neon Database...
            </div>
            {connectionStatus === 'error' && (
              <button
                onClick={handleTestConnection}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Retry Connection
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={isDarkMode ? 'bg-gradient-to-r from-slate-800 to-slate-700' : 'bg-gradient-to-r from-blue-500 to-cyan-500'}
      >
        <div className="px-5 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center h-12 px-3 rounded-lg bg-white p-1.5 shadow-md">
                <img
                  src="https://settlo-invoices.s3.ap-south-1.amazonaws.com/assets/payana-logo.png"
                  alt="Payana Logo"
                  className="h-full w-auto object-contain"
                />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Welcome to Payana</h1>
                <div className="flex items-center space-x-2 text-white text-opacity-80 text-sm mt-1">
                  <button
                    onClick={handleTestConnection}
                    className="flex items-center space-x-1 hover:text-white transition-colors"
                  >
                    {getConnectionIcon()}
                    <span className={getConnectionStatusColor()}>
                      {getConnectionStatusText()}
                    </span>
                  </button>
                  <span>•</span>
                  <span>
                    {new Date().toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleRefresh}
                disabled={refreshing || connectionStatus !== 'connected'}
                className="flex items-center space-x-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onNavigate('payanaCreateInvoice')}
                className="flex items-center space-x-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-6 py-3 rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Create Invoice</span>
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Dashboard Content */}
      <div className="px-5 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Revenue */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`p-6 rounded-xl shadow-sm ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    Total Revenue
                  </p>
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>
                    {formatCurrency(dashboardData.totalRevenue)}
                  </p>
                  <p className={`text-xs ${dashboardData.monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'} flex items-center mt-1`}>
                    {dashboardData.monthlyGrowth >= 0 ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    {Math.abs(dashboardData.monthlyGrowth).toFixed(1)}% from last month
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </motion.div>

            {/* Total Invoices */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className={`p-6 rounded-xl shadow-sm ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    Total Invoices
                  </p>
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>
                    {dashboardData.totalInvoices}
                  </p>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'} mt-1`}>
                    {dashboardData.paidInvoices} paid, {dashboardData.pendingInvoices} pending
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </motion.div>

            {/* Paid Invoices */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className={`p-6 rounded-xl shadow-sm ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    Paid Invoices
                  </p>
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>
                    {dashboardData.paidInvoices}
                  </p>
                  <p className={`text-xs text-green-600 mt-1`}>
                    {dashboardData.totalInvoices > 0 
                      ? ((dashboardData.paidInvoices / dashboardData.totalInvoices) * 100).toFixed(1)
                      : 0}% completion rate
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </motion.div>

            {/* Pending Invoices */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className={`p-6 rounded-xl shadow-sm ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    Pending Invoices
                  </p>
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>
                    {dashboardData.pendingInvoices}
                  </p>
                  {dashboardData.overdueInvoices > 0 && (
                    <p className={`text-xs text-red-600 mt-1`}>
                      {dashboardData.overdueInvoices} overdue
                    </p>
                  )}
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Recent Invoices Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className={`p-6 rounded-xl shadow-sm ${isDarkMode ? 'bg-slate-800' : 'bg-white'} mb-6`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>
                Recent Invoices
              </h3>
              <button
                onClick={() => onNavigate('payanaInvoiceHistory')}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
              >
                View all <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
            <div className="space-y-3">
              {dashboardData.recentInvoices.length > 0 ? (
                dashboardData.recentInvoices.map((invoice, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(invoice.status)}
                      <div>
                        <p className={`font-medium ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>
                          #{invoice.invoice_number}
                        </p>
                        <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                          {invoice.client_name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>
                        {formatCurrency(invoice.total_with_tax)}
                      </p>
                      <span className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className={`text-center py-8 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No invoices found</p>
                  <button
                    onClick={() => onNavigate('payanaCreateInvoice')}
                    className="mt-2 text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Create your first invoice
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default PayanaDashboard;