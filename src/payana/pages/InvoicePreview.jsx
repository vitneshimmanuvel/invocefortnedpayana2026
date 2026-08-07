
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  FileText,
  User,
  Calendar,
  MapPin,
  CreditCard,
  Phone,
  Mail,
  CheckCircle,
  Clock,
  AlertCircle,
  Printer,
  Share2,
  Edit
} from 'lucide-react';
import { payanaInvoiceAPI } from '../payanaServices/api';
import toast from 'react-hot-toast';

const InvoicePreview = ({ onNavigate }) => {
  const { invoiceNumber } = useParams();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState(null);

  // Helper functions
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
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
    if (invoiceNumber) {
      loadInvoice();
    }
  }, [invoiceNumber]);

  const loadInvoice = async () => {
    try {
      setLoading(true);
      const response = await payanaInvoiceAPI.getInvoice(invoiceNumber);
      console.log('Loaded invoice data:', response.data);
      setInvoice(response.data);
    } catch (error) {
      console.error('Error loading invoice:', error);
      toast.error('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!invoice) {
      toast.error('No invoice data available');
      return;
    }

    try {
      if (invoice.pdf_url) {
        window.open(invoice.pdf_url, '_blank');
        toast.success('PDF opened successfully!');
      } else {
        await downloadPayanaInvoicePDF(invoice);
        toast.success('PDF generated and downloaded!');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    }
  };

  // Alternative PDF generation using browser print
  const handlePrintAsPDF = () => {
    toast.info('Use your browser\'s print function and select "Save as PDF"', { duration: 4000 });
    window.print();
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 border-green-200 dark:border-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 border-red-200 dark:border-red-800';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'overdue':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className={`${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>Loading invoice...</span>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <FileText className={`mx-auto h-12 w-12 mb-4 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`} />
          <h3 className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-900'}`}>
            Invoice not found
          </h3>
          <button
            onClick={() => onNavigate('payanaInvoice')}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Back to Invoice History
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={isDarkMode ? 'bg-gradient-to-r from-slate-800 to-slate-700' : 'bg-gradient-to-r from-blue-500 to-cyan-500'}>
        <div className="px-5 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => onNavigate('payanaInvoice')}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors mr-4"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white bg-opacity-90 p-2">
                  <img
                    src="https://settlo-invoices.s3.ap-south-1.amazonaws.com/assets/payana-logo.png"
                    alt="Payana Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-white">Invoice Preview</h1>
                  <p className="text-white text-opacity-80 text-sm mt-1">
                    {invoice.invoice_number || invoice.invoiceNumber}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleDownloadPDF}
                className="flex items-center space-x-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Download PDF</span>
              </button>

              <button
                onClick={handlePrintAsPDF}
                className="flex items-center space-x-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Print</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-8">
        {/* Invoice Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl shadow-lg overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}
        >
          {/* Invoice Header */}
          <div className="p-8 border-b border-gray-200 dark:border-slate-700">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="mb-6 lg:mb-0">
                <h2 className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  PAYANA OVERSEAS SOLUTIONS
                </h2>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                  International Education & Migration Services
                </p>
              </div>

              <div className="text-right">
                <div className={`inline-flex items-center px-4 py-2 rounded-full border ${getStatusColor(invoice.status)}`}>
                  {getStatusIcon(invoice.status)}
                  <span className="ml-2 font-medium">{invoice.status}</span>
                </div>
                <div className="mt-2">
                  <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>Invoice Date</p>
                  <p className={`font-semibold ${isDarkMode ? 'text-slate-200' : 'text-gray-900'}`}>
                    {formatDate(invoice.date || invoice.invoice_date || invoice.created_at)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Client Information */}
              <div>
                <h3 className={`text-lg font-semibold mb-4 flex items-center ${isDarkMode ? 'text-slate-200' : 'text-gray-900'}`}>
                  <User className="w-5 h-5 mr-2 text-blue-600" />
                  Client Information
                </h3>
                <div className={`space-y-3 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  <div className="flex items-start">
                    <span className="font-medium w-24 flex-shrink-0">Name:</span>
                    <span>{invoice.name || invoice.client_name}</span>
                  </div>
                  {invoice.dob && (
                    <div className="flex items-start">
                      <span className="font-medium w-24 flex-shrink-0">DOB:</span>
                      <span>{invoice.dob}</span>
                    </div>
                  )}
                  <div className="flex items-start">
                    <span className="font-medium w-24 flex-shrink-0">Contact:</span>
                    <span>{invoice.contact || invoice.phone}</span>
                  </div>
                  {invoice.idType && (
                    <div className="flex items-start">
                      <span className="font-medium w-24 flex-shrink-0">ID Type:</span>
                      <span>{invoice.idType}</span>
                    </div>
                  )}
                  {invoice.idNumber && (
                    <div className="flex items-start">
                      <span className="font-medium w-24 flex-shrink-0">ID Number:</span>
                      <span>{invoice.idNumber}</span>
                    </div>
                  )}
                  <div className="flex items-start">
                    <MapPin className="w-4 h-4 mr-1 mt-0.5 text-blue-600 flex-shrink-0" />
                    <span className="font-medium w-20 flex-shrink-0">Country:</span>
                    <span>{invoice.country}</span>
                  </div>
                </div>
              </div>

              {/* Service Information */}
              <div>
                <h3 className={`text-lg font-semibold mb-4 flex items-center ${isDarkMode ? 'text-slate-200' : 'text-gray-900'}`}>
                  <FileText className="w-5 h-5 mr-2 text-blue-600" />
                  Service Details
                </h3>
                <div className={`space-y-3 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  <div className="flex items-start">
                    <span className="font-medium w-24 flex-shrink-0">Service:</span>
                    <span>{invoice.service || invoice.serviceOffered}</span>
                  </div>
                  {invoice.serviceOffered === 'Others' && invoice.customService && (
                    <div className="flex items-start">
                      <span className="font-medium w-24 flex-shrink-0">Details:</span>
                      <span>{invoice.customService}</span>
                    </div>
                  )}
                  <div className="flex items-start">
                    <span className="font-medium w-24 flex-shrink-0">Country:</span>
                    <span>{invoice.country}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="border-t border-gray-200 dark:border-slate-700 pt-8">
              <h3 className={`text-lg font-semibold mb-6 flex items-center ${isDarkMode ? 'text-slate-200' : 'text-gray-900'}`}>
                <CreditCard className="w-5 h-5 mr-2 text-blue-600" />
                Payment Summary
              </h3>

              <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className={`${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Service Fee</span>
                    <span className={`font-semibold ${isDarkMode ? 'text-slate-200' : 'text-gray-900'}`}>
                      {formatCurrency(invoice.totalFee || invoice.total_fee || invoice.subtotal)}
                    </span>
                  </div>

                  {(invoice.taxPercent > 0 || invoice.tax_percent > 0) && (
                    <div className="flex justify-between items-center">
                      <span className={`${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                        Tax ({invoice.taxPercent || invoice.tax_percent}%)
                      </span>
                      <span className={`font-semibold ${isDarkMode ? 'text-slate-200' : 'text-gray-900'}`}>
                        {formatCurrency(invoice.taxAmount || invoice.tax_amount)}
                      </span>
                    </div>
                  )}

                  <div className="border-t border-gray-300 dark:border-slate-600 pt-4">
                    <div className="flex justify-between items-center text-lg">
                      <span className={`font-semibold ${isDarkMode ? 'text-slate-200' : 'text-gray-900'}`}>
                        Total Amount
                      </span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(invoice.totalWithTax || invoice.total_with_tax || invoice.total)}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="font-medium text-green-600 dark:text-green-400">Paid Amount</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      {formatCurrency(invoice.paidAmount || invoice.paid_amount || 0)}
                    </span>
                  </div>

                  {(invoice.remainingAmount > 0 || invoice.remaining_amount > 0) && (
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-red-600 dark:text-red-400">Remaining Amount</span>
                      <span className="font-semibold text-red-600 dark:text-red-400">
                        {formatCurrency(invoice.remainingAmount || invoice.remaining_amount)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="border-t border-gray-200 dark:border-slate-700 pt-6 mt-8">
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleDownloadPDF}
                  className="flex-1 sm:flex-none flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </button>

                <button
                  onClick={handlePrintAsPDF}
                  className={`flex-1 sm:flex-none flex items-center justify-center space-x-2 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 px-6 py-3 rounded-lg transition-colors ${
                    isDarkMode ? 'text-slate-200' : 'text-gray-700'
                  }`}
                >
                  <Printer className="w-4 h-4" />
                  <span>Print</span>
                </button>

                <button
                  onClick={() => onNavigate('payanaInvoice')}
                  className={`flex-1 sm:flex-none flex items-center justify-center space-x-2 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 px-6 py-3 rounded-lg transition-colors ${
                    isDarkMode ? 'text-slate-200' : 'text-gray-700'
                  }`}
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to History</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default InvoicePreview;