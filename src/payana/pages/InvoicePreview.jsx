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
  Globe,
  CheckCircle,
  Clock,
  AlertCircle,
  Printer,
  Eye,
  Building
} from 'lucide-react';
import { payanaInvoiceAPI } from '../payanaServices/api';
import { downloadPayanaInvoicePDF, previewPayanaInvoicePDF } from '../payanaServices/pdfGenerator';
import { PAYANA_LOGO_BASE64, PAYANA_SIGNATURE_BASE64 } from '../payanaServices/invoiceAssets';
import toast from 'react-hot-toast';

const InvoicePreview = ({ onNavigate }) => {
  const { invoiceNumber } = useParams();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Helper functions
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return '';
    return date;
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
      setIsGenerating(true);
      toast.loading('Generating high quality PDF...', { id: 'pdf-dl' });
      const success = await downloadPayanaInvoicePDF(invoice);
      if (success) {
        toast.success('PDF downloaded successfully!', { id: 'pdf-dl' });
      } else {
        toast.error('Failed to download PDF', { id: 'pdf-dl' });
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF', { id: 'pdf-dl' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreviewPDF = async () => {
    if (!invoice) {
      toast.error('No invoice data available');
      return;
    }

    try {
      setIsGenerating(true);
      toast.loading('Opening PDF preview...', { id: 'pdf-prev' });
      const success = await previewPayanaInvoicePDF(invoice);
      if (success) {
        toast.success('PDF preview opened!', { id: 'pdf-prev' });
      } else {
        toast.error('Failed to open PDF preview', { id: 'pdf-prev' });
      }
    } catch (error) {
      console.error('Error previewing PDF:', error);
      toast.error('Failed to open PDF preview', { id: 'pdf-prev' });
    } finally {
      setIsGenerating(false);
    }
  };

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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
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
            className="text-red-600 hover:text-red-700 font-medium"
          >
            Back to Invoice History
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-slate-900' : 'bg-gray-100'}`}>
      {/* Top Header */}
      <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => onNavigate('payanaInvoice')}
                className="flex items-center justify-center w-9 h-9 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors"
                title="Back"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-white p-1.5 flex items-center justify-center shadow-inner">
                  <img src={PAYANA_LOGO_BASE64} alt="Payana Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold">Invoice Preview</h1>
                  <p className="text-white text-opacity-80 text-xs">
                    {invoice.invoice_number || invoice.invoiceNumber}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2.5">
              <button
                onClick={handlePreviewPDF}
                disabled={isGenerating}
                className="flex items-center space-x-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-3.5 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Eye className="w-4 h-4" />
                <span>PDF Preview</span>
              </button>

              <button
                onClick={handleDownloadPDF}
                disabled={isGenerating}
                className="flex items-center space-x-1.5 bg-white text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-bold shadow transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </button>

              <button
                onClick={handlePrintAsPDF}
                className="flex items-center space-x-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-3.5 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Print</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Sheet Preview */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white text-black rounded-lg shadow-xl p-6 sm:p-10 border-2 border-black"
        >
          {/* Company Title & Logo */}
          <div className="flex items-center justify-center gap-3 mb-3">
            <img src={PAYANA_LOGO_BASE64} alt="Payana Logo" className="w-12 h-12 object-contain flex-shrink-0" />
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#D81E00] tracking-wide uppercase">
              PAYANA OVERSEAS SOLUTIONS PVT LTD
            </h2>
          </div>

          {/* Centered INVOICE */}
          <div className="text-center mb-4">
            <span className="text-lg font-bold underline tracking-wider">
              INVOICE
            </span>
          </div>

          {/* Invoice Number & Date */}
          <div className="flex justify-between items-center text-sm font-medium pb-2 border-b border-gray-300 mb-5">
            <div>
              <span>Invoice Number: </span>
              <strong className="font-bold">{invoice.invoice_number || invoice.invoiceNumber}</strong>
            </div>
            <div>
              <span>Date: </span>
              <strong className="font-bold">{formatDate(invoice.date || invoice.invoice_date || invoice.created_at)}</strong>
            </div>
          </div>

          {/* Client Information */}
          <div className="mb-6">
            <h3 className="text-sm font-bold uppercase underline mb-3 text-gray-900">
              CLIENT INFORMATION
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 text-sm">
              <div className="flex">
                <span className="w-36 font-bold flex-shrink-0">GIVEN NAME</span>
                <span className="mx-2 font-bold">:</span>
                <span className="uppercase">{invoice.name || invoice.client_name}</span>
              </div>
              <div className="flex">
                <span className="w-36 font-bold flex-shrink-0">DATE OF BIRTH</span>
                <span className="mx-2 font-bold">:</span>
                <span>{invoice.dob || invoice.client_dob}</span>
              </div>
              <div className="flex">
                <span className="w-36 font-bold flex-shrink-0">CONTACT #</span>
                <span className="mx-2 font-bold">:</span>
                <span>{invoice.contact || invoice.client_phone || invoice.phone}</span>
              </div>
              <div className="flex">
                <span className="w-36 font-bold flex-shrink-0">
                  ID ({((invoice.idType || invoice.client_id_type || 'Aadhaar').toLowerCase().includes('pass') ? 'Passport' : 'Aadhaar')})
                </span>
                <span className="mx-2 font-bold">:</span>
                <span>{invoice.idNumber || invoice.client_id_number}</span>
              </div>
              <div className="flex">
                <span className="w-36 font-bold flex-shrink-0">SERVICE OFFERED</span>
                <span className="mx-2 font-bold">:</span>
                <span className="uppercase">{invoice.service || invoice.serviceOffered || invoice.service_offered}</span>
              </div>
              <div className="flex">
                <span className="w-36 font-bold flex-shrink-0">COUNTRY</span>
                <span className="mx-2 font-bold">:</span>
                <span className="uppercase">{invoice.country}</span>
              </div>
            </div>
          </div>

          {/* Payment Details Table */}
          <div className="mb-5">
            <h3 className="text-sm font-bold uppercase underline mb-3 text-gray-900">
              PAYMENT DETAILS
            </h3>
            <div className="border border-[#7ea8d6] rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#1A5FA4] text-white">
                    <th className="py-2.5 px-4 text-left font-bold border-r border-[#7ea8d6] w-7/12">Description</th>
                    <th className="py-2.5 px-4 text-left font-bold">Amount (INR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#bed2ea]">
                  <tr className="bg-[#f1f5fa]">
                    <td className="py-2 px-4 border-r border-[#bed2ea]">Service Fee</td>
                    <td className="py-2 px-4 font-medium">{formatCurrency(invoice.totalFee || invoice.total_fee || invoice.subtotal)}</td>
                  </tr>
                  <tr className="bg-[#f1f5fa]">
                    <td className="py-2 px-4 border-r border-[#bed2ea]">Tax ({invoice.taxPercent || invoice.tax_percent || '0'}%)</td>
                    <td className="py-2 px-4 font-medium">{formatCurrency(invoice.taxAmount || invoice.tax_amount)}</td>
                  </tr>
                  <tr className="bg-[#143b68] text-white font-bold">
                    <td className="py-2.5 px-4 border-r border-[#2b5484]">Total Amount</td>
                    <td className="py-2.5 px-4">{formatCurrency(invoice.totalWithTax || invoice.total_with_tax || invoice.total)}</td>
                  </tr>
                  <tr className="bg-[#f1f5fa]">
                    <td className="py-2 px-4 border-r border-[#bed2ea]">Previously Paid Amount</td>
                    <td className="py-2 px-4 font-medium">{formatCurrency(invoice.previouslyPaidAmount || invoice.previously_paid_amount || 0)}</td>
                  </tr>
                  <tr className="bg-[#f1f5fa]">
                    <td className="py-2 px-4 border-r border-[#bed2ea]">Paid Amount</td>
                    <td className="py-2 px-4 font-medium">{formatCurrency(invoice.paidAmount || invoice.paid_amount || 0)}</td>
                  </tr>
                  <tr className="bg-[#143b68] text-white font-bold">
                    <td className="py-2.5 px-4 border-r border-[#2b5484]">Remaining Amount</td>
                    <td className="py-2.5 px-4">{formatCurrency(invoice.remainingAmount || invoice.remaining_amount || 0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Disclaimer Box */}
          <div className="border border-black p-2.5 text-center text-xs font-semibold my-4 bg-gray-50">
            You acknowledge and agree that this amount is strictly non-refundable under any circumstances.
          </div>

          {/* Bottom Two-Column: Bank & Signature | Company Details */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-6 pt-2">
            {/* Left: Bank Details & Signature */}
            <div className="flex-1">
              <h4 className="text-xs font-bold uppercase underline mb-2 text-gray-900">
                BANK DETAILS:
              </h4>
              <div className="text-xs space-y-0.5 text-gray-800">
                <div><span className="font-bold">Bank Name:</span> HDFC</div>
                <div><span className="font-bold">Branch Address:</span> Palayapalyam</div>
                <div><span className="font-bold">Account Name:</span> Payana Overseas Solutions Pvt Ltd</div>
                <div><span className="font-bold">Account No:</span> 50200066482470</div>
                <div><span className="font-bold">IFSC Code:</span> HDFC0009203</div>
                <div><span className="font-bold">GPay:</span> 7806925669</div>
              </div>

              {/* Signature */}
              <div className="mt-4">
                <div className="text-xs font-bold text-gray-900 mb-1">Authorized Signature</div>
                <div className="h-8 flex items-center">
                  <img
                    src={PAYANA_SIGNATURE_BASE64}
                    alt="Authorized Signature"
                    className="h-7 max-w-[80px] object-contain"
                  />
                </div>
                <div className="text-xs text-gray-800 mt-1 font-medium">Payana Overseas Solutions</div>
              </div>
            </div>

            {/* Right: Company Details Card */}
            <div className="w-full md:w-64 border-2 border-[#E05638] rounded-2xl p-3.5 bg-white shadow-sm">
              <h4 className="text-xs font-bold uppercase text-center text-[#D83B20] tracking-wider border-b border-[#E05638] pb-1.5 mb-2.5">
                COMPANY DETAILS
              </h4>
              <div className="space-y-1.5 text-xs text-gray-800">
                <div className="flex items-center gap-2.5 bg-gray-50 p-1.5 rounded-md">
                  <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-3 h-3 text-blue-600" />
                  </div>
                  <span className="font-medium">90036 19777</span>
                </div>
                <div className="flex items-center gap-2.5 bg-gray-50 p-1.5 rounded-md">
                  <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-3 h-3 text-red-600" />
                  </div>
                  <span className="font-medium truncate text-[11px]">payanaaoverseas@gmail.com</span>
                </div>
                <div className="flex items-center gap-2.5 bg-gray-50 p-1.5 rounded-md">
                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Globe className="w-3 h-3 text-green-600" />
                  </div>
                  <span className="font-medium">www.payana.com</span>
                </div>
                <div className="flex items-center gap-2.5 bg-gray-50 p-1.5 rounded-md">
                  <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-3 h-3 text-amber-600" />
                  </div>
                  <span className="font-medium">Perundurai Road, Erode</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="border-t border-gray-200 pt-6 mt-8 flex flex-wrap gap-3">
            <button
              onClick={handleDownloadPDF}
              disabled={isGenerating}
              className="flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>

            <button
              onClick={handlePreviewPDF}
              disabled={isGenerating}
              className="flex items-center justify-center space-x-2 bg-gray-800 hover:bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <Eye className="w-4 h-4" />
              <span>Preview PDF</span>
            </button>

            <button
              onClick={() => onNavigate('payanaInvoice')}
              className="flex items-center justify-center space-x-2 border border-gray-300 hover:bg-gray-50 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ml-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to History</span>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default InvoicePreview;