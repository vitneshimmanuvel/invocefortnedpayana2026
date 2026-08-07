import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { invoiceAPI } from './api.js';

// S3 URLs for assets
const S3_ASSET_URLS = {
  logo: 'https://settlo-invoices.s3.ap-south-1.amazonaws.com/assets/logo.png',
  signature: 'https://settlo-invoices.s3.ap-south-1.amazonaws.com/assets/signature.png'
};

// Professional fallback images (kept as backup)
const FALLBACK_IMAGES = {
  logo: 'data:image/svg+xml;base64,' + btoa(`
    <svg width="120" height="120" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#2E3B82;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#4F46E5;stop-opacity:1" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="50" fill="url(#grad1)" stroke="#1D4ED8" stroke-width="2"/>
      <text x="60" y="75" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="white" text-anchor="middle">S</text>
    </svg>
  `),
  signature: 'data:image/svg+xml;base64,' + btoa(`
    <svg width="150" height="75" xmlns="http://www.w3.org/2000/svg">
      <rect width="150" height="75" fill="#f8f9fa" stroke="#ddd" stroke-width="1" rx="5"/>
      <text x="75" y="30" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#333" text-anchor="middle">Authorized</text>
      <text x="75" y="50" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#333" text-anchor="middle">Signature</text>
      <path d="M20 60 Q40 50 60 55 T100 50 Q115 55 130 50" stroke="#4CAF50" stroke-width="2" fill="none"/>
    </svg>
  `)
};

class PDFGeneratorService {
  // FIXED: Utility function to ensure items is always an array
  parseItemsArray(items) {
    try {
      // If items is already an array, return it
      if (Array.isArray(items)) {
        return items;
      }
      
      // If items is a string, try to parse it as JSON
      if (typeof items === 'string') {
        const parsed = JSON.parse(items);
        return Array.isArray(parsed) ? parsed : [];
      }
      
      // If items is an object but not an array, convert it
      if (items && typeof items === 'object') {
        // If it's an object with numeric keys, convert to array
        if (Object.keys(items).every(key => !isNaN(key))) {
          return Object.values(items);
        }
        // Otherwise, wrap it in an array
        return [items];
      }
      
      // Default to empty array
      return [];
    } catch (error) {
      console.error('Error parsing items array:', error, 'Original items:', items);
      return [];
    }
  }

  // FIXED: Utility function to safely parse invoice data
  sanitizeInvoiceData(invoiceData) {
    const sanitized = {
      ...invoiceData,
      // Ensure items is always an array
      items: this.parseItemsArray(invoiceData.items),
      // Ensure required fields have defaults
      invoiceNumber: invoiceData.invoiceNumber || 'N/A',
      clientName: invoiceData.clientName || 'Unknown Client',
      clientPhone: invoiceData.clientPhone || '',
      clientEmail: invoiceData.clientEmail || '',
      clientAddress: invoiceData.clientAddress || '',
      status: invoiceData.status || 'Pending',
      paymentType: invoiceData.paymentType || 'Full Payment',
      totalAmount: parseFloat(invoiceData.totalAmount || 0),
      taxPercentage: parseFloat(invoiceData.taxPercentage || 0),
      notes: invoiceData.notes || '',
      invoiceDate: invoiceData.invoiceDate || new Date().toISOString()
    };

    console.log('🔧 Sanitized invoice data:', {
      invoiceNumber: sanitized.invoiceNumber,
      itemsType: typeof sanitized.items,
      itemsIsArray: Array.isArray(sanitized.items),
      itemsLength: sanitized.items.length,
      originalItemsType: typeof invoiceData.items
    });

    return sanitized;
  }

