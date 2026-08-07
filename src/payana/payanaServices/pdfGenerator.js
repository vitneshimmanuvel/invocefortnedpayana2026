// pdfGenerator.js - SINGLE PAGE ONLY VERSION
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// 🔧 ENHANCED: Better fallback logo with same styling as signature loading
const getFallbackLogo = () => {
  const svgLogo = `
    <svg width="90" height="58" xmlns="http://www.w3.org/2000/svg">
      <rect width="90" height="58" fill="#D81E00" rx="5"/>
      <text x="45" y="20" font-family="Arial" font-size="12" fill="white" text-anchor="middle" font-weight="bold">PAYANA</text>
      <text x="45" y="35" font-family="Arial" font-size="8" fill="white" text-anchor="middle">OVERSEAS</text>
      <text x="45" y="48" font-family="Arial" font-size="8" fill="white" text-anchor="middle">SOLUTIONS</text>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svgLogo)}`;
};

// 🔧 ENHANCED: Robust image loading with multiple fallback strategies
const loadImageAsBase64 = async (url, retries = 3) => {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      console.log(`🖼️ Loading image from: ${url} (Attempt ${attempt + 1}/${retries})`);
      
      const loadImage = (src) => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          
          const timeout = setTimeout(() => {
            reject(new Error(`Image load timeout: ${src}`));
          }, 10000);
          
          img.onload = () => {
            clearTimeout(timeout);
            try {
              console.log(`✅ Image loaded successfully: ${src}`, img.width, 'x', img.height);
              
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              
              ctx.fillStyle = 'white';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0);
              
              const dataURL = canvas.toDataURL('image/png', 1.0);
              console.log(`✅ Image converted to base64, size: ${dataURL.length} chars`);
              resolve(dataURL);
            } catch (canvasError) {
              console.error('Canvas conversion error:', canvasError);
              reject(canvasError);
            }
          };
          
          img.onerror = (error) => {
            clearTimeout(timeout);
            console.error('Image load error:', error, 'URL:', src);
            reject(new Error(`Failed to load image: ${src}`));
          };
          
          const cacheBuster = new Date().getTime();
          img.src = `${src}?cb=${cacheBuster}`;
        });
      };

      const result = await loadImage(url);
      return result;
      
    } catch (error) {
      console.warn(`⚠️ Image load attempt ${attempt + 1} failed:`, error.message);
      
      if (attempt === retries - 1) {
        console.log('🔄 Trying alternative image sources...');
        
        const alternativeUrls = [
          'https://settlo-invoices.s3.ap-south-1.amazonaws.com/assets/payana-logo.png',
          '/assets/payana-logo.png',
          './assets/payana-logo.png'
        ];
        
        for (const altUrl of alternativeUrls) {
          if (altUrl !== url) {
            try {
              console.log(`🔄 Trying alternative URL: ${altUrl}`);
              const result = await loadImage(altUrl);
              return result;
            } catch (altError) {
              console.warn(`⚠️ Alternative URL failed: ${altUrl}`, altError.message);
            }
          }
        }
        
        console.log('🔄 All image sources failed, using fallback');
        return getFallbackLogo();
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  
  console.log('🔄 Using fallback logo after all retries failed');
  return getFallbackLogo();
};

// 🔧 SINGLE PAGE ONLY: PDF generation that ALWAYS creates only 1 page
export const generatePayanaInvoicePDF = async (invoiceData) => {
  try {
    console.log('Starting SINGLE-PAGE ONLY PDF generation...');
    console.log('Invoice data received:', invoiceData);
    
    // Validate and set default values for invoice data
    const validatedData = {
      invoiceNumber: invoiceData?.invoiceNumber || 'PO-2025051',
      date: invoiceData?.date || new Date().toISOString().split('T')[0],
      name: invoiceData?.name || 'HARI',
      dob: invoiceData?.dob || '19-10-2003',
      contact: invoiceData?.contact || '9788002400',
      idType: invoiceData?.idType || 'Passport',
      idNumber: invoiceData?.idNumber || '72638363738',
      service: invoiceData?.service || invoiceData?.serviceOffered || 'STUDY',
      serviceOffered: invoiceData?.serviceOffered || 'STUDY',
      customService: invoiceData?.customService || '',
      country: invoiceData?.country || 'INDIA',
      totalFee: invoiceData?.totalFee || '50000',
      taxPercent: invoiceData?.taxPercent || '0',
      taxAmount: invoiceData?.taxAmount || '0.00',
      totalWithTax: invoiceData?.totalWithTax || '50000.00',
      paidAmount: invoiceData?.paidAmount || '20000',
      remainingAmount: invoiceData?.remainingAmount || '30000.00'
    };

    console.log('Validated data:', validatedData);

    // Load images with enhanced loading
    let logoData, signatureData;
    
    try {
      logoData = await loadImageAsBase64('https://settlo-invoices.s3.ap-south-1.amazonaws.com/assets/payana-logo.png');
      console.log('✅ Logo loaded successfully');
    } catch (error) {
      console.warn('⚠️ Logo loading failed, using fallback:', error);
      logoData = getFallbackLogo();
    }
    
    try {
      signatureData = await loadImageAsBase64('https://settlo-invoices.s3.ap-south-1.amazonaws.com/assets/work-signature.png');
      console.log('✅ Signature loaded successfully');
    } catch (error) {
      console.warn('⚠️ Signature loading failed:', error);
      signatureData = '';
    }
    
    console.log('Logo status:', logoData ? 'Loaded' : 'Failed');
    console.log('Signature status:', signatureData ? 'Loaded' : 'Failed');
    
    // Create a temporary div with invoice content
    const tempDiv = document.createElement('div');
    tempDiv.style.cssText = `
      position: absolute;
      left: -9999px;
      top: 0;
      width: 800px;
      background: white;
      font-family: Arial, sans-serif;
    `;

    // Invoice content HTML
    tempDiv.innerHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          * {
            box-sizing: border-box;
          }
          html, body {
            margin: 0;
            padding: 0;
            height: 100%;
          }
          body {
            font-family: Arial, sans-serif;
            line-height: 1.3;
            color: #000;
            font-size: 13px;
            border: 3px solid #000;
            padding: 15px;
            margin: 8px;
            height: calc(100vh - 16px);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .content-wrapper {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .header {
            margin-bottom: 15px;
            border-bottom: 2px solid #000;
            padding-bottom: 12px;
          }
          .header-top {
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 10px;
          }
          .logo {
            width: 90px;
            height: 58px;
            margin-right: 12px;
            object-fit: contain;
            display: block;
            background-color: transparent;
          }
          .company-name {
            font-size: 24px;
            font-weight: bold;
            margin: 0;
            line-height: 1.1;
            color: #D81E00;
          }
          .invoice-title {
            font-size: 20px;
            font-weight: bold;
            text-decoration: underline;
            text-align: center;
            margin: 0;
          }
          .invoice-details {
            display: flex;
            justify-content: space-between;
            margin-bottom: 18px;
            font-size: 14px;
            font-weight: bold;
          }
          .main-content {
            flex: 1;
          }
          .client-section, .payment-section {
            margin-bottom: 18px;
          }
          .section-title {
            font-size: 16px;
            font-weight: bold;
            text-decoration: underline;
            margin-bottom: 12px;
          }
          .client-info {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 13px;
            padding: 2px 0;
          }
          .info-label {
            font-weight: bold;
            flex: 0 0 auto;
            min-width: 200px;
          }
          .info-colon {
            margin: 0 12px;
            font-weight: bold;
          }
          .info-value {
            flex: 1;
            text-align: left;
            font-weight: normal;
          }
          .payment-table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
            font-size: 13px;
            border: 2px solid #2C5282;
            border-radius: 8px;
            overflow: hidden;
          }
          .payment-table th, .payment-table td {
            border: 1px solid #4A90E2;
            padding: 8px;
            text-align: left;
          }
          .payment-table th {
            background: linear-gradient(135deg, #2C5282 0%, #3182CE 100%);
            color: #ffffff;
            font-weight: bold;
            text-shadow: 0 1px 2px rgba(0,0,0,0.1);
          }
          .payment-table tr:nth-child(even) {
            background-color: #F7FAFC;
          }
          .payment-table tr:nth-child(odd) {
            background-color: #EDF2F7;
          }
          .payment-table tr:hover {
            background-color: #E2E8F0;
          }
          .total-row {
            font-weight: bold;
            background: linear-gradient(135deg, #1A365D 0%, #2C5282 100%) !important;
            color: #ffffff !important;
          }
          .total-row td {
            border-color: #1A365D;
            text-shadow: 0 1px 2px rgba(0,0,0,0.2);
          }
          .disclaimer {
            margin: 12px 0;
            padding: 10px;
            border: 2px solid #000;
            font-weight: bold;
            text-align: center;
            background-color: #f9f9f9;
            font-size: 12px;
          }
          .footer-section {
            margin-top: 15px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            page-break-inside: avoid;
            gap: 20px;
          }
          .left-footer {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            max-width: 48%;
            gap: 15px;
          }
          .bank-details {
            text-align: left;
            font-size: 11px;
            line-height: 1.4;
          }
          .bank-title {
            font-weight: bold;
            margin-bottom: 8px;
            text-decoration: underline;
            font-size: 12px;
          }
          .bank-info {
            margin-bottom: 3px;
          }
          .signature-section {
            text-align: left;
            margin-top: 10px;
          }
          .signature-img {
            width: 100px;
            height: 35px;
            margin: 5px 0;
            object-fit: contain;
            display: block;
            background-color: transparent;
          }
          .signature-text {
            font-size: 13px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .company-text {
            font-size: 12px;
            margin-top: 3px;
          }
          .right-footer {
            max-width: 48%;
            text-align: right;
          }
          .company-details {
            background: linear-gradient(135deg, #F8F9FA 0%, #E9ECEF 100%);
            border: 2px solid #D81E00;
            border-radius: 12px;
            padding: 16px;
            box-shadow: 0 4px 8px rgba(216, 30, 0, 0.1);
            position: relative;
            overflow: hidden;
          }
          .company-details:before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #D81E00 0%, #FF4444 50%, #D81E00 100%);
          }
          .company-title {
            font-weight: bold;
            margin-bottom: 12px;
            text-decoration: none;
            font-size: 14px;
            color: #D81E00;
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 1px;
            border-bottom: 2px solid #D81E00;
            padding-bottom: 6px;
          }
          .company-info {
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            justify-content: flex-start;
            gap: 12px;
            padding: 6px 8px;
            border-radius: 6px;
            background-color: rgba(255, 255, 255, 0.7);
            transition: background-color 0.3s ease;
            border-left: 3px solid transparent;
          }
          .company-info:hover {
            background-color: rgba(216, 30, 0, 0.05);
            border-left: 3px solid #D81E00;
          }
          .company-info:nth-child(2) { border-left: 3px solid #4facfe; }
          .company-info:nth-child(3) { border-left: 3px solid #00d4ff; }
          .company-info:nth-child(4) { border-left: 3px solid #22c55e; }
          .company-info:nth-child(5) { border-left: 3px solid #f59e0b; }
          .company-info span {
            color: #2D3748;
            font-weight: 600;
            font-size: 11px;
            line-height: 1.4;
          }
          .company-icon {
            width: 18px;
            height: 18px;
            display: inline-block;
            flex-shrink: 0;
            border-radius: 3px;
            background-color: rgba(216, 30, 0, 0.1);
            padding: 2px;
          }
          .phone-icon {
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" fill="%23D81E00" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>') no-repeat center;
            background-size: 14px 14px;
          }
          .email-icon {
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" fill="%23D81E00" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>') no-repeat center;
            background-size: 14px 14px;
          }
          .web-icon {
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" fill="%23D81E00" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>') no-repeat center;
            background-size: 14px 14px;
          }
          .location-icon {
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" fill="%23D81E00" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>') no-repeat center;
            background-size: 14px 14px;
          }
        </style>
      </head>
      <body>
        <div class="content-wrapper">
          <div class="main-content">
            <!-- Header Section -->
            <div class="header">
              <div class="header-top">
                <img src="${logoData}" class="logo" alt="Payana Logo" />
                <div class="company-name">PAYANA OVERSEAS SOLUTIONS PVT LTD</div>
              </div>
              <div class="invoice-title">INVOICE</div>
            </div>

            <!-- Invoice Details -->
            <div class="invoice-details">
              <div><strong>Invoice Number:</strong> ${validatedData.invoiceNumber}</div>
              <div><strong>Date:</strong> ${validatedData.date}</div>
            </div>

            <!-- Client Information Section -->
            <div class="client-section">
              <div class="section-title">CLIENT INFORMATION</div>
              <div class="client-info">
                <div class="info-row">
                  <span class="info-label">GIVEN NAME</span>
                  <span class="info-colon">:</span>
                  <span class="info-value">${validatedData.name}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">DATE OF BIRTH</span>
                  <span class="info-colon">:</span>
                  <span class="info-value">${validatedData.dob}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">CONTACT </span>
                  <span class="info-colon">:</span>
                  <span class="info-value">${validatedData.contact}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">ID (${validatedData.idType === 'PASSPORT' ? 'PASSPORT' : 'AADHAR'})</span>
                  <span class="info-colon">:</span>
                  <span class="info-value">${validatedData.idNumber}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">SERVICE OFFERED</span>
                  <span class="info-colon">:</span>
                  <span class="info-value">${validatedData.service || validatedData.serviceOffered}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">COUNTRY</span>
                  <span class="info-colon">:</span>
                  <span class="info-value">${validatedData.country}</span>
                </div>
              </div>
            </div>

            <!-- Payment Details Section -->
            <div class="payment-section">
              <div class="section-title">PAYMENT DETAILS</div>
              <table class="payment-table">
                <tr>
                  <th>Description</th>
                  <th>Amount (INR)</th>
                </tr>
                <tr>
                  <td>Service Fee</td>
                  <td>₹ ${validatedData.totalFee}</td>
                </tr>
                <tr>
                  <td>Tax (${validatedData.taxPercent}%)</td>
                  <td>₹ ${validatedData.taxAmount}</td>
                </tr>
                <tr class="total-row">
                  <td><strong>Total Amount</strong></td>
                  <td><strong>₹ ${validatedData.totalWithTax}</strong></td>
                </tr>
                <tr>
                  <td>Paid Amount</td>
                  <td>₹ ${validatedData.paidAmount}</td>
                </tr>
                <tr class="total-row">
                  <td><strong>Remaining Amount</strong></td>
                  <td><strong>₹ ${validatedData.remainingAmount}</strong></td>
                </tr>
              </table>
            </div>
          </div>

          <!-- Disclaimer -->
          <div class="disclaimer">
            You acknowledge and agree that this amount is strictly non-refundable under any circumstances.
          </div>

          <!-- Footer Section -->
          <div class="footer-section">
            <!-- Left Footer - Bank Details & Signature -->
            <div class="left-footer">
              <!-- Bank Details -->
              <div class="bank-details">
                <div class="bank-title">BANK DETAILS:</div>
                <div class="bank-info"><strong>Bank Name:</strong> HDFC</div>
                <div class="bank-info"><strong>Branch Address:</strong> Palayapalayam</div>
                <div class="bank-info"><strong>Account Name:</strong> Payana Overseas Solutions Pvt Ltd</div>
                <div class="bank-info"><strong>Account No:</strong> 50200066482470</div>
                <div class="bank-info"><strong>IFSC Code:</strong> HDFC0009203</div>
                <div class="bank-info"><strong>GPay:</strong> 7806925669</div>
              </div>
              
              <!-- Signature Section -->
              <div class="signature-section">
                <div class="signature-text">Authorized Signature</div>
                ${signatureData ? `
                  <img src="${signatureData}" class="signature-img" alt="Signature" />
                ` : ''}
                <div class="company-text">Payana Overseas Solutions</div>
              </div>
            </div>
            
            <!-- Right Footer - Company Details -->
            <div class="right-footer">
              <div class="company-details">
                <div class="company-title">COMPANY DETAILS</div>
                <div class="company-info">
                  <span class="company-icon phone-icon"></span>
                  <span>+91 90036 19777</span>
                </div>
                <div class="company-info">
                  <span class="company-icon email-icon"></span>
                  <span>payanaoverseas@gmail.com</span>
                </div>
                <div class="company-info">
                  <span class="company-icon web-icon"></span>
                  <span>www.payana.com</span>
                </div>
                <div class="company-info">
                  <span class="company-icon location-icon"></span>
                  <span>Perundurai Road, Erode</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Add to document
    document.body.appendChild(tempDiv);

    // Wait for images to load
    console.log('⏳ Waiting for content and images to fully render...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Generate canvas
    console.log('📸 Generating canvas...');
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff', 
      width: 800,
      height: 1200,
      logging: true,
      imageTimeout: 15000,
      removeContainer: true
    });

    // Remove temporary div
    document.body.removeChild(tempDiv);

    // Create PDF
    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    const pdf = new jsPDF('p', 'mm', 'a4');

    // 🔧 SINGLE PAGE ONLY: Force everything to fit on one page - NO MULTI-PAGE LOGIC
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 5;
    const maxWidth = pdfWidth - (margin * 2);
    const maxHeight = pdfHeight - (margin * 2);
    
    // Calculate dimensions - always fit to page
    let imgWidth = maxWidth;
    let imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // If content is too tall, scale it down to fit single page
    if (imgHeight > maxHeight) {
      console.log('📏 Content too tall, scaling down to fit single page');
      imgHeight = maxHeight;
      imgWidth = (canvas.width * imgHeight) / canvas.height;
    }
    
    console.log(`📄 SINGLE PAGE ONLY: ${imgWidth} x ${imgHeight}mm`);
    
    // 🔧 CRITICAL: Add image to PDF - ALWAYS SINGLE PAGE, NO LOOPS, NO MULTI-PAGE
    pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight);
    
    console.log('✅ SINGLE-PAGE PDF generated successfully - NO SECOND PAGE POSSIBLE');
    return pdf;
  } catch (error) {
    console.error('❌ PDF generation error:', error);
    throw error;
  }
};

// Download PDF function - no changes needed
export const downloadPayanaInvoicePDF = async (invoiceData) => {
  try {
    console.log('Starting PDF download...');
    
    const pdf = await generatePayanaInvoicePDF(invoiceData);
    
    // Download the PDF
    const filename = `Payana-Invoice-${invoiceData?.invoiceNumber || 'PO-2025051'}.pdf`;
    pdf.save(filename);
    
    console.log('PDF downloaded:', filename);
    return true;
  } catch (error) {
    console.error('PDF download error:', error);
    return false;
  }
};

// Preview PDF function - no changes needed
export const previewPayanaInvoicePDF = async (invoiceData) => {
  try {
    console.log('Starting PDF preview...');
    
    const pdf = await generatePayanaInvoicePDF(invoiceData);
    const pdfBlob = pdf.output('blob');

    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    // Open PDF in new window
    const newWindow = window.open(pdfUrl, '_blank');
    if (newWindow) {
      newWindow.focus();
      console.log('PDF preview opened');
      
      // Clean up URL after 1 minute
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 60000);
      return true;
    } else {
      // Fallback: trigger download if popup blocked
      const filename = `Payana-Invoice-${invoiceData?.invoiceNumber || 'PO-2025051'}.pdf`;
      pdf.save(filename);
      console.log('Popup blocked, fallback to download');
      return true;
    }
  } catch (error) {
    console.error('PDF preview error:', error);
    return false;
  }
};

// Export functions
export { generatePayanaInvoicePDF as generateInvoicePDF, downloadPayanaInvoicePDF as downloadInvoicePDF, previewPayanaInvoicePDF as previewInvoicePDF };
