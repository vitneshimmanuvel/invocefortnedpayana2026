import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  FileText, 
  CheckCircle, 
  Clock,
  TrendingUp,
  Calendar,
  BarChart3,
  Users,
  Globe,
  RefreshCw,
  Database,
  PieChart
} from 'lucide-react';

import toast from 'react-hot-toast';
import { payanaInvoiceAPI } from '../payanaServices/api';

const PayanaAnalytics = ({ onNavigate }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState({
    totalRevenue: 0,
    totalInvoices: 0,
    paidInvoices: 0,
    pendingInvoices: 0,
    monthlyData: [],
    statusBreakdown: []
  });

  const getAnalyticsFromDynamoDB = async () => {
    try {
      console.log('📊 Fetching analytics via API...');
      const res = await payanaInvoiceAPI.getAnalytics();
      if (res.success && res.data) {
        return {
          success: true,
          data: {
            totalInvoices: res.data.totalInvoices || 0,
            totalRevenue: res.data.totalRevenue || 0,
            paidInvoices: res.data.paidInvoices || 0,
            pendingInvoices: res.data.pendingInvoices || 0,
            overdueInvoices: res.data.overdueInvoices || 0,
            monthlyData: (res.data.monthlyRevenue || []).map(m => ({
              month: `${m.month} ${m.year}`,
              revenue: m.revenue,
              invoices: m.count || 0
            })),
            statusBreakdown: [
              { status: 'Paid', count: res.data.paidInvoices || 0, percentage: res.data.totalInvoices ? Math.round(((res.data.paidInvoices || 0) / res.data.totalInvoices) * 100) : 0 },
              { status: 'Pending', count: res.data.pendingInvoices || 0, percentage: res.data.totalInvoices ? Math.round(((res.data.pendingInvoices || 0) / res.data.totalInvoices) * 100) : 0 }
            ]
          }
        };
      }
      return { success: false, data: null };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Helper functions
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Detect dark mode
  useEffect(() => {
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(darkModeQuery.matches);

    const handleChange = (e) => setIsDarkMode(e.matches);
    darkModeQuery.addEventListener('change', handleChange);

    return () => darkModeQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await getAnalyticsFromDynamoDB();

      if (response.success) {
        setAnalyticsData(response.data);
        toast.success('Analytics loaded successfully');
      } else {
        toast.error(`Failed to load analytics: ${response.error}`);
        // Set default data instead of crashing
        setAnalyticsData({
          totalRevenue: 0,
          totalInvoices: 0,
          paidInvoices: 0,
          pendingInvoices: 0,
          monthlyData: [],
          statusBreakdown: []
        });
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics');
      // Set default data instead of crashing
      setAnalyticsData({
        totalRevenue: 0,
        totalInvoices: 0,
        paidInvoices: 0,
        pendingInvoices: 0,
        monthlyData: [],
        statusBreakdown: []
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className={`${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>Loading analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={isDarkMode ? 'bg-gradient-to-r from-slate-800 to-slate-700' : 'bg-gradient-to-r from-blue-500 to-cyan-500'}>
        <div className="px-5 py-8">
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white bg-opacity-90 p-2">
              <img
                src="https://settlo-invoices.s3.ap-south-1.amazonaws.com/assets/payana-logo.png"
                alt="Payana Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Analytics Dashboard</h1>
              <p className="text-white text-opacity-80 text-sm mt-1">
                Business insights and performance metrics
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className={`p-6 rounded-xl shadow-sm ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                  Total Revenue
                </p>
                <p className={`text-2xl font-bold mt-2 ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>
                  {formatCurrency(analyticsData.totalRevenue)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900">
                <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className={`p-6 rounded-xl shadow-sm ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                  Total Invoices
                </p>
                <p className={`text-2xl font-bold mt-2 ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>
                  {analyticsData.totalInvoices}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900">
                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className={`p-6 rounded-xl shadow-sm ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                  Paid Invoices
                </p>
                <p className={`text-2xl font-bold mt-2 ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>
                  {analyticsData.paidInvoices}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className={`p-6 rounded-xl shadow-sm ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                  Pending Invoices
                </p>
                <p className={`text-2xl font-bold mt-2 ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>
                  {analyticsData.pendingInvoices}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900">
                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Revenue Bar Chart */}
          <div className={`p-6 rounded-xl shadow-sm ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
            <div className="flex items-center space-x-3 mb-6">
              <BarChart3 className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>
                Monthly Revenue Trend
              </h3>
            </div>
            <div className="space-y-4">
              {analyticsData.monthlyData?.length > 0 ? (
                analyticsData.monthlyData.map((month, index) => {
                  const maxRevenue = Math.max(...analyticsData.monthlyData.map(m => m.revenue));
                  const widthPercentage = maxRevenue > 0 ? (month.revenue / maxRevenue) * 100 : 0;

                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                          {month.month}
                        </span>
                        <span className={`text-sm font-semibold ${isDarkMode ? 'text-slate-200' : 'text-gray-900'}`}>
                          {formatCurrency(month.revenue)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3">
                        <div 
                          className="bg-blue-600 h-3 rounded-full transition-all duration-500" 
                          style={{ width: `${widthPercentage}%` }}
                        />
                      </div>
                      <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                        {month.invoices} invoices
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className={`w-12 h-12 mx-auto mb-3 opacity-50 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`} />
                  <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    No revenue data available
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Status Pie Chart */}
          <div className={`p-6 rounded-xl shadow-sm ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
            <div className="flex items-center space-x-3 mb-6">
              <PieChart className={`w-5 h-5 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} />
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>
                Invoice Status Distribution
              </h3>
            </div>
            <div className="space-y-4">
              {analyticsData.statusBreakdown?.length > 0 ? (
                <>
                  <div className="flex justify-center mb-6">
                    <div className="relative w-48 h-48">
                      <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                        {(() => {
                          const total = analyticsData.statusBreakdown.reduce((sum, item) => sum + item.value, 0);
                          let currentAngle = 0;

                          return analyticsData.statusBreakdown.map((item, index) => {
                            const percentage = (item.value / total) * 100;
                            const angle = (percentage / 100) * 360;
                            const x1 = 50 + 40 * Math.cos((currentAngle * Math.PI) / 180);
                            const y1 = 50 + 40 * Math.sin((currentAngle * Math.PI) / 180);
                            const x2 = 50 + 40 * Math.cos(((currentAngle + angle) * Math.PI) / 180);
                            const y2 = 50 + 40 * Math.sin(((currentAngle + angle) * Math.PI) / 180);

                            const largeArcFlag = angle > 180 ? 1 : 0;
                            const pathData = `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

                            currentAngle += angle;

                            return (
                              <path
                                key={index}
                                d={pathData}
                                fill={item.color}
                                className="hover:opacity-80 transition-opacity"
                              />
                            );
                          });
                        })()}
                      </svg>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {analyticsData.statusBreakdown.map((item, index) => {
                      const total = analyticsData.statusBreakdown.reduce((sum, item) => sum + item.value, 0);
                      const percentage = ((item.value / total) * 100).toFixed(1);

                      return (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: item.color }}
                            />
                            <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                              {item.name}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className={`text-sm font-semibold ${isDarkMode ? 'text-slate-200' : 'text-gray-900'}`}>
                              {item.value} ({percentage}%)
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <PieChart className={`w-12 h-12 mx-auto mb-3 opacity-50 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`} />
                  <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    No status data available
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <div className="flex items-center justify-center">
            <button
              onClick={() => onNavigate('payanaCreateInvoice')}
              className="inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <FileText className="w-4 h-4 mr-2" />
              Create New Invoice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayanaAnalytics;
