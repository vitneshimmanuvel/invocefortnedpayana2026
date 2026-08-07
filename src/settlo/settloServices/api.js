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

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || 'An error occurred';
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    }
    return Promise.reject(error);
  }
);

export const invoiceAPI = {
  // Get next auto-increment invoice number
  getNextInvoiceNumber: async (type = 'SA') => {
    const response = await api.get('/invoices/next-number', {
      params: { company: 'settlo', type }
    });
    return response.data.nextInvoiceNumber;
  },

  // Get invoices with optional filters
  getInvoices: (params = {}) => 
    api.get('/invoices', { params: { company_id: 'settlo', ...params } }),

  // Get single invoice
  getInvoice: (invoiceNumber) => 
    api.get(`/invoices/${invoiceNumber}`),

  // Create or save invoice
  createInvoice: (data) => 
    api.post('/invoices', { ...data, company_id: 'settlo' }),

  // Update invoice
  updateInvoice: (invoiceNumber, data) => 
    api.put(`/invoices/${invoiceNumber}`, data),

  // Mark invoice as paid
  markInvoiceAsPaid: (invoiceNumber) => 
    api.patch(`/invoices/${invoiceNumber}/mark-paid`),

  // Delete invoice
  deleteInvoice: (invoiceNumber) => 
    api.delete(`/invoices/${invoiceNumber}`),

  // Get analytics
  getAnalytics: () => 
    api.get('/invoices/analytics/dashboard', { params: { company_id: 'settlo' } }),

  // Upload PDF blob/base64 to Cloudinary
  uploadPDFToCloudinary: (base64Data, invoiceNumber) =>
    api.post('/invoices/upload-pdf', {
      base64Data,
      invoiceNumber,
      companyId: 'settlo'
    }),
};

export default api;
