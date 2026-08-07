import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Calendar,
  Download,
  RefreshCw,
  BarChart3,
  PieChart,
  LineChart,
  Clock  // Added Clock import here
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { invoiceAPI } from '../settloServices/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Analytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('monthly');
  const [refreshing, setRefreshing] = useState(false);
  const [allInvoices, setAllInvoices] = useState([]);

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const fetchAllInvoicesFromDynamoDB = async () => {
    try {
      const response = await invoiceAPI.getInvoices();
      const allItems = response.data.data || [];
      
      const transformedInvoices = allItems.map(item => ({
        invoiceNumber: item.invoice_number,
        invoiceType: item.invoice_type,
        clientName: item.client_name,
        totalAmount: parseFloat(item.total_with_tax || item.total_fee || 0),
        collectedAmount: parseFloat(item.paid_amount || 0),
        pendingAmount: parseFloat(item.remaining_amount || 0),
        status: item.status,
        invoiceDate: new Date(item.invoice_date || item.created_at),
        dueDate: new Date(item.due_date || item.created_at),
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at),
        paymentType: item.payment_type
      }));

      return transformedInvoices.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error('Error fetching from Neon DB:', error);
      throw error;
    }
  };

  // Calculate analytics based on period
  const calculateAnalytics = (invoices, selectedPeriod) => {
    const now = new Date();
    let startDate;
    let periodFormat;
    let groupByFunction;

    // Determine date range based on period
    switch (selectedPeriod) {
      case 'weekly':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 84); // 12 weeks
        periodFormat = (date) => `Week ${getWeekNumber(date)}`;
        groupByFunction = (date) => `${date.getFullYear()}-W${getWeekNumber(date)}`;
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth() - 12, 1); // 12 months
        periodFormat = (date) => date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        groupByFunction = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'quarterly':
        startDate = new Date(now.getFullYear() - 2, 0, 1); // 8 quarters (2 years)
        periodFormat = (date) => `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
        groupByFunction = (date) => `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`;
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear() - 5, 0, 1); // 5 years
        periodFormat = (date) => date.getFullYear().toString();
        groupByFunction = (date) => date.getFullYear().toString();
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - 12, 1);
        periodFormat = (date) => date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        groupByFunction = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    // Filter invoices by date range
    const filteredInvoices = invoices.filter(invoice => invoice.createdAt >= startDate);
    
    // Basic statistics
    const totalInvoices = filteredInvoices.length;
    const totalRevenue = filteredInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
    const collectedAmount = filteredInvoices.reduce((sum, invoice) => sum + invoice.collectedAmount, 0);
    const pendingAmount = filteredInvoices.reduce((sum, invoice) => sum + invoice.pendingAmount, 0);
    
    // Count by status
    const paidCount = filteredInvoices.filter(inv => inv.status === 'Paid').length;
    const pendingCount = filteredInvoices.filter(inv => inv.status === 'Pending').length;
    const overdueCount = filteredInvoices.filter(inv => {
      const now = new Date();
      return inv.status !== 'Paid' && inv.dueDate < now;
    }).length;

    // Service type distribution
    const serviceTypes = filteredInvoices.reduce((acc, invoice) => {
      acc[invoice.invoiceType] = (acc[invoice.invoiceType] || 0) + 1;
      return acc;
    }, { SA: 0, SHR: 0, STS: 0, SDE: 0 });

    // Group data by time period for charts
    const monthlyData = {};
    const revenueByPeriod = {};
    const collectionByPeriod = {};
    
    filteredInvoices.forEach(invoice => {
      const periodKey = groupByFunction(invoice.createdAt);
      const periodLabel = periodFormat(invoice.createdAt);
      
      if (!monthlyData[periodLabel]) {
        monthlyData[periodLabel] = {
          revenue: 0,
          collected: 0,
          count: 0
        };
      }
      
      monthlyData[periodLabel].revenue += invoice.totalAmount;
      monthlyData[periodLabel].collected += invoice.collectedAmount;
      monthlyData[periodLabel].count += 1;
      
      revenueByPeriod[periodLabel] = (revenueByPeriod[periodLabel] || 0) + invoice.totalAmount;
      collectionByPeriod[periodLabel] = (collectionByPeriod[periodLabel] || 0) + invoice.collectedAmount;
    });

    // Average invoice value
    const avgInvoiceValue = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;

    // Collection rate
    const collectionRate = totalRevenue > 0 ? (collectedAmount / totalRevenue) * 100 : 0;

    // Client analytics
    const uniqueClients = new Set(filteredInvoices.map(inv => inv.clientName)).size;

    // Payment type distribution
    const paymentTypes = filteredInvoices.reduce((acc, invoice) => {
      const type = invoice.paymentType || 'Not Specified';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    return {
      totalInvoices,
      totalRevenue,
      collectedAmount,
      pendingAmount,
      paidCount,
      pendingCount,
      overdueCount,
      serviceTypes,
      monthlyData,
      revenueByPeriod,
      collectionByPeriod,
      avgInvoiceValue,
      collectionRate,
      uniqueClients,
      paymentTypes,
      period: selectedPeriod
    };
  };

  // Helper function to get week number
  const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      // Fetch all invoices from DynamoDB
      const invoices = await fetchAllInvoicesFromDynamoDB();
      setAllInvoices(invoices);
      
      // Calculate analytics
      const analyticsData = calculateAnalytics(invoices, period);
      setAnalytics(analyticsData);
      
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics data from DynamoDB');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
    toast.success('Analytics refreshed from DynamoDB!');
  };

  const exportData = () => {
    if (!analytics) return;
    
    const csvContent = generateCSVContent(analytics);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `settlo-analytics-${period}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    toast.success('Analytics data exported!');
  };

  const generateCSVContent = (data) => {
    let csv = 'Settlo Analytics Report\n\n';
    
    csv += 'SUMMARY\n';
    csv += 'Metric,Value\n';
    csv += `Total Invoices,${data.totalInvoices}\n`;
    csv += `Total Revenue,Rs.${data.totalRevenue.toFixed(2)}\n`;
    csv += `Collected Amount,Rs.${data.collectedAmount.toFixed(2)}\n`;
    csv += `Pending Amount,Rs.${data.pendingAmount.toFixed(2)}\n`;
    csv += `Collection Rate,${data.collectionRate.toFixed(2)}%\n`;
    csv += `Average Invoice Value,Rs.${data.avgInvoiceValue.toFixed(2)}\n`;
    csv += `Unique Clients,${data.uniqueClients}\n\n`;
    
    csv += 'SERVICE TYPES\n';
    csv += 'Type,Count\n';
    Object.entries(data.serviceTypes).forEach(([type, count]) => {
      const typeName = {
        SA: 'Settlo Academy',
        SHR: 'Settlo HR',
        STS: 'Settlo Tech Solutions',
        SDE: 'Settlo Distance Education'
      }[type] || type;
      csv += `${typeName},${count}\n`;
    });
    
    csv += '\nTIME SERIES DATA\n';
    csv += 'Period,Revenue,Collected\n';
    Object.entries(data.monthlyData).forEach(([period, values]) => {
      csv += `${period},${values.revenue.toFixed(2)},${values.collected.toFixed(2)}\n`;
    });
    
    return csv;
  };

  // Chart configurations
  const revenueChartData = {
    labels: analytics ? Object.keys(analytics.monthlyData) : [],
    datasets: [
      {
        label: 'Total Revenue',
        data: analytics ? Object.values(analytics.monthlyData).map(m => m.revenue) : [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Collected Amount',
        data: analytics ? Object.values(analytics.monthlyData).map(m => m.collected) : [],
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        fill: true,
      }
    ],
  };

  const serviceTypeChartData = {
    labels: ['Settlo Academy', 'Settlo HR', 'Settlo Tech Solutions', 'Settlo Distance Education'],
    datasets: [
      {
        data: analytics ? [
          analytics.serviceTypes.SA || 0,
          analytics.serviceTypes.SHR || 0,
          analytics.serviceTypes.STS || 0,
          analytics.serviceTypes.SDE || 0,
        ] : [],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(147, 51, 234, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(147, 51, 234)',
          'rgb(16, 185, 129)',
          'rgb(245, 158, 11)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const monthlyCountChartData = {
    labels: analytics ? Object.keys(analytics.monthlyData) : [],
    datasets: [
      {
        label: 'Invoice Count',
        data: analytics ? Object.values(analytics.monthlyData).map(m => m.count) : [],
        backgroundColor: 'rgba(147, 51, 234, 0.8)',
        borderColor: 'rgb(147, 51, 234)',
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(context) {
            if (context.dataset.label.includes('Revenue') || context.dataset.label.includes('Amount')) {
              return `${context.dataset.label}: ₹${context.parsed.y.toLocaleString()}`;
            }
            return `${context.dataset.label}: ${context.parsed.y}`;
          }
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return '₹' + value.toLocaleString();
          }
        }
      },
    },
  };

  const barChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y}`;
          }
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="xl" message="Loading analytics from DynamoDB..." />
      </div>
    );
  }

  const collectionRate = analytics ? analytics.collectionRate : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive business insights and performance metrics from DynamoDB
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
          
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          
          <button
            onClick={exportData}
            disabled={!analytics}
            className="flex items-center space-x-2 px-4 py-2 gradient-primary text-white rounded-lg hover:shadow-lg transition-all duration-200 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Export Data</span>
          </button>
        </div>
      </motion.div>

      {analytics && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: 'Total Revenue',
                value: `₹${analytics.totalRevenue.toLocaleString()}`,
                change: '+12.5%',
                icon: DollarSign,
                color: 'from-blue-500 to-blue-600',
              },
              {
                title: 'Collected Amount',
                value: `₹${analytics.collectedAmount.toLocaleString()}`,
                change: `${collectionRate.toFixed(1)}%`,
                icon: TrendingUp,
                color: 'from-green-500 to-green-600',
              },
              {
                title: 'Active Invoices',
                value: analytics.totalInvoices.toString(),
                change: '+8.2%',
                icon: BarChart3,
                color: 'from-purple-500 to-purple-600',
              },
              {
                title: 'Collection Rate',
                value: `${collectionRate.toFixed(1)}%`,
                change: '+5.1%',
                icon: PieChart,
                color: 'from-orange-500 to-orange-600',
              },
            ].map((metric, index) => (
              <motion.div
                key={metric.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="card p-6 hover-lift"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-gray-600 text-sm font-medium">{metric.title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{metric.value}</p>
                    <p className="text-sm text-green-600 mt-2">{metric.change} from last period</p>
                  </div>
                  <div className={`p-3 rounded-xl bg-gradient-to-r ${metric.color} text-white`}>
                    <metric.icon className="w-5 h-5" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Additional Key Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: 'Average Invoice Value',
                value: `₹${analytics.avgInvoiceValue.toLocaleString()}`,
                icon: DollarSign,
                color: 'from-indigo-500 to-indigo-600',
              },
              {
                title: 'Unique Clients',
                value: analytics.uniqueClients.toString(),
                icon: Users,
                color: 'from-pink-500 to-pink-600',
              },
              {
                title: 'Pending Amount',
                value: `₹${analytics.pendingAmount.toLocaleString()}`,
                icon: Clock,
                color: 'from-yellow-500 to-yellow-600',
              },
            ].map((metric, index) => (
              <motion.div
                key={metric.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="card p-6 hover-lift"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-gray-600 text-sm font-medium">{metric.title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{metric.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl bg-gradient-to-r ${metric.color} text-white`}>
                    <metric.icon className="w-5 h-5" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trend */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="card p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Revenue Trends ({period})</h3>
                <LineChart className="w-5 h-5 text-primary-600" />
              </div>
              <div className="chart-container">
                <Line data={revenueChartData} options={chartOptions} />
              </div>
            </motion.div>

            {/* Service Type Distribution */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="card p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Service Distribution</h3>
                <PieChart className="w-5 h-5 text-primary-600" />
              </div>
              <div className="chart-container">
                <Pie data={serviceTypeChartData} options={{ responsive: true }} />
              </div>
            </motion.div>
          </div>

          {/* Additional Charts Row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="card p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Invoice Volume ({period})</h3>
              <BarChart3 className="w-5 h-5 text-primary-600" />
            </div>
            <div className="chart-container">
              <Bar data={monthlyCountChartData} options={barChartOptions} />
            </div>
          </motion.div>

          {/* Detailed Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Payment Status Breakdown */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Payment Status</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-700">Paid Invoices</span>
                  </div>
                  <span className="font-semibold text-green-700">{analytics.paidCount}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-700">Pending Invoices</span>
                  </div>
                  <span className="font-semibold text-yellow-700">{analytics.pendingCount}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-700">Overdue Invoices</span>
                  </div>
                  <span className="font-semibold text-red-700">{analytics.overdueCount || 0}</span>
                </div>
              </div>
            </div>

            {/* Service Performance */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Service Performance</h3>
              <div className="space-y-4">
                {[
                  { name: 'Settlo Academy', type: 'SA', count: analytics.serviceTypes.SA || 0, color: 'bg-blue-500' },
                  { name: 'Settlo HR', type: 'SHR', count: analytics.serviceTypes.SHR || 0, color: 'bg-purple-500' },
                  { name: 'Settlo Tech Solutions', type: 'STS', count: analytics.serviceTypes.STS || 0, color: 'bg-green-500' },
                  { name: 'Settlo Distance Education', type: 'SDE', count: analytics.serviceTypes.SDE || 0, color: 'bg-orange-500' },
                ].map((service) => (
                  <div key={service.type} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 ${service.color} rounded`}></div>
                      <span className="text-sm font-medium text-gray-700">{service.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">{service.count} invoices</span>
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 ${service.color} rounded-full`}
                          style={{ 
                            width: `${analytics.totalInvoices > 0 ? (service.count / analytics.totalInvoices) * 100 : 0}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Payment Types Analysis */}
          {Object.keys(analytics.paymentTypes).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="card p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Payment Type Distribution</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(analytics.paymentTypes).map(([type, count]) => (
                  <div key={type} className="bg-gray-50 rounded-lg p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{count}</p>
                      <p className="text-sm text-gray-600">{type}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
};

export default Analytics;
