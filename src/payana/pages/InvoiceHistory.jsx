import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  Plus,
  Eye,
  Download,
  Trash2,
  ArrowUpDown,
  Calendar,
  DollarSign,
  User,
  MapPin,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  X
} from 'lucide-react';

import toast from 'react-hot-toast';
import { downloadPayanaInvoicePDF, previewPayanaInvoicePDF } from '../payanaServices/pdfGenerator';
import { payanaInvoiceAPI } from '../payanaServices/api';

const InvoiceHistory = ({ onNavigate }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);

  const itemsPerPage = 10;

  const getInvoicesFromDynamoDB = async (params = {}) => {
    try {
      console.log('📋 Fetching invoices via API with params:', params);
      const res = await payanaInvoiceAPI.getInvoices({
        status: params.status,
        search: params.search,
      });

      let allItems = res.data || [];

      allItems.sort((a, b) => {
        let aValue = a[params.sortBy] || '';
        let bValue = b[params.sortBy] || '';
        if (params.sortOrder === 'desc') {
          return bValue > aValue ? 1 : -1;
        } else {
          return aValue > bValue ? 1 : -1;
        }
      });

      const startIndex = (params.page - 1) * params.limit;
      const endIndex = startIndex + params.limit;
      const paginatedItems = allItems.slice(startIndex, endIndex);
      const calculatedPages = Math.ceil(allItems.length / params.limit) || 1;

      return {
        success: true,
        data: paginatedItems,
        pagination: {
          total: allItems.length,
          pages: calculatedPages,
          currentPage: params.page,
          limit: params.limit
        }
      };
    } catch (error) {
      console.error('❌ Error fetching invoices:', error);
      return {
        success: false,
        error: error.message,
        data: [],
        pagination: { total: 0, pages: 1, currentPage: 1, limit: params.limit }
      };
    }
  };

  const deleteInvoiceFromDynamoDB = async (invoiceNumber) => {
    try {
      console.log('🗑️ Deleting invoice via API:', invoiceNumber);
      return await payanaInvoiceAPI.deleteInvoice(invoiceNumber);
    } catch (error) {
      console.error('❌ Error deleting invoice:', error);
      return { success: false, error: error.message };
    }
  };

  const generatePDFFromInvoice = async (invoice) => {
    try {
      console.log('📄 Generating PDF for invoice:', invoice.invoice_number);
      
      // If there's already a PDF URL, try to download it
      if (invoice.pdf_url) {
        const response = await fetch(invoice.pdf_url);
        if (response.ok) {
          return await response.blob();
        }
      }

      // Otherwise, create a simple text content
      const pdfContent = `
PAYANA INVOICE

Invoice Number: ${invoice.invoice_number}
Client: ${invoice.client_name}
Contact: ${invoice.client_contact}
ID Type: ${invoice.client_id_type}
ID Number: ${invoice.client_id_number}
Date of Birth: ${invoice.client_dob}
Country: ${invoice.country}
Service: ${invoice.service_offered}

Financial Details:
Total Fee: ${formatCurrency(invoice.total_fee)}
Tax Amount: ${formatCurrency(invoice.tax_amount)} (${invoice.tax_percent}%)
Total with Tax: ${formatCurrency(invoice.total_with_tax)}
Paid Amount: ${formatCurrency(invoice.paid_amount)}
Remaining Amount: ${formatCurrency(invoice.remaining_amount)}

Status: ${invoice.status}
Invoice Date: ${formatDate(invoice.invoice_date)}
Created: ${formatDate(invoice.created_at)}
Updated: ${formatDate(invoice.updated_at)}
      `.trim();

      // Create a simple text file as PDF substitute
      const blob = new Blob([pdfContent], { type: 'text/plain' });
      
      return blob;
    } catch (error) {
      console.error('❌ Error generating PDF:', error);
      throw error;
    }
  };

  // Helper functions
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (date, format = 'default') => {
    if (!date) return '';
    
    const dateObj = new Date(date);
    
    switch (format) {
      case 'short':
        return dateObj.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: 'numeric'
        });
      default:
        return dateObj.toLocaleDateString('en-US');
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'overdue':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
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
    loadInvoices();
  }, [currentPage, sortBy, sortOrder, statusFilter, searchTerm]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        sortBy,
        sortOrder,
        ...(statusFilter !== 'All' && { status: statusFilter }),
        ...(searchTerm && { search: searchTerm })
      };

      const response = await getInvoicesFromDynamoDB(params);
      if (response.success) {
        setInvoices(response.data);
        setTotalPages(response.pagination?.pages || 1);
      } else {
        toast.error(`Failed to load invoices: ${response.error}`);
        setInvoices([]);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
      toast.error('Failed to load invoices');
      setInvoices([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (status) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const handleViewInvoice = (invoiceNumber) => {
    onNavigate('payanaInvoicePreview', { invoiceNumber });
  };

  const handleDownloadPDF = async (invoice) => {
  try {
    toast.loading('Generating PDF...', { id: 'pdf-download' });
    
    // Convert invoice data from DynamoDB format to form format for PDF generation
    const invoiceData = {
      invoiceNumber: invoice.invoice_number,
      date: invoice.invoice_date,
      name: invoice.client_name,
      dob: invoice.client_dob,
      contact: invoice.client_contact,
      idType: invoice.client_id_type,
      idNumber: invoice.client_id_number,
      serviceOffered: invoice.service_offered,
      customService: invoice.custom_service || '',
      country: invoice.country,
      totalFee: invoice.total_fee,
      taxPercent: invoice.tax_percent,
      taxAmount: invoice.tax_amount,
      totalWithTax: invoice.total_with_tax,
      paidAmount: invoice.paid_amount,
      remainingAmount: invoice.remaining_amount
    };
    
    console.log('Mapped invoice data for PDF:', invoiceData);
    
    // Use the corrected PDF generator function
    const success = await downloadPayanaInvoicePDF(invoiceData);
    
    if (success) {
      toast.success('PDF downloaded successfully!', { id: 'pdf-download' });
    } else {
      toast.error('Failed to generate PDF', { id: 'pdf-download' });
    }
  } catch (error) {
    console.error('Error downloading PDF:', error);
    toast.error('Failed to generate PDF', { id: 'pdf-download' });
  }
};



  const handleDeleteInvoice = async (invoice) => {
    setInvoiceToDelete(invoice);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!invoiceToDelete) return;

    try {
      const response = await deleteInvoiceFromDynamoDB(invoiceToDelete.invoice_number);
      if (response.success) {
        toast.success('Invoice deleted successfully!');
        loadInvoices();
      } else {
        toast.error(`Failed to delete invoice: ${response.error}`);
      }
      setShowDeleteModal(false);
      setInvoiceToDelete(null);
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Failed to delete invoice');
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

  const StatusBadge = ({ status }) => (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
      {getStatusIcon(status)}
      <span className="ml-1">{status}</span>
    </span>
  );

  const DeleteModal = () => (
    <AnimatePresence>
      {showDeleteModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={() => setShowDeleteModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={`mx-4 p-6 rounded-2xl shadow-2xl max-w-md w-full ${
              isDarkMode ? 'bg-slate-800' : 'bg-white'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>
                  Delete Invoice
                </h3>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                  This action cannot be undone
                </p>
              </div>
            </div>

            <p className={`text-sm mb-6 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
              Are you sure you want to delete invoice{' '}
              <span className="font-semibold">{invoiceToDelete?.invoice_number}</span>?
            </p>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isDarkMode
                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
        <div className="flex items-center space-x-3">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          <span className={`${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>Loading invoices...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={isDarkMode ? 'bg-gradient-to-r from-slate-800 to-slate-700' : 'bg-gradient-to-r from-blue-500 to-cyan-500'}>
        <div className="px-5 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white bg-opacity-90 p-2">
                <img
                  src="https://settlo-invoices.s3.ap-south-1.amazonaws.com/assets/payana-logo.png"
                  alt="Payana Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Invoice History</h1>
                <p className="text-white text-opacity-80 text-sm mt-1">
                  Manage and track all your invoices from AWS DynamoDB
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('payanaCreateInvoice')}
              className="flex items-center space-x-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-6 py-3 rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">New Invoice</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 py-8">
        {/* Filters and Search */}
        <div className={`p-6 rounded-xl shadow-sm mb-6 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                isDarkMode ? 'text-slate-400' : 'text-gray-400'
              }`} />
              <input
                type="text"
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg border transition-colors ${
                  isDarkMode 
                    ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400 focus:border-blue-500' 
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              <Filter className={`w-5 h-5 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`} />
              <select
                value={statusFilter}
                onChange={(e) => handleStatusFilter(e.target.value)}
                className={`px-3 py-2 rounded-lg border transition-colors ${
                  isDarkMode 
                    ? 'bg-slate-700 border-slate-600 text-slate-100 focus:border-blue-500' 
                    : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500'
                } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
              >
                <option value="All">All Status</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>
          </div>
        </div>

        {/* Invoices Table */}
        <div className={`rounded-xl shadow-sm overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
          {invoices.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={`${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'}`}>
                    <tr>
                      <th className={`px-6 py-4 text-left text-xs font-medium uppercase tracking-wider ${
                        isDarkMode ? 'text-slate-300' : 'text-gray-500'
                      }`}>
                        <button
                          onClick={() => handleSort('invoice_number')}
                          className="flex items-center space-x-1 hover:text-blue-600"
                        >
                          <span>Invoice</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className={`px-6 py-4 text-left text-xs font-medium uppercase tracking-wider ${
                        isDarkMode ? 'text-slate-300' : 'text-gray-500'
                      }`}>
                        <button
                          onClick={() => handleSort('client_name')}
                          className="flex items-center space-x-1 hover:text-blue-600"
                        >
                          <span>Client</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className={`px-6 py-4 text-left text-xs font-medium uppercase tracking-wider ${
                        isDarkMode ? 'text-slate-300' : 'text-gray-500'
                      }`}>
                        Service
                      </th>
                      <th className={`px-6 py-4 text-left text-xs font-medium uppercase tracking-wider ${
                        isDarkMode ? 'text-slate-300' : 'text-gray-500'
                      }`}>
                        <button
                          onClick={() => handleSort('total_with_tax')}
                          className="flex items-center space-x-1 hover:text-blue-600"
                        >
                          <span>Amount</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className={`px-6 py-4 text-left text-xs font-medium uppercase tracking-wider ${
                        isDarkMode ? 'text-slate-300' : 'text-gray-500'
                      }`}>
                        Status
                      </th>
                      <th className={`px-6 py-4 text-left text-xs font-medium uppercase tracking-wider ${
                        isDarkMode ? 'text-slate-300' : 'text-gray-500'
                      }`}>
                        <button
                          onClick={() => handleSort('created_at')}
                          className="flex items-center space-x-1 hover:text-blue-600"
                        >
                          <span>Date</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className={`px-6 py-4 text-left text-xs font-medium uppercase tracking-wider ${
                        isDarkMode ? 'text-slate-300' : 'text-gray-500'
                      }`}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDarkMode ? 'divide-slate-700' : 'divide-gray-200'}`}>
                    {invoices.map((invoice) => (
                      <tr
                        key={invoice.invoice_number}  // Fixed: Using unique invoice_number as key
                        className={`transition-colors ${
                          isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className={`px-6 py-4 whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-gray-900'}`}>
                          <div className="flex items-center">
                            <FileText className="w-4 h-4 text-blue-500 mr-2" />
                            <span className="font-medium">{invoice.invoice_number}</span>
                          </div>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-gray-900'}`}>
                          <div className="flex items-center">
                            <User className="w-4 h-4 text-gray-400 mr-2" />
                            <div>
                              <div className="font-medium">{invoice.client_name}</div>
                              <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                                {invoice.client_contact}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-gray-900'}`}>
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                            <div>
                              <div className="font-medium">{invoice.service_offered}</div>
                              <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                                {invoice.country}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-gray-900'}`}>
                          <div className="flex items-center">
                            <DollarSign className="w-4 h-4 text-green-500 mr-2" />
                            <div>
                              <div className="font-semibold">{formatCurrency(invoice.total_with_tax)}</div>
                              {parseFloat(invoice.remaining_amount) > 0 && (
                                <div className={`text-sm ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                                  Due: {formatCurrency(invoice.remaining_amount)}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={invoice.status} />
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-gray-900'}`}>
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                            <span className="text-sm">{formatDate(invoice.created_at, 'short')}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleViewInvoice(invoice.invoice_number)}
                              className={`p-2 rounded-lg transition-colors ${
                                isDarkMode 
                                  ? 'text-blue-400 hover:bg-blue-900 hover:bg-opacity-20' 
                                  : 'text-blue-600 hover:bg-blue-50'
                              }`}
                              title="View Invoice"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDownloadPDF(invoice)}
                              className={`p-2 rounded-lg transition-colors ${
                                isDarkMode 
                                  ? 'text-green-400 hover:bg-green-900 hover:bg-opacity-20' 
                                  : 'text-green-600 hover:bg-green-50'
                              }`}
                              title="Download Invoice"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteInvoice(invoice)}
                              className={`p-2 rounded-lg transition-colors ${
                                isDarkMode 
                                  ? 'text-red-400 hover:bg-red-900 hover:bg-opacity-20' 
                                  : 'text-red-600 hover:bg-red-50'
                              }`}
                              title="Delete Invoice"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className={`px-6 py-4 border-t ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                          currentPage === 1
                            ? isDarkMode
                              ? 'text-slate-500 cursor-not-allowed'
                              : 'text-gray-400 cursor-not-allowed'
                            : isDarkMode
                            ? 'text-slate-300 hover:bg-slate-700'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                          currentPage === totalPages
                            ? isDarkMode
                              ? 'text-slate-500 cursor-not-allowed'
                              : 'text-gray-400 cursor-not-allowed'
                            : isDarkMode
                            ? 'text-slate-300 hover:bg-slate-700'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <FileText className={`mx-auto h-12 w-12 mb-4 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`} />
              <h3 className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-900'}`}>
                No invoices found
              </h3>
              <p className={`text-sm mb-6 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                {searchTerm || statusFilter !== 'All' 
                  ? 'Try adjusting your search or filter criteria.' 
                  : 'Get started by creating your first invoice.'
                }
              </p>
              <button
                onClick={() => onNavigate('payanaCreateInvoice')}
                className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isDarkMode
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Invoice
              </button>
            </div>
          )}
        </div>
      </div>

      <DeleteModal />
    </div>
  );
};

export default InvoiceHistory;
