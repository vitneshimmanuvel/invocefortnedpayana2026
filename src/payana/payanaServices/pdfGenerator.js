// pdfGenerator.js - High-Fidelity Single-Page Payana Invoice PDF Generator
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PAYANA_LOGO_BASE64, PAYANA_SIGNATURE_BASE64 } from './invoiceAssets';

// Helper to safely parse numeric values and prevent NaN
const parseSafeNum = (val, fallback = 0) => {
  if (val === null || val === undefined || val === '') return fallback;
  const parsed = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
  return isNaN(parsed) ? fallback : parsed;
};

// Helper to normalize and sanitize invoice data from either camelCase or snake_case
export const normalizeInvoiceData = (raw) => {
  const data = raw || {};
  
  let rawDate = data.date || data.invoice_date || data.created_at || new Date().toISOString().split('T')[0];
  let formattedDate = rawDate;
  if (rawDate && typeof rawDate === 'string' && rawDate.includes('-') && rawDate.length === 10) {
    formattedDate = rawDate;
  }

  const baseFee = parseSafeNum(data.totalFee ?? data.total_fee ?? data.subtotal, 0);
  const taxPct = parseSafeNum(data.taxPercent ?? data.tax_percent, 0);
  const taxAmt = parseSafeNum(data.taxAmount ?? data.tax_amount ?? ((baseFee * taxPct) / 100), 0);
  const totalWithTax = parseSafeNum(data.totalWithTax ?? data.total_with_tax ?? data.total ?? (baseFee + taxAmt), baseFee + taxAmt);
  const prevPaid = parseSafeNum(data.previouslyPaidAmount ?? data.previously_paid_amount, 0);
  const paidAmt = parseSafeNum(data.paidAmount ?? data.paid_amount, 0);
  const remainingAmt = parseSafeNum(data.remainingAmount ?? data.remaining_amount ?? (totalWithTax - paidAmt), totalWithTax - paidAmt);

  // Determine ID label (e.g. Aadhaar or Passport)
  const idTypeRaw = String(data.idType || data.client_id_type || 'Aadhaar').trim();
  const idTypeDisplay = idTypeRaw.toLowerCase().includes('pass') ? 'Passport' : 'Aadhaar';

  return {
    invoiceNumber: String(data.invoiceNumber || data.invoice_number || 'PO-2026001').trim(),
    date: formattedDate,
    name: String(data.name || data.client_name || '').trim().toUpperCase(),
    dob: String(data.dob || data.client_dob || '').trim(),
    contact: String(data.contact || data.client_phone || data.client_contact || data.phone || '').trim(),
    idType: idTypeDisplay,
    idNumber: String(data.idNumber || data.client_id_number || '').trim(),
    service: String(data.serviceOffered === 'Others' ? data.customService : (data.service || data.serviceOffered || data.service_offered || 'VISA')).trim().toUpperCase(),
    country: String(data.country || '').trim().toUpperCase(),
    totalFee: baseFee.toFixed(0),
    taxPercent: taxPct.toString(),
    taxAmount: taxAmt.toFixed(2),
    totalWithTax: totalWithTax.toFixed(0),
    previouslyPaidAmount: prevPaid.toFixed(0),
    paidAmount: paidAmt.toFixed(0),
    remainingAmount: remainingAmt > 0 ? remainingAmt.toFixed(0) : '0',
  };
};

/**
 * Generates an authentic, single-page Payana invoice PDF matching the provided reference PDF.
 */