  async fetchImageAsBase64(imageUrl) {
    try {
      const response = await fetch(imageUrl, {
        method: 'GET',
        headers: {
          'Accept': 'image/*',
        },
        mode: 'cors'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to convert blob to base64'));
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error(`Failed to fetch image from ${imageUrl}:`, error);
      return null;
    }
  }

  async getImageBase64(imageName) {
    try {
      if (imageName.includes('logo')) {
        const logoBase64 = await this.fetchImageAsBase64(S3_ASSET_URLS.logo);
        return logoBase64 || FALLBACK_IMAGES.logo;
      } else if (imageName.includes('signature')) {
        const signatureBase64 = await this.fetchImageAsBase64(S3_ASSET_URLS.signature);
        return signatureBase64 || FALLBACK_IMAGES.signature;
      }
      
      return FALLBACK_IMAGES.logo;
    } catch (error) {
      console.error('Error getting image base64:', error);
      if (imageName.includes('logo')) {
        return FALLBACK_IMAGES.logo;
      } else if (imageName.includes('signature')) {
        return FALLBACK_IMAGES.signature;
      }
      return FALLBACK_IMAGES.logo;
    }
  }

  // Generate HTML with current status (works for both Paid and Pending)
  async generateInvoiceHTMLWithCurrentStatus(rawInvoiceData) {
    // FIXED: Sanitize the invoice data first
    const invoiceData = this.sanitizeInvoiceData(rawInvoiceData);
    
    const logoBase64 = await this.getImageBase64('logo.png');
    const signatureBase64 = await this.getImageBase64('signature.png');
    
    const currentDate = new Date().toLocaleDateString('en-IN');
    const isPaid = invoiceData.status === 'Paid';
    
    // FIXED: Calculate amounts with proper array handling
    const calculateAmounts = () => {
      if (invoiceData.paymentType === 'Full Payment') {
        return {
          collectedAmount: invoiceData.totalAmount || 0,
          pendingAmount: 0,
          totalProjectValue: invoiceData.totalAmount || 0
        };
      } else {
        let totalItemAmount = 0;
        let totalPendingAmount = 0;
        
        // FIXED: Now we know items is always an array
        invoiceData.items.forEach(item => {
          const itemTotal = parseFloat(item.rate || 0) * parseFloat(item.quantity || 1);
          const itemPending = parseFloat(item.pendingPayment || 0);
          
          totalItemAmount += itemTotal;
          totalPendingAmount += itemPending;
        });
        
        return {
          collectedAmount: isPaid ? totalItemAmount : (totalItemAmount - totalPendingAmount),
          pendingAmount: isPaid ? 0 : totalPendingAmount,
          totalProjectValue: totalItemAmount
        };
      }
    };

    const { collectedAmount, pendingAmount, totalProjectValue } = calculateAmounts();

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Invoice ${invoiceData.invoiceNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              color: #333;
              line-height: 1.4;
              font-size: 12px;
              background: white;
              width: 794px;
              min-height: 1123px;
            }
            .invoice-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 30px;
              border-bottom: 3px solid #4CAF50;
              padding-bottom: 20px;
            }
            .company-info { flex: 1; }
            .company-name {
              font-size: 20px;
              font-weight: bold;
              color: #2E3B82;
              margin-bottom: 8px;
            }
            .company-tagline {
              font-size: 16px;
              color: #2E3B82;
              margin-bottom: 10px;
            }
            .company-address {
              font-size: 11px;
              color: #666;
              line-height: 1.3;
            }
            .account-details {
              margin-top: 15px;
              padding: 12px;
              background: #f8f9fa;
              border-radius: 6px;
              border-left: 3px solid #2E3B82;
            }
            .account-title {
              font-size: 12px;
              font-weight: bold;
              color: #2E3B82;
              margin-bottom: 8px;
            }
            .account-info {
              font-size: 10px;
              color: #666;
              line-height: 1.4;
            }
            .invoice-logo {
              flex: 0 0 200px;
              text-align: center;
            }
            .settlo-logo {
              width: 120px;
              height: 120px;
              margin: 0 auto 10px;
              border-radius: 10px;
              display: block;
            }
            .invoice-number {
              font-size: 20px;
              font-weight: bold;
              color: #2E3B82;
              margin-bottom: 8px;
            }
            .client-section { margin: 30px 0; }
            .section-title {
              font-size: 14px;
              font-weight: bold;
              color: #2E3B82;
              margin-bottom: 10px;
              border-bottom: 1px solid #eee;
              padding-bottom: 5px;
            }
            .status-banner {
              background: ${isPaid ? 'linear-gradient(45deg, #4CAF50, #45a049)' : 'linear-gradient(45deg, #FF9800, #f57c00)'};
              color: white;
              text-align: center;
              padding: 15px 20px;
              border-radius: 10px;
              margin: 20px 0;
              box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            }
            .status-text {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .services-table {
              width: 100%;
              border-collapse: collapse;
              margin: 25px 0;
              font-size: 12px;
              border: 2px solid #333;
            }
            .services-table th {
              background: white;
              color: #333;
              padding: 12px 10px;
              text-align: left;
              font-weight: bold;
              border: 1px solid #333;
            }
            .services-table td {
              padding: 10px;
              border: 1px solid #333;
              background: white;
            }
            .amount-cell {
              text-align: right;
              font-weight: bold;
              color: #2E3B82;
            }
            .due-date-cell {
              text-align: center;
              font-weight: bold;
              color: ${isPaid ? '#4CAF50' : '#FF5722'};
            }
            .payment-summary {
              margin-top: 25px;
              background: ${isPaid ? 'linear-gradient(135deg, #e8f5e8, #c8e6c9)' : '#f8f9fa'};
              padding: 20px;
              border-radius: 8px;
              border-left: 4px solid ${isPaid ? '#4CAF50' : '#FF9800'};
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
            }
            .signature-section {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 20px 0;
              margin-top: 40px;
              border-top: 2px solid #eee;
            }
            .signature-image {
              width: 150px;
              height: 75px;
              border-radius: 5px;
              border: 1px solid #ddd;
            }
            .company-website {
              color: #2E3B82;
              text-decoration: none;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="invoice-header">
            <div class="company-info">
              <div class="company-name">Settlo Academy &</div>
              <div class="company-tagline">Settlo Tech Solutions</div>
              <div class="company-address">
                121 Akhil Plaza, Perundurai Road, Erode<br>
                <a href="https://www.settlo.com" class="company-website">www.settlo.com</a>, +91 9003633356
              </div>
              
              <div class="account-details">
                <div class="account-title">Account Details:</div>
                <div class="account-info">
                  Bank Name: HDFC Bank<br>
                  Name: Settlo Academy Private Limited<br>
                  Account no: 50200084906174<br>
                  Branch: Palayapalayam, Erode<br>
                  IFSC Code: HDFC0009203<br>
                  MICR Code: 638240010
                </div>
              </div>
            </div>
            
            <div class="invoice-logo">
              <img src="${logoBase64}" alt="Settlo Logo" class="settlo-logo">
              <div class="invoice-number">INVOICE # ${invoiceData.invoiceNumber}</div>
              <div style="font-size: 11px; color: #666;">
                Invoice Date: ${new Date(invoiceData.invoiceDate).toLocaleDateString('en-IN')}<br>
                ${isPaid ? `Paid on: ${currentDate}<br>` : ''}
                <strong style="color: ${isPaid ? '#4CAF50' : '#FF9800'};">STATUS: ${invoiceData.status}</strong>
              </div>
            </div>
          </div>

          <div class="client-section">
            <div class="section-title">Bill To:</div>
            <div>
              <strong>${invoiceData.clientName}</strong><br>
              Phone: ${invoiceData.clientPhone}<br>
              ${invoiceData.clientEmail ? `Email: ${invoiceData.clientEmail}<br>` : ''}
              ${invoiceData.clientAddress ? invoiceData.clientAddress.replace(/\n/g, '<br>') : ''}
            </div>
          </div>

          <div class="status-banner">
            <div class="status-text">
              ${isPaid ? '✅ PAYMENT COMPLETED - INVOICE FULLY SETTLED' : '⏳ PAYMENT PENDING - AWAITING SETTLEMENT'}
            </div>
          </div>

          <table class="services-table">
            <thead>
              <tr>
                <th style="width: 20%;">Service</th>
                <th style="width: 45%;">Description</th>
                <th style="width: 20%;">Amount</th>
                <th style="width: 15%;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${invoiceData.items.length > 0 ? invoiceData.items.map(item => {
                const displayAmount = (parseFloat(item.rate || 0) * parseFloat(item.quantity || 1)).toFixed(2);
                return `
                  <tr>
                    <td><strong>${(item.description || 'Service').split(' ')[0]}</strong></td>
                    <td>${item.description || 'Service Description'}</td>
                    <td class="amount-cell">₹${displayAmount}</td>
                    <td class="due-date-cell">
                      ${isPaid ? 'PAID' : (invoiceData.dueDate ? new Date(invoiceData.dueDate).toLocaleDateString('en-IN') : 'PENDING')}
                    </td>
                  </tr>
                `;
              }).join('') : `
                <tr>
                  <td><strong>Service</strong></td>
                  <td>General Service</td>
                  <td class="amount-cell">₹${invoiceData.totalAmount?.toFixed(2) || '0.00'}</td>
                  <td class="due-date-cell">
                    ${isPaid ? 'PAID' : 'PENDING'}
                  </td>
                </tr>
              `}
            </tbody>
          </table>

          <div class="payment-summary">
            <div class="summary-row">
              <span>Amount Collected</span>
              <span>₹${collectedAmount.toFixed(2)}</span>
            </div>
            ${pendingAmount > 0 && !isPaid ? `
              <div class="summary-row">
                <span>Pending Amount</span>
                <span>₹${pendingAmount.toFixed(2)}</span>
              </div>
            ` : ''}
            ${invoiceData.taxPercentage > 0 ? `
              <div class="summary-row">
                <span>Tax (${invoiceData.taxPercentage}%)</span>
                <span>₹${(totalProjectValue * (parseFloat(invoiceData.taxPercentage) / 100)).toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="summary-row" style="border-top: 2px solid ${isPaid ? '#4CAF50' : '#FF9800'}; padding-top: 10px; margin-top: 10px; font-size: 16px; font-weight: bold;">
              <span>Total Project Value</span>
              <span>₹${totalProjectValue.toFixed(2)}</span>
            </div>
          </div>

          ${invoiceData.notes ? `
            <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
              <strong>Notes:</strong><br>
              ${invoiceData.notes.replace(/\n/g, '<br>')}
            </div>
          ` : ''}

          <div class="signature-section">
            <img src="${signatureBase64}" alt="Authorized Signature" class="signature-image">
            <div style="text-align: right; flex: 1; margin-left: 20px;">
              <strong>Thank you for choosing Settlo Tech Solutions!</strong><br>
              Generated on ${currentDate} at ${new Date().toLocaleTimeString('en-IN')}<br>
              For support: +91 9003633356 | <a href="https://www.settlo.com" class="company-website">www.settlo.com</a>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  async generatePDFFromHTML(htmlContent, fileName) {
    try {
      const tempContainer = document.createElement('div');
      tempContainer.innerHTML = htmlContent;
      
      tempContainer.style.cssText = `
        position: absolute;
        left: -9999px;
        top: 0;
        width: 794px;
        min-height: 1123px;
        background: white;
        padding: 20px;
        font-family: Arial, sans-serif;
        line-height: 1.4;
        color: #333;
        display: block;
        visibility: visible;
        opacity: 1;
      `;
      
      document.body.appendChild(tempContainer);
      await new Promise(resolve => setTimeout(resolve, 300));

      const canvas = await html2canvas(tempContainer, {
        width: 794,
        height: Math.max(1123, tempContainer.scrollHeight + 40),
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      document.body.removeChild(tempContainer);

      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error('Canvas is empty');
      }

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4'
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      
      const pdfBlob = pdf.output('blob');
      
      return {
        success: true,
        blob: pdfBlob,
        fileName: `${fileName}.pdf`
      };
    } catch (error) {
      console.error('PDF generation error:', error);
      throw new Error(`PDF generation failed: ${error.message}`);
    }
  }

  async uploadPDFToS3(pdfBlob, invoiceData) {
    try {
      console.log('📤 Starting Cloudinary PDF upload for invoice:', invoiceData.invoiceNumber);
      
      const reader = new FileReader();
      const base64Promise = new Promise((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(pdfBlob);
      });
      
      const base64Data = await base64Promise;
      const response = await invoiceAPI.uploadPDFToCloudinary(base64Data, invoiceData.invoiceNumber);

      const pdfUrl = response.data.pdfUrl;
      console.log('🔗 Generated Cloudinary PDF URL:', pdfUrl);

      return {
        success: true,
        s3Url: pdfUrl,
        s3Key: response.data.publicId || invoiceData.invoiceNumber,
        location: pdfUrl
      };
    } catch (error) {
      console.error('❌ Cloudinary PDF upload error:', error);
      throw new Error(`Cloudinary upload failed: ${error.message}`);
    }
  }

  // Regenerate PDF with updated status and upload to S3
  async regenerateInvoicePDFWithStatus(invoiceData) {
    try {
      console.log('🔄 Regenerating PDF with status:', invoiceData.status, 'for invoice:', invoiceData.invoiceNumber);

      // Generate HTML with current status
      const htmlContent = await this.generateInvoiceHTMLWithCurrentStatus(invoiceData);
      
      // Generate PDF
      const pdfResult = await this.generatePDFFromHTML(htmlContent, invoiceData.invoiceNumber);
      
      if (!pdfResult.success) {
        throw new Error('PDF generation failed');
      }
      
      // Upload to S3 (replaces existing PDF)
      const s3Result = await this.uploadPDFToS3(pdfResult.blob, invoiceData);
      
      if (!s3Result.success) {
        throw new Error('S3 upload failed');
      }

      console.log('✅ PDF regenerated and uploaded successfully');
      
      return {
        success: true,
        s3Url: s3Result.s3Url,
        s3Key: s3Result.s3Key,
        message: 'PDF regenerated with updated status'
      };
    } catch (error) {
      console.error('❌ PDF regeneration error:', error);
      throw new Error(`Failed to regenerate PDF: ${error.message}`);
    }
  }

  // Generate fresh PDF for download (without uploading)
  async generateFreshPDFForDownload(invoiceData) {
    try {
      console.log('📄 Generating fresh PDF for download:', invoiceData.invoiceNumber);

      const htmlContent = await this.generateInvoiceHTMLWithCurrentStatus(invoiceData);
      const pdfResult = await this.generatePDFFromHTML(htmlContent, `${invoiceData.invoiceNumber}_current`);
      
      return pdfResult;
    } catch (error) {
      console.error('❌ Fresh PDF generation error:', error);
      throw new Error(`Failed to generate fresh PDF: ${error.message}`);
    }
  }

  // Existing methods remain the same
  async generateSettloInvoiceHTML(invoiceData) {
    return this.generateInvoiceHTMLWithCurrentStatus(invoiceData);
  }

  async generateAndUploadPDF(invoiceData) {
    return this.regenerateInvoicePDFWithStatus(invoiceData);
  }

  async markInvoiceAsPaid(invoiceNumber, balanceAmount, originalInvoiceData) {
    const updatedInvoiceData = {
      ...originalInvoiceData,
      status: 'Paid',
      collectedAmount: originalInvoiceData.totalAmount,
      pendingAmount: 0
    };

    return this.regenerateInvoicePDFWithStatus(updatedInvoiceData);
  }
}

export const pdfGenerator = new PDFGeneratorService();

// Export utility functions
export const regenerateInvoicePDF = (invoiceData) => {
  return pdfGenerator.regenerateInvoicePDFWithStatus(invoiceData);
};

export const generateFreshInvoicePDF = (invoiceData) => {
  return pdfGenerator.generateFreshPDFForDownload(invoiceData);
};

export const markInvoiceAsPaid = (invoiceNumber, balanceAmount, originalInvoiceData) => {
  return pdfGenerator.markInvoiceAsPaid(invoiceNumber, balanceAmount, originalInvoiceData);
};
