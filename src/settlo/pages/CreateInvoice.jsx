import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Save, 
  FileText, 
  User, 
  Calendar,
  DollarSign,
  Settings,
  Trash2
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { pdfGenerator } from '../settloServices/pdfGeneratorService';
import { invoiceAPI } from '../settloServices/api';

const CreateInvoice = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState('');
  const [loadingInvoiceNumber, setLoadingInvoiceNumber] = useState(true);
  const [formData, setFormData] = useState({
    invoiceType: 'SA',
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    clientAddress: '',
    paymentType: 'Full Payment',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    items: [
      { description: '', quantity: 1, rate: 0, pendingPayment: 0 }
    ],
    taxPercentage: 0,
    notes: ''
  });

  const invoiceTypes = [
    { label: 'Settlo Academy (SA)', value: 'SA' },
    { label: 'Settlo HR (SHR)', value: 'SHR' },
    { label: 'Settlo Tech Solutions (STS)', value: 'STS' },
    { label: 'Settlo Distance Education (SDE)', value: 'SDE' },
  ];

  const paymentTypes = [
    { label: 'Full Payment', value: 'Full Payment' },
    { label: 'Initial Payment', value: 'Initial Payment' },
  ];

  // Get next auto-generated invoice number from API
  const getNextInvoiceNumber = async () => {
    try {
      setLoadingInvoiceNumber(true);
      console.log(`🔍 Getting next invoice number for type: ${formData.invoiceType}`);
      const formattedNumber = await invoiceAPI.getNextInvoiceNumber(formData.invoiceType);
      setNextInvoiceNumber(formattedNumber);
      console.log(`✅ Generated invoice number: ${formattedNumber}`);
    } catch (error) {
      console.error('❌ Error getting invoice number:', error);
      const fallbackNumber = `${formData.invoiceType}-${String(Date.now()).slice(-3)}`;
      setNextInvoiceNumber(fallbackNumber);
    } finally {
      setLoadingInvoiceNumber(false);
    }
  };

  // Initialize invoice number
  useEffect(() => {
    getNextInvoiceNumber();
  }, []);

  // Update invoice number when type changes
  useEffect(() => {
    if (formData.invoiceType) {
      getNextInvoiceNumber();
    }
  }, [formData.invoiceType]);

  // Set default due date for Initial Payment
  useEffect(() => {
    if (formData.paymentType === 'Initial Payment' && !formData.dueDate) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      setFormData(prev => ({
        ...prev,
        dueDate: dueDate.toISOString().split('T')[0]
      }));
    }
  }, [formData.paymentType]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: field === 'quantity' || field === 'rate' || field === 'pendingPayment' 
        ? parseFloat(value) || 0 
        : value
    };
    
    setFormData(prev => ({
      ...prev,
      items: updatedItems
    }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { description: '', quantity: 1, rate: 0, pendingPayment: 0 }
      ]
    }));
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      const updatedItems = formData.items.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        items: updatedItems
      }));
    }
  };

  const calculateSubtotal = () => {
    if (formData.paymentType === 'Initial Payment') {
      return formData.items.reduce((sum, item) => 
        sum + (item.rate - (item.pendingPayment || 0)), 0
      );
    }
    return formData.items.reduce((sum, item) => 
      sum + (item.quantity * item.rate), 0
    );
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const taxAmount = subtotal * (formData.taxPercentage / 100);
    return subtotal + taxAmount;
  };

  // Save invoice to Neon Database via API
  const saveInvoiceToDynamoDB = async (invoiceData, pdfUrl) => {
    try {
      console.log(`💾 Saving invoice via API: ${invoiceData.invoiceNumber}`);
      
      const totalAmount = calculateTotal();
      const subtotalAmount = calculateSubtotal();
      
      let collectedAmount, pendingAmount;
      if (formData.paymentType === 'Full Payment') {
        collectedAmount = totalAmount;
        pendingAmount = 0;
      } else {
        collectedAmount = subtotalAmount;
        pendingAmount = formData.items.reduce((sum, item) => sum + (item.pendingPayment || 0), 0);
      }

      const payload = {
        invoice_number: invoiceData.invoiceNumber,
        company_id: 'settlo',
        invoice_type: formData.invoiceType,
        client_name: formData.clientName,
        client_phone: formData.clientPhone,
        client_email: formData.clientEmail || '',
        client_address: formData.clientAddress || '',
        payment_type: formData.paymentType,
        total_fee: totalAmount,
        tax_percent: formData.taxPercentage,
        tax_amount: totalAmount - subtotalAmount,
        total_with_tax: totalAmount,
        paid_amount: collectedAmount,
        remaining_amount: pendingAmount,
        status: formData.paymentType === 'Full Payment' ? 'Paid' : 'Pending',
        invoice_date: formData.invoiceDate,
        due_date: formData.dueDate || null,
        pdf_url: pdfUrl,
        items: formData.items,
        notes: formData.notes || ''
      };

      await invoiceAPI.createInvoice(payload);

      console.log(`✅ Saved to Neon Database successfully`);
      return { success: true, invoiceNumber: invoiceData.invoiceNumber };
    } catch (error) {
      console.error('❌ Save Invoice Error:', error);
      throw new Error(`Failed to save invoice: ${error.message}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Form validation
    if (!formData.clientName.trim()) {
      toast.error('Client name is required');
      return;
    }
    
    if (!formData.clientPhone.trim()) {
      toast.error('Client phone is required');
      return;
    }
    
    if (!formData.items[0].description.trim()) {
      toast.error('Service description is required');
      return;
    }

    if (!nextInvoiceNumber) {
      toast.error('Invoice number not ready. Please wait...');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Creating invoice...');
    
    try {
      console.log(`🚀 Creating invoice: ${nextInvoiceNumber}`);
      
      const invoiceData = {
        invoiceNumber: nextInvoiceNumber,
        invoiceType: formData.invoiceType,
        clientName: formData.clientName,
        clientPhone: formData.clientPhone,
        clientEmail: formData.clientEmail,
        clientAddress: formData.clientAddress,
        paymentType: formData.paymentType,
        date: formData.invoiceDate,
        dueDate: formData.dueDate,
        items: formData.items,
        total: calculateTotal(),
        subtotal: calculateSubtotal(),
        tax: formData.taxPercentage,
        notes: formData.notes
      };

      // Generate PDF and upload to S3
      toast.loading('Generating PDF...', { id: loadingToast });
      const pdfResult = await pdfGenerator.generateAndUploadPDF(invoiceData);

      if (!pdfResult.success) {
        throw new Error('PDF generation failed');
      }

      // Save to DynamoDB
      toast.loading('Saving to database...', { id: loadingToast });
      const dbResult = await saveInvoiceToDynamoDB(invoiceData, pdfResult.s3Url);

      if (dbResult.success) {
        toast.success('Invoice created successfully!', { id: loadingToast });
        console.log(`🎉 Invoice ${invoiceData.invoiceNumber} created!`);
        navigate('/settlo/history');
      }
    } catch (error) {
      console.error('❌ Error creating invoice:', error);
      toast.error(`Failed: ${error.message}`, { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      invoiceType: 'SA',
      clientName: '',
      clientPhone: '',
      clientEmail: '',
      clientAddress: '',
      paymentType: 'Full Payment',
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      items: [
        { description: '', quantity: 1, rate: 0, pendingPayment: 0 }
      ],
      taxPercentage: 0,
      notes: ''
    });
    toast.success('Form reset');
    getNextInvoiceNumber();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Create Invoice</h1>
              <p className="text-gray-600 mt-1">Generate professional invoices quickly</p>
              
              {/* Auto-Generated Invoice Number */}
              <div className="mt-3 flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Next Invoice Number:</span>
                {loadingInvoiceNumber ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm text-gray-500">Generating invoice number...</span>
                  </div>
                ) : (
                  <span className="inline-flex items-center px-4 py-2 text-lg font-bold text-blue-700 bg-gradient-to-r from-blue-100 to-blue-200 rounded-lg border-2 border-blue-300 shadow-sm">
                    {nextInvoiceNumber}
                  </span>
                )}
              </div>
            </div>
            
            <button
              type="button"
              onClick={resetForm}
              disabled={loading || loadingInvoiceNumber}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <Settings className="w-4 h-4 mr-2" />
              Reset
            </button>
          </div>
        </motion.div>

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Invoice Details Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white shadow rounded-lg p-6"
          >
            <div className="flex items-center space-x-2 mb-6">
              <FileText className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Invoice Details</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invoice Type *
                </label>
                <select
                  value={formData.invoiceType}
                  onChange={(e) => handleInputChange('invoiceType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={loadingInvoiceNumber}
                >
                  {invoiceTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {loadingInvoiceNumber && (
                  <p className="text-xs text-gray-500 mt-1">Generating invoice number from AWS...</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Type *
                </label>
                <select
                  value={formData.paymentType}
                  onChange={(e) => handleInputChange('paymentType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {paymentTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invoice Date *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="date"
                    value={formData.invoiceDate}
                    onChange={(e) => handleInputChange('invoiceDate', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>
              
              {formData.paymentType === 'Initial Payment' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => handleInputChange('dueDate', e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Status Preview */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Status Preview:</span>
                <span className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full ${
                  formData.paymentType === 'Full Payment' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {formData.paymentType === 'Full Payment' ? '✓ Paid' : '⏳ Pending'}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Client Information Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white shadow rounded-lg p-6"
          >
            <div className="flex items-center space-x-2 mb-6">
              <User className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Client Information</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Name *
                </label>
                <input
                  type="text"
                  value={formData.clientName}
                  onChange={(e) => handleInputChange('clientName', e.target.value)}
                  placeholder="Enter client name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={formData.clientPhone}
                  onChange={(e) => handleInputChange('clientPhone', e.target.value)}
                  placeholder="Enter phone number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.clientEmail}
                  onChange={(e) => handleInputChange('clientEmail', e.target.value)}
                  placeholder="Enter email address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <textarea
                  value={formData.clientAddress}
                  onChange={(e) => handleInputChange('clientAddress', e.target.value)}
                  placeholder="Enter client address"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </motion.div>

          {/* Services Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white shadow rounded-lg p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Services</h3>
              </div>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Service
              </button>
            </div>
            
            <div className="space-y-4">
              {formData.items.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 * index }}
                  className="p-4 border border-gray-200 rounded-lg bg-gray-50"
                >
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="font-medium text-gray-900">Service {index + 1}</h4>
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description *
                      </label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        placeholder="Enter service description"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {formData.paymentType === 'Full Payment' ? (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Quantity
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Rate (₹)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.rate}
                            onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Amount
                          </label>
                          <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-600 font-semibold">
                            ₹{(item.quantity * item.rate).toFixed(2)}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Total (₹)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.rate}
                            onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Pending (₹)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.pendingPayment}
                            onChange={(e) => handleItemChange(index, 'pendingPayment', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Paid Amount
                          </label>
                          <div className="w-full px-3 py-2 bg-green-50 border border-gray-300 rounded-md text-green-700 font-semibold">
                            ₹{(item.rate - (item.pendingPayment || 0)).toFixed(2)}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Additional Details Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white shadow rounded-lg p-6"
          >
            <div className="flex items-center space-x-2 mb-6">
              <Settings className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Additional Details</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tax (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.taxPercentage}
                  onChange={(e) => handleInputChange('taxPercentage', parseFloat(e.target.value) || 0)}
                  placeholder="Enter tax percentage"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Add any additional notes"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            {/* Invoice Summary */}
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-3">Invoice Summary</h4>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {formData.paymentType === 'Initial Payment' ? 'Amount Paid:' : 'Subtotal:'}
                  </span>
                  <span className="font-medium">₹{calculateSubtotal().toFixed(2)}</span>
                </div>
                
                {formData.paymentType === 'Initial Payment' && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Pending Amount:</span>
                    <span className="font-medium text-orange-600">
                      ₹{formData.items.reduce((sum, item) => sum + (item.pendingPayment || 0), 0).toFixed(2)}
                    </span>
                  </div>
                )}
                
                {formData.taxPercentage > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax ({formData.taxPercentage}%):</span>
                    <span className="font-medium">₹{(calculateSubtotal() * (formData.taxPercentage / 100)).toFixed(2)}</span>
                  </div>
                )}
                
                <div className="border-t pt-2">
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-gray-900">Total:</span>
                    <span className="text-blue-600">₹{calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Submit Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex justify-end space-x-4 pb-8"
          >
            <button
              type="button"
              onClick={() => navigate('/settlo/dashboard')}
              className="px-6 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              disabled={loading}
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={loading || loadingInvoiceNumber || !nextInvoiceNumber}
              className="px-6 py-3 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed min-w-[150px]"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <Save className="w-4 h-4" />
                  <span>Create Invoice</span>
                </div>
              )}
            </button>
          </motion.div>
        </form>
      </div>
    </div>
  );
};

export default CreateInvoice;
