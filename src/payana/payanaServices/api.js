import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const testAWSConnection = async () => {
  try {
    const res = await api.get('/health');
    return { success: res.data.success, message: res.data.message };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const payanaInvoiceAPI = {
  testConnection: testAWSConnection,

  getNextInvoiceNumber: async () => {
    try {
      const response = await api.get('/invoices/next-number', {
        params: { company: 'payana', type: 'STUDY' }
      });
      return response.data.nextInvoiceNumber;
    } catch (error) {
      console.error('Error fetching next invoice number:', error);
      return `PO-2026${String(Math.floor(Math.random() * 900) + 100)}`;
    }
  },

  getInvoice: async (invoiceNumber) => {
    try {
      const response = await api.get(`/invoices/${invoiceNumber}`);
      return { success: true, data: response.data.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || error.message };
    }
  },

  getInvoices: async (params = {}) => {
    try {
      const response = await api.get('/invoices', {
        params: { company_id: 'payana', ...params }
      });
      return {
        success: true,
        data: response.data.data || [],
        pagination: { total: response.data.count, pages: 1, currentPage: 1, limit: response.data.count },
      };
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  },

  getAllInvoices: async (options = {}) => {
    return payanaInvoiceAPI.getInvoices(options);
  },

  createInvoice: async (invoiceData) => {
    try {
      const response = await api.post('/invoices', {
        ...invoiceData,
        company_id: 'payana',
        invoice_number: invoiceData.invoiceNumber || invoiceData.invoice_number,
        client_name: invoiceData.name || invoiceData.client_name,
        client_phone: invoiceData.contact || invoiceData.client_phone,
        client_email: invoiceData.email || invoiceData.client_email,
        client_dob: invoiceData.dob || invoiceData.client_dob,
        client_id_type: invoiceData.idType || invoiceData.client_id_type,
        client_id_number: invoiceData.idNumber || invoiceData.client_id_number,
        service_offered: invoiceData.serviceOffered === 'Others' ? invoiceData.customService : (invoiceData.serviceOffered || invoiceData.service),
        country: invoiceData.country,
        total_fee: invoiceData.totalFee,
        tax_percent: invoiceData.taxPercent,
        tax_amount: invoiceData.taxAmount,
        total_with_tax: invoiceData.totalWithTax,
        paid_amount: invoiceData.paidAmount,
        remaining_amount: invoiceData.remainingAmount,
        status: parseFloat(invoiceData.remainingAmount) === 0 ? 'Paid' : (invoiceData.status || 'Pending'),
      });
      return { success: true, data: response.data.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || error.message };
    }
  },

  updateInvoice: async (invoiceNumber, updateData) => {
    try {
      const response = await api.put(`/invoices/${invoiceNumber}`, updateData);
      return { success: true, data: response.data.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  markInvoiceAsPaid: async (invoiceNumber) => {
    try {
      const response = await api.patch(`/invoices/${invoiceNumber}/mark-paid`);
      return { success: true, data: response.data.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  deleteInvoice: async (invoiceNumber) => {
    try {
      const response = await api.delete(`/invoices/${invoiceNumber}`);
      return { success: true, data: response.data.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  getAnalytics: async () => {
    try {
      const response = await api.get('/invoices/analytics/dashboard', {
        params: { company_id: 'payana' }
      });
      return { success: true, data: response.data.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  searchInvoices: async (searchTerm) => {
    return payanaInvoiceAPI.getInvoices({ search: searchTerm });
  },

  getInvoicesByStatus: async (status) => {
    return payanaInvoiceAPI.getInvoices({ status });
  },

  uploadPDFToCloudinary: async (base64Data, invoiceNumber) => {
    try {
      const response = await api.post('/invoices/upload-pdf', {
        base64Data,
        invoiceNumber,
        companyId: 'payana'
      });
      return { success: true, pdfUrl: response.data.pdfUrl };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

export const {
  getInvoice,
  getInvoices,
  getAllInvoices,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  getAnalytics,
  searchInvoices,
  getInvoicesByStatus
} = payanaInvoiceAPI;

export default api;
