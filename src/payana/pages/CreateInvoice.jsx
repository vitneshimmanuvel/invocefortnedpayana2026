import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ChevronDown,
  Save,
  X,
  Download,
  Eye
} from 'lucide-react';

import toast from 'react-hot-toast';
import { payanaInvoiceAPI } from '../payanaServices/api';
import { downloadPayanaInvoicePDF, previewPayanaInvoicePDF, generatePayanaInvoicePDF } from '../payanaServices/pdfGenerator';

const CreateInvoice = ({ onNavigate, userProfile, selectedCompany }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    date: new Date().toISOString().split('T')[0],
    name: '',
    dob: '',
    contact: '',
    idType: 'Passport',
    idNumber: '',
    serviceOffered: 'PR',
    customService: '',
    country: '',
    totalFee: '',
    taxPercent: '0',
    taxAmount: '0.00',
    totalWithTax: '0.00',
    paidAmount: '',
    remainingAmount: '',
  });

  const [errors, setErrors] = useState({});
  const [showServicePicker, setShowServicePicker] = useState(false);
  const [showIdTypePicker, setShowIdTypePicker] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const serviceOptions = ['PR', 'STUDY', 'PASSPORT', 'AUSBILDUNG', 'VISA', 'NURSING', 'MBBS', 'DENTAL', 'FLT', 'Others'];
  const idTypeOptions = ['Passport', 'Aadhar'];

  // Detect dark mode preference
  useEffect(() => {
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(darkModeQuery.matches);
    
    const handleChange = (e) => setIsDarkMode(e.matches);
    darkModeQuery.addEventListener('change', handleChange);
    
    return () => darkModeQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    generateInvoiceNumber();
  }, []);

  useEffect(() => {
    // Calculate tax amount, total with tax, and remaining amount
    const baseFee = parseFloat(formData.totalFee) || 0;
    const taxPercent = parseFloat(formData.taxPercent) || 0;
    const taxAmount = (baseFee * taxPercent) / 100;
    const totalWithTax = baseFee + taxAmount;
    const paid = parseFloat(formData.paidAmount) || 0;
    const remaining = totalWithTax - paid;

    setFormData(prev => ({
      ...prev,
      taxAmount: taxAmount.toFixed(2),
      totalWithTax: totalWithTax.toFixed(2),
      remainingAmount: remaining > 0 ? remaining.toFixed(2) : '0.00'
    }));
  }, [formData.totalFee, formData.taxPercent, formData.paidAmount]);

  const generateInvoiceNumber = async () => {
    try {
      console.log('🔍 Getting latest invoice number via API...');
      const nextNum = await payanaInvoiceAPI.getNextInvoiceNumber();
      console.log(`📋 Generated new invoice number: ${nextNum}`);
      setFormData(prev => ({ ...prev, invoiceNumber: nextNum }));
    } catch (error) {
      console.error('❌ Error generating invoice number:', error);
      const timestamp = Date.now().toString().slice(-6);
      setFormData(prev => ({ ...prev, invoiceNumber: `PO-2026${timestamp}` }));
    }
  };

  const uploadPDFToS3 = async (pdfData, fileName) => {
    try {
      console.log('📤 Uploading PDF to Cloudinary via backend...');
      if (!pdfData) throw new Error('PDF data is null or undefined');

      const reader = new FileReader();
      const base64Promise = new Promise((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(pdfData);
      });
      const base64Data = await base64Promise;
      const res = await payanaInvoiceAPI.uploadPDFToCloudinary(base64Data, formData.invoiceNumber);

      if (res.success && res.pdfUrl) {
        return { success: true, url: res.pdfUrl, key: formData.invoiceNumber };
      } else {
        throw new Error(res.error || 'Failed to upload PDF');
      }
    } catch (error) {
      console.error('❌ Cloudinary Upload error:', error);
      return { success: false, error: error.message };
    }
  };

  const updateInvoicePdfLink = async (invoiceNumber, pdfUrl) => {
    try {
      await payanaInvoiceAPI.updateInvoice(invoiceNumber, { pdf_url: pdfUrl });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const generateAndUploadPDF = async (invoiceData) => {
    try {
      console.log('📄 Starting PDF generation and Cloudinary upload...');
      const pdf = await generatePayanaInvoicePDF(invoiceData);
      if (!pdf) throw new Error('Failed to generate PDF');

      const pdfBlob = pdf.output('blob');
      const cleanFileName = `${invoiceData.invoiceNumber}.pdf`;

      const uploadResult = await uploadPDFToS3(pdfBlob, cleanFileName);
      if (!uploadResult.success) {
        throw new Error(`Failed to upload PDF: ${uploadResult.error}`);
      }

      await updateInvoicePdfLink(invoiceData.invoiceNumber, uploadResult.url);

      return {
        success: true,
        pdfUrl: uploadResult.url,
        s3Key: uploadResult.key
      };
    } catch (error) {
      console.error('❌ Error in PDF process:', error);
      return { success: false, error: error.message };
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.dob.trim()) newErrors.dob = 'Date of Birth is required';
    if (!formData.contact.trim()) newErrors.contact = 'Contact is required';
    if (!formData.idNumber.trim()) newErrors.idNumber = 'ID Number is required';
    if (!formData.country.trim()) newErrors.country = 'Country is required';
    if (!formData.totalFee.trim()) newErrors.totalFee = 'Total Fee is required';
    if (!formData.paidAmount.trim()) newErrors.paidAmount = 'Paid Amount is required';

    if (formData.serviceOffered === 'Others' && !formData.customService.trim()) {
      newErrors.customService = 'Please specify the service';
    }

    if (formData.totalFee && formData.paidAmount) {
      const totalWithTax = parseFloat(formData.totalWithTax);
      const paid = parseFloat(formData.paidAmount);
      if (paid > totalWithTax) {
        newErrors.paidAmount = 'Paid amount cannot exceed total amount including tax';
      }
    }

    if (formData.taxPercent && (parseFloat(formData.taxPercent) < 0 || parseFloat(formData.taxPercent) > 100)) {
      newErrors.taxPercent = 'Tax percentage must be between 0 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields correctly.');
      return;
    }

    setIsCreating(true);
    try {
      console.log('💾 Saving invoice via API...');
      const res = await payanaInvoiceAPI.createInvoice(formData);

      if (!res.success) {
        throw new Error(res.error || 'Failed to save invoice');
      }

      toast.success('Invoice saved successfully!');

      try {
        const pdfResult = await generateAndUploadPDF(formData);
        if (pdfResult.success) {
          console.log('✅ PDF generated and stored:', pdfResult.pdfUrl);
        }
      } catch (pdfErr) {
        console.warn('PDF storage info:', pdfErr);
      }

      setTimeout(() => {
        onNavigate('payanaInvoice');
      }, 1000);

    } catch (error) {
      console.error('❌ Error saving invoice:', error);
      toast.error(`Failed to save invoice: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  // PDF Download function
  const handleDownloadPDF = async () => {
    try {
      setIsGeneratingPDF(true);
      toast.loading('Generating PDF...', { id: 'pdf-download' });
      
      const success = await downloadPayanaInvoicePDF(formData);
      
      if (success) {
        toast.success('PDF downloaded successfully!', { id: 'pdf-download' });
      } else {
        toast.error('Failed to generate PDF', { id: 'pdf-download' });
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to generate PDF', { id: 'pdf-download' });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // PDF Preview function
  const handlePreviewPDF = async () => {
    try {
      setIsGeneratingPDF(true);
      toast.loading('Generating PDF preview...', { id: 'pdf-preview' });
      
      const success = await previewPayanaInvoicePDF(formData);
      
      if (success) {
        toast.success('PDF preview opened!', { id: 'pdf-preview' });
      } else {
        toast.error('Failed to generate PDF preview', { id: 'pdf-preview' });
      }
    } catch (error) {
      console.error('Error previewing PDF:', error);
      toast.error('Failed to generate PDF preview', { id: 'pdf-preview' });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const renderPicker = (options, currentValue, onSelect, isVisible, setVisible) => {
    if (!isVisible) return null;

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 z-50 flex items-center justify-center ${
            isDarkMode ? 'bg-black bg-opacity-70' : 'bg-black bg-opacity-50'
          }`}
          onClick={() => setVisible(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={`w-45 max-w-md max-h-96 mx-4 rounded-2xl shadow-2xl overflow-hidden ${
              isDarkMode ? 'bg-slate-800' : 'bg-white'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex items-center justify-between p-5 border-b ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <h3 className={`text-lg font-bold ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>
                Select Option
              </h3>
              <button
                onClick={() => setVisible(false)}
                className={`p-1 rounded-full hover:bg-opacity-20 ${
                  isDarkMode ? 'text-blue-400 hover:bg-blue-400' : 'text-cyan-500 hover:bg-cyan-500'
                }`}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto">
              {options.map((option, index) => (
                <button
                  key={option}
                  onClick={() => {
                    onSelect(option);
                    setVisible(false);
                  }}
                  className={`w-full px-5 py-4 text-left transition-all duration-150 ${
                    currentValue === option
                      ? isDarkMode
                        ? 'bg-blue-500 bg-opacity-20 text-blue-400'
                        : 'bg-cyan-50 text-cyan-600'
                      : isDarkMode
                      ? 'text-slate-200 hover:bg-slate-700'
                      : 'text-gray-900 hover:bg-gray-50'
                  } ${
                    index !== options.length - 1
                      ? isDarkMode
                        ? 'border-b border-slate-700'
                        : 'border-b border-gray-100'
                      : ''
                  }`}
                >
                  <span className="text-base font-medium">{option}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  };

  const getInputStyles = (hasError = false) => {
    const baseStyles = 'w-full px-4 py-3 text-base font-medium rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
    
    if (isDarkMode) {
      return `${baseStyles} bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900 ${
        hasError ? 'border-red-500' : ''
      }`;
    } else {
      return `${baseStyles} bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500 hover:border-blue-400 focus:border-blue-500 focus:ring-blue-500 focus:ring-offset-white ${
        hasError ? 'border-red-500' : ''
      }`;
    }
  };

  const getReadonlyInputStyles = () => {
    if (isDarkMode) {
      return 'w-full px-4 py-3 text-base font-medium rounded-xl border bg-slate-700 border-slate-600 text-slate-400 cursor-not-allowed';
    } else {
      return 'w-full px-4 py-3 text-base font-medium rounded-xl border bg-gray-50 border-gray-300 text-gray-600 cursor-not-allowed';
    }
  };

  const getPickerButtonStyles = () => {
    const baseStyles = 'w-full flex items-center justify-between px-4 py-3 text-base font-medium rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
    
    if (isDarkMode) {
      return `${baseStyles} bg-slate-700 border-slate-600 text-slate-100 hover:border-blue-500 focus:border-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900`;
    } else {
      return `${baseStyles} bg-gray-50 border-gray-300 text-gray-900 hover:border-blue-400 focus:border-blue-500 focus:ring-blue-500 focus:ring-offset-white`;
    }
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={isDarkMode ? 'bg-gradient-to-r from-slate-800 to-slate-700' : 'bg-gradient-to-r from-blue-500 to-cyan-500'}
      >
        <div className="px-5 py-6">
          <div className="flex items-center">
            <button
              onClick={() => onNavigate('payanaInvoiceHistory')}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors mr-4"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex items-center space-x-4 flex-1 justify-center mr-14">
              <div className="flex items-center justify-center h-10 px-2 rounded-lg bg-white p-1 shadow-sm">
                <img
                  src="https://settlo-invoices.s3.ap-south-1.amazonaws.com/assets/payana-logo.png"
                  alt="Payana Logo"
                  className="h-full w-auto object-contain"
                />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">Create Invoice</h1>
                <p className="text-white text-opacity-80 text-sm mt-1">Payana Overseas Solutions</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content - Form Fields */}
      <div className="px-5 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl p-6 shadow-xl ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}
        >
          <div className="space-y-6">
            {/* Invoice Number & Date Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-base font-semibold mb-2 ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>
                  Invoice Number
                </label>
                <input
                  type="text"
                  value={formData.invoiceNumber}
                  readOnly
                  className={getReadonlyInputStyles()}
                />
              </div>
              <div>
                <label className={`block text-base font-semibold mb-2 ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => updateFormData('date', e.target.value)}
                  className={getInputStyles(errors.date)}
                />
                {errors.date && <p className="mt-1 text-sm text-red-500">{errors.date}</p>}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className={`block text-base font-semibold mb-2 ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>
                Full Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateFormData('name', e.target.value)}
                placeholder="Enter full name"
                className={getInputStyles(errors.name)}
              />
              {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
            </div>

            {/* DOB & Contact Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-base font-semibold mb-2 ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>
                  Date of Birth
                </label>
                <input
                  type="text"
                  value={formData.dob}
                  onChange={(e) => updateFormData('dob', e.target.value)}
                  placeholder="DD-MM-YYYY"
                  className={getInputStyles(errors.dob)}
                />
                {errors.dob && <p className="mt-1 text-sm text-red-500">{errors.dob}</p>}
              </div>
              <div>
                <label className={`block text-base font-semibold mb-2 ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>
                  Contact
                </label>
                <input
                  type="text"
                  value={formData.contact}
                  onChange={(e) => updateFormData('contact', e.target.value)}
                  placeholder="Phone/Email"
                  className={getInputStyles(errors.contact)}
                />
                {errors.contact && <p className="mt-1 text-sm text-red-500">{errors.contact}</p>}
              </div>
            </div>

            {/* ID Type & ID Number Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-base font-semibold mb-2 ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>
                  ID Type
                </label>
                <button
                  type="button"
                  onClick={() => setShowIdTypePicker(true)}
                  className={getPickerButtonStyles()}
                >
                  <span>{formData.idType}</span>
                  <ChevronDown className={`w-4 h-4 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`} />
                </button>
              </div>
              <div>
                <label className={`block text-base font-semibold mb-2 ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>
                  ID Number
                </label>
                <input
                  type="text"
                  value={formData.idNumber}
                  onChange={(e) => updateFormData('idNumber', e.target.value)}
                  placeholder="Enter ID number"
                  className={getInputStyles(errors.idNumber)}
                />
                {errors.idNumber && <p className="mt-1 text-sm text-red-500">{errors.idNumber}</p>}
              </div>
            </div>

            {/* Service & Country Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-base font-semibold mb-2 ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>
                  Service Offered
                </label>
                <button
                  type="button"
                  onClick={() => setShowServicePicker(true)}
                  className={getPickerButtonStyles()}
                >
                  <span>{formData.serviceOffered}</span>
                  <ChevronDown className={`w-4 h-4 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`} />
                </button>
                
                {/* Custom Service Input */}
                {formData.serviceOffered === 'Others' && (
                  <div className="mt-3">
                    <input
                      type="text"
                      value={formData.customService}
                      onChange={(e) => updateFormData('customService', e.target.value)}
                      placeholder="Specify service"
                      className={getInputStyles(errors.customService)}
                    />
                    {errors.customService && <p className="mt-1 text-sm text-red-500">{errors.customService}</p>}
                  </div>
                )}
              </div>
              <div>
                <label className={`block text-base font-semibold mb-2 ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>
                  Country
                </label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => updateFormData('country', e.target.value)}
                  placeholder="Destination country"
                  className={getInputStyles(errors.country)}
                />
                {errors.country && <p className="mt-1 text-sm text-red-500">{errors.country}</p>}
              </div>
            </div>

            {/* Fee & Tax Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-base font-semibold mb-2 ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>
                  Total Fee (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.totalFee}
                  onChange={(e) => updateFormData('totalFee', e.target.value)}
                  placeholder="0.00"
                  className={getInputStyles(errors.totalFee)}
                />
                {errors.totalFee && <p className="mt-1 text-sm text-red-500">{errors.totalFee}</p>}
              </div>
              <div>
                <label className={`block text-base font-semibold mb-2 ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>
                  Tax (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.taxPercent}
                  onChange={(e) => updateFormData('taxPercent', e.target.value)}
                  placeholder="0"
                  className={getInputStyles(errors.taxPercent)}
                />
                {errors.taxPercent && <p className="mt-1 text-sm text-red-500">{errors.taxPercent}</p>}
              </div>
            </div>

            {/* Calculated Fields Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-base font-semibold mb-2 ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>
                  Tax Amount (₹)
                </label>
                <input
                  type="text"
                  value={formData.taxAmount}
                  readOnly
                  className={getReadonlyInputStyles()}
                />
              </div>
              <div>
                <label className={`block text-base font-semibold mb-2 ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>
                  Total with Tax (₹)
                </label>
                <input
                  type="text"
                  value={formData.totalWithTax}
                  readOnly
                  className={getReadonlyInputStyles()}
                />
              </div>
            </div>

            {/* Payment Fields Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-base font-semibold mb-2 ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>
                  Paid Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.paidAmount}
                  onChange={(e) => updateFormData('paidAmount', e.target.value)}
                  placeholder="0.00"
                  className={getInputStyles(errors.paidAmount)}
                />
                {errors.paidAmount && <p className="mt-1 text-sm text-red-500">{errors.paidAmount}</p>}
              </div>
              <div>
                <label className={`block text-base font-semibold mb-2 ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>
                  Remaining Amount (₹)
                </label>
                <input
                  type="text"
                  value={formData.remainingAmount}
                  readOnly
                  className={getReadonlyInputStyles()}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Create Invoice Button */}
              <motion.button
                whileHover={{ scale: isCreating ? 1 : 1.02 }}
                whileTap={{ scale: isCreating ? 1 : 0.98 }}
                type="button"
                onClick={handleSave}
                disabled={isCreating}
                className={`flex-1 py-4 px-6 rounded-xl text-white text-lg font-bold transition-all duration-200 ${
                  isCreating
                    ? isDarkMode
                      ? 'bg-slate-600 cursor-not-allowed'
                      : 'bg-gray-400 cursor-not-allowed'
                    : isDarkMode
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 active:from-blue-700 active:to-blue-800'
                    : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 active:from-blue-700 active:to-cyan-700'
                } ${isCreating ? 'opacity-70' : 'shadow-lg hover:shadow-xl'}`}
              >
                {isCreating ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                    Creating & Uploading...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <Save className="w-5 h-5 mr-2" />
                    Create Invoice & Upload PDF
                  </div>
                )}
              </motion.button>

              {/* Preview PDF Button */}
              <motion.button
                whileHover={{ scale: isGeneratingPDF ? 1 : 1.02 }}
                whileTap={{ scale: isGeneratingPDF ? 1 : 0.98 }}
                type="button"
                onClick={handlePreviewPDF}
                disabled={isGeneratingPDF}
                className={`flex-1 sm:flex-none sm:px-8 py-4 rounded-xl text-lg font-bold transition-all duration-200 border-2 ${
                  isGeneratingPDF
                    ? isDarkMode
                      ? 'border-slate-600 text-slate-600 cursor-not-allowed'
                      : 'border-gray-400 text-gray-400 cursor-not-allowed'
                    : isDarkMode
                    ? 'border-green-500 text-green-500 hover:bg-green-500 hover:text-white'
                    : 'border-green-600 text-green-600 hover:bg-green-600 hover:text-white'
                } ${isGeneratingPDF ? 'opacity-70' : 'shadow-lg hover:shadow-xl'}`}
              >
                {isGeneratingPDF ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-2"></div>
                    Generating...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <Eye className="w-5 h-5 mr-2" />
                    Preview PDF
                  </div>
                )}
              </motion.button>

              {/* Download PDF Button */}
              <motion.button
                whileHover={{ scale: isGeneratingPDF ? 1 : 1.02 }}
                whileTap={{ scale: isGeneratingPDF ? 1 : 0.98 }}
                type="button"
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
                className={`flex-1 sm:flex-none sm:px-8 py-4 rounded-xl text-lg font-bold transition-all duration-200 border-2 ${
                  isGeneratingPDF
                    ? isDarkMode
                      ? 'border-slate-600 text-slate-600 cursor-not-allowed'
                      : 'border-gray-400 text-gray-400 cursor-not-allowed'
                    : isDarkMode
                    ? 'border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white'
                    : 'border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white'
                } ${isGeneratingPDF ? 'opacity-70' : 'shadow-lg hover:shadow-xl'}`}
              >
                {isGeneratingPDF ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-2"></div>
                    Generating...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <Download className="w-5 h-5 mr-2" />
                    Download PDF
                  </div>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Pickers */}
      {renderPicker(
        serviceOptions,
        formData.serviceOffered,
        (value) => updateFormData('serviceOffered', value),
        showServicePicker,
        setShowServicePicker
      )}
      
      {renderPicker(
        idTypeOptions,
        formData.idType,
        (value) => updateFormData('idType', value),
        showIdTypePicker,
        setShowIdTypePicker
      )}
    </div>
  );
};

export default CreateInvoice;