export const generatePayanaInvoicePDF = async (invoiceData) => {
  try {
    const val = normalizeInvoiceData(invoiceData);
    console.log('📄 Generating PDF with normalized data:', val);

    // Create a temporary container for html2canvas
    const tempDiv = document.createElement('div');
    tempDiv.style.cssText = `
      position: absolute;
      left: -9999px;
      top: 0;
      width: 794px;
      min-height: 1120px;
      background: #ffffff;
      padding: 16px;
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #000000;
      -webkit-font-smoothing: antialiased;
    `;

    // High fidelity HTML structure matching the reference PDF
    tempDiv.innerHTML = `
      <div style="
        border: 2.5px solid #000000;
        padding: 20px 24px;
        box-sizing: border-box;
        min-height: 1085px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        background: #ffffff;
      ">
        <div>
          <!-- TOP HEADER WITH LOGO AND COMPANY NAME -->
          <div style="display: flex; align-items: center; justify-content: center; margin-top: 4px; margin-bottom: 12px; gap: 14px;">
            <img src="${PAYANA_LOGO_BASE64}" style="width: 58px; height: 58px; object-fit: contain; flex-shrink: 0;" alt="Logo" />
            <h1 style="
              margin: 0;
              font-size: 21.5px;
              font-weight: 800;
              color: #D81E00;
              letter-spacing: 0.3px;
              text-transform: uppercase;
              font-family: inherit;
            ">PAYANA OVERSEAS SOLUTIONS PVT LTD</h1>
          </div>

          <!-- UNDERLINED INVOICE TITLE -->
          <div style="text-align: center; margin-bottom: 14px;">
            <span style="
              font-size: 19px;
              font-weight: bold;
              text-decoration: underline;
              text-underline-offset: 4px;
              letter-spacing: 0.5px;
            ">INVOICE</span>
          </div>

          <!-- INVOICE NUMBER AND DATE BAR -->
          <div style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 13.5px;
            font-weight: 500;
            margin-bottom: 16px;
            padding-bottom: 2px;
          ">
            <div>Invoice Number: <strong>${val.invoiceNumber}</strong></div>
            <div>Date: <strong>${val.date}</strong></div>
          </div>

          <!-- CLIENT INFORMATION SECTION -->
          <div style="margin-bottom: 18px;">
            <div style="
              font-size: 14px;
              font-weight: bold;
              text-decoration: underline;
              text-underline-offset: 3px;
              margin-bottom: 10px;
              text-transform: uppercase;
            ">CLIENT INFORMATION</div>

            <table style="width: 100%; border-collapse: collapse; font-size: 13px; line-height: 1.6;">
              <tbody>
                <tr>
                  <td style="width: 180px; font-weight: bold; padding: 2px 0;">GIVEN NAME</td>
                  <td style="width: 15px; font-weight: bold; text-align: center;">:</td>
                  <td style="padding: 2px 0 2px 8px; font-weight: normal;">${val.name}</td>
                </tr>
                <tr>
                  <td style="font-weight: bold; padding: 2px 0;">DATE OF BIRTH</td>
                  <td style="font-weight: bold; text-align: center;">:</td>
                  <td style="padding: 2px 0 2px 8px; font-weight: normal;">${val.dob}</td>
                </tr>
                <tr>
                  <td style="font-weight: bold; padding: 2px 0;">CONTACT #</td>
                  <td style="font-weight: bold; text-align: center;">:</td>
                  <td style="padding: 2px 0 2px 8px; font-weight: normal;">${val.contact}</td>
                </tr>
                <tr>
                  <td style="font-weight: bold; padding: 2px 0;">ID (${val.idType})</td>
                  <td style="font-weight: bold; text-align: center;">:</td>
                  <td style="padding: 2px 0 2px 8px; font-weight: normal;">${val.idNumber}</td>
                </tr>
                <tr>
                  <td style="font-weight: bold; padding: 2px 0;">SERVICE OFFERED</td>
                  <td style="font-weight: bold; text-align: center;">:</td>
                  <td style="padding: 2px 0 2px 8px; font-weight: normal;">${val.service}</td>
                </tr>
                <tr>
                  <td style="font-weight: bold; padding: 2px 0;">COUNTRY</td>
                  <td style="font-weight: bold; text-align: center;">:</td>
                  <td style="padding: 2px 0 2px 8px; font-weight: normal;">${val.country}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- PAYMENT DETAILS SECTION -->
          <div style="margin-bottom: 16px;">
            <div style="
              font-size: 14px;
              font-weight: bold;
              text-decoration: underline;
              text-underline-offset: 3px;
              margin-bottom: 10px;
              text-transform: uppercase;
            ">PAYMENT DETAILS</div>

            <table style="
              width: 100%;
              border-collapse: collapse;
              font-size: 13px;
              border: 1px solid #7ea8d6;
              overflow: hidden;
            ">
              <thead>
                <tr style="background-color: #1A5FA4; color: #ffffff;">
                  <th style="padding: 8px 12px; text-align: left; font-weight: bold; border-right: 1px solid #7ea8d6; width: 62%;">Description</th>
                  <th style="padding: 8px 12px; text-align: left; font-weight: bold;">Amount (INR)</th>
                </tr>
              </thead>
              <tbody>
                <tr style="background-color: #f1f5fa; border-bottom: 1px solid #bed2ea;">
                  <td style="padding: 7px 12px; border-right: 1px solid #bed2ea;">Service Fee</td>
                  <td style="padding: 7px 12px;">₹ ${val.totalFee}</td>
                </tr>
                <tr style="background-color: #f1f5fa; border-bottom: 1px solid #bed2ea;">
                  <td style="padding: 7px 12px; border-right: 1px solid #bed2ea;">Tax (${val.taxPercent}%)</td>
                  <td style="padding: 7px 12px;">₹ ${val.taxAmount}</td>
                </tr>
                <tr style="background-color: #143b68; color: #ffffff; font-weight: bold; border-bottom: 1px solid #143b68;">
                  <td style="padding: 8px 12px; border-right: 1px solid #2b5484;">Total Amount</td>
                  <td style="padding: 8px 12px;">₹ ${val.totalWithTax}</td>
                </tr>
                <tr style="background-color: #f1f5fa; border-bottom: 1px solid #bed2ea;">
                  <td style="padding: 7px 12px; border-right: 1px solid #bed2ea;">Previously Paid Amount</td>
                  <td style="padding: 7px 12px;">₹ ${val.previouslyPaidAmount}</td>
                </tr>
                <tr style="background-color: #f1f5fa; border-bottom: 1px solid #bed2ea;">
                  <td style="padding: 7px 12px; border-right: 1px solid #bed2ea;">Paid Amount</td>
                  <td style="padding: 7px 12px;">₹ ${val.paidAmount}</td>
                </tr>
                <tr style="background-color: #143b68; color: #ffffff; font-weight: bold;">
                  <td style="padding: 8px 12px; border-right: 1px solid #2b5484;">Remaining Amount</td>
                  <td style="padding: 8px 12px;">₹ ${val.remainingAmount}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- DISCLAIMER BOX -->
          <div style="
            border: 1.5px solid #000000;
            padding: 9px 12px;
            text-align: center;
            font-size: 12px;
            font-weight: 500;
            margin-top: 14px;
            margin-bottom: 18px;
            background-color: #ffffff;
          ">
            You acknowledge and agree that this amount is strictly non-refundable under any circumstances.
          </div>
        </div>

        <!-- FOOTER: BANK DETAILS (LEFT) & COMPANY DETAILS CARD (RIGHT) -->
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-top: 6px;
        ">
          <!-- LEFT: BANK DETAILS & SIGNATURE -->
          <div style="flex: 1; max-width: 54%;">
            <div style="
              font-size: 12.5px;
              font-weight: bold;
              text-decoration: underline;
              text-underline-offset: 3px;
              margin-bottom: 6px;
            ">BANK DETAILS:</div>
            
            <div style="font-size: 11.5px; line-height: 1.45; color: #111111;">
              <div><strong>Bank Name:</strong> HDFC</div>
              <div><strong>Branch Address:</strong> Palayapalyam</div>
              <div><strong>Account Name:</strong> Payana Overseas Solutions Pvt Ltd</div>
              <div><strong>Account No:</strong> 50200066482470</div>
              <div><strong>IFSC Code:</strong> HDFC0009203</div>
              <div><strong>GPay:</strong> 7806925669</div>
            </div>

            <!-- AUTHORIZED SIGNATURE -->
            <div style="margin-top: 14px;">
              <div style="font-size: 12.5px; font-weight: bold; margin-bottom: 4px; color: #000000;">Authorized Signature</div>
              <div style="height: 32px; display: flex; align-items: center; margin: 3px 0;">
                <img src="${PAYANA_SIGNATURE_BASE64}" style="height: 26px; width: auto; max-width: 75px; object-fit: contain; display: block;" alt="Authorized Signature" />
              </div>
              <div style="font-size: 12px; font-weight: 500; margin-top: 4px; color: #000000;">Payana Overseas Solutions</div>
            </div>
          </div>

          <!-- RIGHT: COMPANY DETAILS CARD -->
          <div style="
            width: 270px;
            flex-shrink: 0;
            border: 2px solid #E05638;
            border-radius: 14px;
            padding: 10px 12px;
            background: #ffffff;
            box-sizing: border-box;
          ">
            <div style="
              color: #D83B20;
              font-size: 12.5px;
              font-weight: bold;
              text-align: center;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              border-bottom: 1.5px solid #E05638;
              padding-bottom: 4px;
              margin-bottom: 8px;
            ">COMPANY DETAILS</div>

            <div style="display: flex; flex-direction: column; gap: 6px;">
              <!-- Phone -->
              <div style="
                display: flex;
                align-items: center;
                gap: 8px;
                background-color: #f7f9fa;
                padding: 3px 8px;
                border-radius: 6px;
              ">
                <div style="
                  width: 20px;
                  height: 20px;
                  border-radius: 50%;
                  background: #e8f4fd;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  flex-shrink: 0;
                ">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0077c8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  </svg>
                </div>
                <span style="font-size: 11px; font-weight: 500; color: #222222;">90036 19777</span>
              </div>

              <!-- Email -->
              <div style="
                display: flex;
                align-items: center;
                gap: 8px;
                background-color: #f7f9fa;
                padding: 3px 8px;
                border-radius: 6px;
              ">
                <div style="
                  width: 20px;
                  height: 20px;
                  border-radius: 50%;
                  background: #fdeee9;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  flex-shrink: 0;
                ">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#D83B20" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                </div>
                <span style="font-size: 10.5px; font-weight: 500; color: #222222;">payanaaoverseas@gmail.com</span>
              </div>

              <!-- Website -->
              <div style="
                display: flex;
                align-items: center;
                gap: 8px;
                background-color: #f7f9fa;
                padding: 3px 8px;
                border-radius: 6px;
              ">
                <div style="
                  width: 20px;
                  height: 20px;
                  border-radius: 50%;
                  background: #eaf8ee;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  flex-shrink: 0;
                ">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                  </svg>
                </div>
                <span style="font-size: 11px; font-weight: 500; color: #222222;">www.payana.com</span>
              </div>

              <!-- Address -->
              <div style="
                display: flex;
                align-items: center;
                gap: 8px;
                background-color: #f7f9fa;
                padding: 3px 8px;
                border-radius: 6px;
              ">
                <div style="
                  width: 20px;
                  height: 20px;
                  border-radius: 50%;
                  background: #fef3c7;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  flex-shrink: 0;
                ">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                </div>
                <span style="font-size: 11px; font-weight: 500; color: #222222;">Perundurai Road, Erode</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(tempDiv);

    // Wait a brief moment for layout render
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Render HTML to high-resolution canvas
    const canvas = await html2canvas(tempDiv, {
      scale: 2.2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    document.body.removeChild(tempDiv);

    // Create single-page A4 PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 4; // 4mm margin
    const availWidth = pdfWidth - (margin * 2);
    const availHeight = pdfHeight - (margin * 2);

    let renderWidth = availWidth;
    let renderHeight = (canvas.height * renderWidth) / canvas.width;

    if (renderHeight > availHeight) {
      renderHeight = availHeight;
      renderWidth = (canvas.width * renderHeight) / canvas.height;
    }

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    const xOffset = margin + ((availWidth - renderWidth) / 2);
    const yOffset = margin;

    pdf.addImage(imgData, 'JPEG', xOffset, yOffset, renderWidth, renderHeight);
    return pdf;
  } catch (error) {
    console.error('❌ PDF generation failed:', error);
    throw error;
  }
};

/**
 * Generates and downloads the Payana invoice PDF directly.
 */
export const downloadPayanaInvoicePDF = async (invoiceData) => {
  try {
    const pdf = await generatePayanaInvoicePDF(invoiceData);
    const invoiceNum = invoiceData?.invoiceNumber || invoiceData?.invoice_number || 'PO-2026';
    const filename = `Payana-Invoice-${invoiceNum}.pdf`;
    pdf.save(filename);
    return true;
  } catch (error) {
    console.error('Error downloading invoice PDF:', error);
    return false;
  }
};

/**
 * Generates and opens a preview of the Payana invoice PDF in a new tab/window.
 */
export const previewPayanaInvoicePDF = async (invoiceData) => {
  try {
    const pdf = await generatePayanaInvoicePDF(invoiceData);
    const blob = pdf.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    const newTab = window.open(blobUrl, '_blank');
    if (newTab) {
      newTab.focus();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      return true;
    } else {
      // Fallback if popup blocked
      const invoiceNum = invoiceData?.invoiceNumber || invoiceData?.invoice_number || 'PO-2026';
      pdf.save(`Payana-Invoice-${invoiceNum}.pdf`);
      return true;
    }
  } catch (error) {
    console.error('Error previewing invoice PDF:', error);
    return false;
  }
};

export {
  generatePayanaInvoicePDF as generateInvoicePDF,
  downloadPayanaInvoicePDF as downloadInvoicePDF,
  previewPayanaInvoicePDF as previewInvoicePDF
};
