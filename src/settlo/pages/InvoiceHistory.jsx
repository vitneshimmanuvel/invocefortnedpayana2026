import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Search,
  Filter,
  Download,
  Eye,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  FileText,
  X
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { pdfGenerator, regenerateInvoicePDF, generateFreshInvoicePDF } from '../settloServices/pdfGeneratorService';
import { invoiceAPI } from '../settloServices/api';

const InvoiceHistory = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [markingPaid, setMarkingPaid] = useState({});
  const [allInvoices, setAllInvoices] = useState([]); 
  const [regeneratingPdf, setRegeneratingPdf] = useState({});

  const searchInputRef = useRef(null);
  const [shouldMaintainFocus, setShouldMaintainFocus] = useState(false);
  const itemsPerPage = 10;

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      if (searchQuery !== debouncedSearchQuery) {
        setCurrentPage(1);
        setShouldMaintainFocus(true);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, debouncedSearchQuery]);

  // Maintain focus after re-render
  useEffect(() => {
    if (shouldMaintainFocus && searchInputRef.current) {
      searchInputRef.current.focus();
      setShouldMaintainFocus(false);
    }
  }, [shouldMaintainFocus, invoices]);

  useEffect(() => {
    loadInvoices();
  }, []);

  useEffect(() => {
    filterAndPaginateInvoices();
  }, [currentPage, debouncedSearchQuery, statusFilter, typeFilter, allInvoices]);

  // Fetch all invoices from Neon DB via API
  const fetchAllInvoicesFromDynamoDB = async () => {
    try {
      const response = await invoiceAPI.getInvoices();
      const allItems = response.data.data || [];
      
      const transformedInvoices = allItems.map(item => ({
        _id: item.invoice_number,
        invoiceNumber: item.invoice_number,
        invoiceType: item.invoice_type,
        clientName: item.client_name,
        clientPhone: item.client_phone,
        clientEmail: item.client_email,
        clientAddress: item.client_address,
        paymentType: item.payment_type,
        totalAmount: parseFloat(item.total_with_tax || item.total_fee || 0),
        subtotalAmount: parseFloat(item.total_fee || 0),
        taxPercentage: parseFloat(item.tax_percent || 0),
        status: item.status,
        invoiceDate: item.invoice_date,
        dueDate: item.due_date,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        s3PdfUrl: item.pdf_url,
        items: typeof item.items === 'string' ? JSON.parse(item.items) : (item.items || []),
        notes: item.notes || '',
        collectedAmount: parseFloat(item.paid_amount || 0),
        pendingAmount: parseFloat(item.remaining_amount || 0)
      }));

      return transformedInvoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
      console.error('Error fetching from Neon DB:', error);
      throw error;
    }
  };

  const loadInvoices = async () => {
    try {
      if (!shouldMaintainFocus) setLoading(true);
      
      const fetchedInvoices = await fetchAllInvoicesFromDynamoDB();
      setAllInvoices(fetchedInvoices);
      
    } catch (error) {
      console.error('Error loading invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  // Filter and paginate invoices locally
  const filterAndPaginateInvoices = () => {
    let filteredInvoices = [...allInvoices];

    // Apply search filter
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
      filteredInvoices = filteredInvoices.filter(invoice =>
        invoice.clientName?.toLowerCase().includes(query) ||
        invoice.invoiceNumber?.toLowerCase().includes(query) ||
        invoice.clientPhone?.includes(query) ||
        invoice.clientEmail?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filteredInvoices = filteredInvoices.filter(invoice => 
        invoice.status === statusFilter
      );
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filteredInvoices = filteredInvoices.filter(invoice => 
        invoice.invoiceType === typeFilter
      );
    }

    // Calculate pagination
    const totalItems = filteredInvoices.length;
    const calculatedTotalPages = Math.ceil(totalItems / itemsPerPage);
    setTotalPages(calculatedTotalPages);

    // Get items for current page
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);

    setInvoices(paginatedInvoices);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInvoices();
    setRefreshing(false);
    toast.success('Invoices refreshed!');
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // FIXED: Use PDFGeneratorService directly with enhanced debugging
  const regeneratePDFWithUpdatedStatus = async (invoiceNumber, updatedInvoiceData) => {
    try {
      setRegeneratingPdf(prev => ({ ...prev, [invoiceNumber]: true }));

      console.log('🔄 Starting PDF regeneration for:', invoiceNumber);
      console.log('📄 Invoice data for PDF:', {
        invoiceNumber: updatedInvoiceData.invoiceNumber,
        status: updatedInvoiceData.status,
        totalAmount: updatedInvoiceData.totalAmount,
        hasItems: updatedInvoiceData.items,
        itemsType: typeof updatedInvoiceData.items
      });

      // Call PDFGeneratorService directly
      const result = await regenerateInvoicePDF(updatedInvoiceData);
      
      console.log('✅ PDF regeneration result:', result);
      
      if (result.success && result.newPdfUrl) {
        // Update the invoice with the new PDF URL in DynamoDB
        const updateParams = {
          TableName: AWS_DYNAMODB_CONFIG.tableName,
          Key: {
            invoice_number: invoiceNumber
          },
          UpdateExpression: 'SET s3_pdf_url = :newPdfUrl, updated_at = :updated_at',
          ExpressionAttributeValues: {
            ':newPdfUrl': result.newPdfUrl,
            ':updated_at': new Date().toISOString()
          }
        };

        console.log('🔗 Updating PDF URL in DynamoDB:', updateParams);
        const updateCommand = new UpdateCommand(updateParams);
        const dbResult = await docClient.send(updateCommand);
        console.log('✅ PDF URL update in DynamoDB successful:', dbResult);

        // Update local state with new PDF URL
        setAllInvoices(prevInvoices =>
          prevInvoices.map(inv =>
            inv.invoiceNumber === invoiceNumber
              ? { ...inv, s3PdfUrl: result.newPdfUrl }
              : inv
          )
        );

        return result.newPdfUrl;
      } else {
        throw new Error('PDF regeneration response invalid');
      }

    } catch (error) {
      console.error('❌ Error regenerating PDF:', error);
      // toast.error(`Failed to regenerate PDF: ${error.message}`);
      throw error;
    } finally {
      setRegeneratingPdf(prev => ({ ...prev, [invoiceNumber]: false }));
    }
  };

  // FIXED: Enhanced handleMarkPaid with proper error handling and debugging
  const handleMarkPaid = async (invoiceNumber, event) => {
    if (event) event.preventDefault();
    
    try {
      setMarkingPaid(prev => ({ ...prev, [invoiceNumber]: true }));
      const loadingToast = toast.loading('Marking invoice as paid...');

      await invoiceAPI.markInvoiceAsPaid(invoiceNumber);
      toast.dismiss(loadingToast);
      toast.success('Invoice marked as paid!');

      loadInvoices();
    } catch (error) {
      console.error('❌ Error in handleMarkPaid:', error);
      toast.dismiss();
      toast.error(`Failed to mark invoice as paid: ${error.message}`);
    } finally {
      setMarkingPaid(prev => ({ ...prev, [invoiceNumber]: false }));
    }
  };

  const handleDelete = async (invoiceNumber) => {
    if (!window.confirm(`Are you sure you want to delete invoice ${invoiceNumber}?`)) return;
    
    try {
      await invoiceAPI.deleteInvoice(invoiceNumber);
      toast.success('Invoice deleted successfully');
      setAllInvoices(prevInvoices =>
        prevInvoices.filter(inv => inv.invoiceNumber !== invoiceNumber)
      );
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Failed to delete invoice');
    }
  };

  // FIXED: Enhanced handleDownload with direct PDF service integration
  const handleDownload = async (invoiceNumber) => {
    try {
      const loadingToast = toast.loading('Generating PDF with current status...');

      // Find the invoice
      const invoice = allInvoices.find(inv => inv.invoiceNumber === invoiceNumber);
      if (!invoice) {
        toast.dismiss(loadingToast);
        toast.error('Invoice not found');
        return;
      }

      try {
        // Generate fresh PDF with current status using PDFGeneratorService
        const pdfResult = await generateFreshInvoicePDF(invoice);

        if (pdfResult.success && pdfResult.blob) {
          const url = window.URL.createObjectURL(pdfResult.blob);
          
          const link = document.createElement('a');
          link.href = url;
          link.download = `${invoiceNumber}_${invoice.status.toLowerCase()}.pdf`;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          window.URL.revokeObjectURL(url);
          
          toast.dismiss(loadingToast);
          toast.success(`PDF downloaded with current status: ${invoice.status}!`);
          return;
        } else {
          throw new Error('PDF generation failed');
        }
      } catch (freshPdfError) {
        console.warn('Fresh PDF generation failed, falling back to stored PDF:', freshPdfError);
        toast.dismiss(loadingToast);
        
        // Fallback to stored S3 PDF (may have old status)
        if (invoice.s3PdfUrl) {
          const fallbackToast = toast.loading('Downloading stored PDF...');
          
          const link = document.createElement('a');
          link.href = invoice.s3PdfUrl;
          link.download = `${invoiceNumber}.pdf`;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          toast.dismiss(fallbackToast);
          toast.success('Stored PDF downloaded! (Note: May show previous status)', { duration: 4000 });
        } else {
          toast.error('No PDF available for this invoice');
        }
      }
      
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error('Failed to download invoice PDF');
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setStatusFilter('all');
    setTypeFilter('all');
    setCurrentPage(1);
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
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'SA':
        return 'bg-blue-500';
      case 'SHR':
        return 'bg-purple-500';
      case 'STS':
        return 'bg-green-500';
      case 'SDE':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading && currentPage === 1 && !shouldMaintainFocus) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="xl" message="Loading invoices from DynamoDB..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Invoice History</h1>
          <p className="text-gray-600 mt-1">Manage and track all your invoices in one place</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <Link
            to="/settlo/create"
            className="flex items-center space-x-2 px-4 py-2 gradient-primary text-white rounded-lg hover:shadow-lg transition-all duration-200"
          >
            <FileText className="w-4 h-4" />
            <span>New Invoice</span>
          </Link>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card p-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by client name, invoice number..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Status</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Types</option>
              <option value="SA">Settlo Academy</option>
              <option value="SHR">Settlo HR</option>
              <option value="STS">Settlo Tech Solutions</option>
              <option value="SDE">Settlo Distance Education</option>
            </select>
          </div>

          {/* Clear Filters */}
          <button
            onClick={clearAllFilters}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
          >
            Clear All Filters
          </button>
        </div>

        {/* Active Filters Display */}
        {(debouncedSearchQuery || statusFilter !== 'all' || typeFilter !== 'all') && (
          <div className="mt-4 flex items-center space-x-2 text-sm">
            <span className="text-gray-500">Active filters:</span>
            {debouncedSearchQuery && (
              <span className="inline-flex items-center px-2 py-1 bg-primary-100 text-primary-800 rounded-full">
                Search: "{debouncedSearchQuery}"
              </span>
            )}
            {statusFilter !== 'all' && (
              <span className="inline-flex items-center px-2 py-1 bg-primary-100 text-primary-800 rounded-full">
                Status: {statusFilter}
              </span>
            )}
            {typeFilter !== 'all' && (
              <span className="inline-flex items-center px-2 py-1 bg-primary-100 text-primary-800 rounded-full">
                Type: {typeFilter}
              </span>
            )}
          </div>
        )}
      </motion.div>

      {/* Invoice List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card overflow-hidden"
      >
        {loading && shouldMaintainFocus ? (
          <div className="flex items-center justify-center py-4">
            <div className="flex items-center space-x-2 text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
              <span className="text-sm">Searching...</span>
            </div>
          </div>
        ) : invoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map((invoice, index) => (
                  <motion.tr
                    key={invoice._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * index }}
                    className="hover:bg-gray-50 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div
                          className={`w-8 h-8 ${getTypeColor(
                            invoice.invoiceType
                          )} rounded-lg flex items-center justify-center text-white text-xs font-semibold mr-3`}
                        >
                          {invoice.invoiceType}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{invoice.invoiceNumber}</div>
                          <div className="text-sm text-gray-500">{invoice.paymentType || 'N/A'}</div>
                          {/* Show PDF regeneration status */}
                          {regeneratingPdf[invoice.invoiceNumber] && (
                            <div className="text-xs text-blue-600 flex items-center mt-1">
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                              Updating PDF...
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{invoice.clientName}</div>
                        <div className="text-sm text-gray-500">{invoice.clientPhone}</div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          ₹{invoice.totalAmount?.toLocaleString() || '0'}
                        </div>
                        {invoice.paymentType === 'Initial Payment' && (
                          <div className="text-xs text-gray-500">
                            Collected: ₹{invoice.collectedAmount?.toLocaleString() || '0'}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(
                          invoice.status
                        )}`}
                      >
                        {getStatusIcon(invoice.status)}
                        <span className="ml-1">{invoice.status}</span>
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(invoice.invoiceDate).toLocaleDateString()}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          to={`/settlo/invoice/${invoice.invoiceNumber}`}
                          className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>

                        <button
                          onClick={() => handleDownload(invoice.invoiceNumber)}
                          className="text-green-600 hover:text-green-900 p-2 hover:bg-green-50 rounded-lg transition-colors duration-200"
                          title="Download PDF with Current Status"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        {/* Mark as Paid Button */}
                        {invoice.status !== 'Paid' && (
                          <button
                            onClick={(e) => handleMarkPaid(invoice.invoiceNumber, e)}
                            disabled={markingPaid[invoice.invoiceNumber] || regeneratingPdf[invoice.invoiceNumber]}
                            type="button"
                            className={`p-2 rounded-lg transition-colors duration-200 ${
                              markingPaid[invoice.invoiceNumber] || regeneratingPdf[invoice.invoiceNumber]
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-blue-600 hover:text-blue-900 hover:bg-blue-50'
                            }`}
                            title="Mark as Paid & Update PDF"
                          >
                            {markingPaid[invoice.invoiceNumber] || regeneratingPdf[invoice.invoiceNumber] ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(invoice.invoiceNumber)}
                          className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors duration-200"
                          title="Delete Invoice"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
            <p className="text-gray-500 mb-6">
              {debouncedSearchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Try adjusting your filters to see more results.'
                : 'Get started by creating your first invoice.'}
            </p>
            <Link
              to="/create"
              className="inline-flex items-center px-4 py-2 gradient-primary text-white rounded-lg hover:shadow-lg transition-all duration-200"
            >
              <FileText className="w-4 h-4 mr-2" />
              Create Invoice
            </Link>
          </div>
        )}
      </motion.div>

      {/* Pagination */}
      {totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-between"
        >
          <div className="text-sm text-gray-700">
            Page {currentPage} of {totalPages} ({allInvoices.length} total invoices)
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              Previous
            </button>

            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const page = i + 1;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 text-sm rounded-lg transition-colors duration-200 ${
                      currentPage === page
                        ? 'bg-primary-600 text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              Next
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default InvoiceHistory;
