import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export interface PDFDocumentData {
  documentNumber: string;
  documentType: 'Quote' | 'Proforma Invoice' | 'Invoice' | 'Sales Order';
  issueDate: Date;
  // Optional meta for richer PDFs
  paymentTerms?: string;
  incoTerms?: string;
  poNumber?: string;
  poDate?: Date;
  salesPerson?: {
    name: string;
    email?: string;
    phone?: string;
  };
  customer: {
    companyName: string;
    billingAddress?: string;
    shippingAddress?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    gstNo?: string;
  };
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    discountPct?: number;
    amount: number;
  }>;
  subtotal: number;
  tax?: {
    sgst?: number;
    cgst?: number;
    igst?: number;
    total: number;
  };
  total: number;
  notes?: string;
  currency?: string;
}

/**
 * Generate a PDF document for quotes, proforma invoices, or invoices
 */
export async function generateDocumentPDF(data: PDFDocumentData): Promise<Buffer> {
  console.log('[PDF] Starting PDF generation for:', data.documentType, data.documentNumber);
  
  // Validate required data
  if (!data.documentNumber || !data.documentType || !data.customer?.companyName) {
    const error = 'Missing required PDF data: documentNumber, documentType, or customer.companyName';
    console.error('[PDF] Validation failed:', error);
    throw new Error(error);
  }

  if (!data.items || data.items.length === 0) {
    const error = 'PDF generation requires at least one line item';
    console.error('[PDF] Validation failed:', error);
    throw new Error(error);
  }

  // Validate numeric values
  if (typeof data.subtotal !== 'number' || isNaN(data.subtotal)) {
    const error = 'Invalid subtotal value';
    console.error('[PDF] Validation failed:', error);
    throw new Error(error);
  }
  if (typeof data.total !== 'number' || isNaN(data.total)) {
    const error = 'Invalid total value';
    console.error('[PDF] Validation failed:', error);
    throw new Error(error);
  }

  return new Promise((resolve, reject) => {
    // Add timeout to prevent hanging
    const timeout = setTimeout(() => {
      console.error('[PDF] Timeout: PDF generation exceeded 30 seconds');
      reject(new Error('PDF generation timeout: exceeded 30 seconds'));
    }, 30000);

    const clearTimeoutAndResolve = (buffer: Buffer) => {
      clearTimeout(timeout);
      console.log('[PDF] Successfully generated PDF buffer:', buffer.length, 'bytes');
      resolve(buffer);
    };

    const clearTimeoutAndReject = (error: any) => {
      clearTimeout(timeout);
      console.error('[PDF] PDF generation failed:', error?.message || error);
      reject(error);
    };
    
    let doc: any = null;
    const chunks: Buffer[] = [];
    let hasEnded = false;

    try {
      console.log('[PDF] Creating PDFDocument instance');
      doc = new PDFDocument({
        margin: 60,
        size: 'A4',
        autoFirstPage: true,
      });

      // Set up event handlers BEFORE any operations
      doc.on('data', (chunk: Buffer) => {
        if (chunk && chunk.length > 0) {
          chunks.push(chunk);
        }
      });

      doc.on('end', () => {
        if (hasEnded) {
          console.warn('[PDF] End event fired multiple times');
          return;
        }
        hasEnded = true;
        try {
          if (chunks.length === 0) {
            console.error('[PDF] No chunks collected for PDF');
            clearTimeoutAndReject(new Error('Generated PDF buffer is empty - no data chunks received'));
            return;
          }
          const buffer = Buffer.concat(chunks);
          if (buffer.length === 0) {
            console.error('[PDF] Concatenated PDF buffer is empty');
            clearTimeoutAndReject(new Error('Generated PDF buffer is empty'));
            return;
          }
          console.log('[PDF] PDF generated successfully:', buffer.length, 'bytes');
          clearTimeoutAndResolve(buffer);
        } catch (e: any) {
          console.error('[PDF] Error concatenating PDF chunks:', e);
          clearTimeoutAndReject(e);
        }
      });

      doc.on('error', (err: any) => {
        console.error('[PDF] PDFDocument error event:', err);
        if (!hasEnded) {
          clearTimeoutAndReject(err);
        }
      });

      const brandColor = '#8b0304';

      const drawHeader = () => {
        console.log('[PDF] Drawing header');
        const headerTop = 30;
        const pageWidth = doc.page.width;
        const margin = doc.page.margins.left;

        doc.save();

        // Company name - centered, bold, and large (no logo)
        doc.fillColor(brandColor);
        doc.font('Helvetica-Bold').fontSize(22);
        const companyName = 'SHREENATHJI RASAYAN PVT LTD';
        doc.text(companyName, margin, headerTop, {
          width: pageWidth - margin * 2,
          align: 'center',
        });

        // Company details below the name
        doc.font('Helvetica').fontSize(8);
        const headerDetails = [
          'CIN No.: U24110GJ2006PTC049339',
          'Corporate Office: 202, Neptune Harmony, Next to Ashok Vatika BRTS Stop, Iscon–Ambali Road, Ahmedabad – 380058',
          'Mobile: +91 87358 88479',
          'Email: info@shreenathjirasayan.com',
        ];
        let detailY = headerTop + 25;
        headerDetails.forEach((line) => {
          doc.text(String(line ?? ''), margin, detailY, {
            width: pageWidth - margin * 2,
            align: 'center',
          });
          detailY = doc.y;
        });

        // Thin divider
        doc.moveTo(margin, headerTop + 55)
          .lineTo(pageWidth - margin, headerTop + 55)
          .lineWidth(0.5)
          .strokeColor(brandColor)
          .stroke();

        doc.restore();

        // Reset content Y just below header
        doc.moveDown();
        doc.y = headerTop + 65;
      };

      const drawFooter = () => {
        const margin = doc.page.margins.left;
        const pageHeight = doc.page.height;
        const footerY = pageHeight - 60;

        doc.save();
        doc.fillColor(brandColor).font('Helvetica').fontSize(8);

        const footerLines = [
          'Factory: Survey No. 1418, Village Rajpur, Ta. Kadi, Dist. Mehsana, Gujarat – 382715',
          'An ISO 9001, 14001, 45001 & 27001 Certified Company.',
        ];

        footerLines.forEach((line, idx) => {
          doc.text(String(line ?? ''), margin, footerY + idx * 10, {
            width: doc.page.width - margin * 2,
            align: 'center',
          });
        });

        doc.restore();
      };

      // Draw header/footer for first page and on every new page
      console.log('[PDF] Drawing initial header and footer');
      drawHeader();
      drawFooter();
      doc.on('pageAdded', () => {
        try {
          console.log('[PDF] New page added, drawing header/footer');
          drawHeader();
          drawFooter();
        } catch (e) {
          console.error('[PDF] Error drawing header/footer on new page:', e);
        }
      });

      // Document title & meta
      console.log('[PDF] Writing document title and meta');
      doc.moveDown();
      doc.fillColor('#000000');
      doc.font('Helvetica-Bold').fontSize(14);
      doc.text(String(data.documentType ?? 'Document'), { align: 'left' });

      doc.moveDown(0.5);
      doc.font('Helvetica').fontSize(9);
      doc.text(`Document No: ${String(data.documentNumber ?? 'N/A')}`);
      try {
        let issueDate: Date;
        if (data.issueDate instanceof Date) {
          issueDate = data.issueDate;
        } else if (typeof data.issueDate === 'string') {
          issueDate = new Date(data.issueDate);
        } else {
          issueDate = new Date();
        }
        // Validate date
        if (isNaN(issueDate.getTime())) {
          issueDate = new Date();
        }
        const dateStr = issueDate.toLocaleDateString('en-IN', { year: 'numeric', month: '2-digit', day: '2-digit' });
        doc.text(`Date: ${String(dateStr ?? '')}`);
      } catch (e) {
        console.error('[PDF] Error formatting issue date:', e);
        const dateStr = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: '2-digit', day: '2-digit' });
        doc.text(`Date: ${String(dateStr ?? '')}`);
      }

      if (data.poNumber || data.poDate) {
        const poParts: string[] = [];
        if (data.poNumber) poParts.push(`PO No: ${String(data.poNumber ?? '')}`);
        if (data.poDate) {
          try {
            let poDate: Date;
            if (data.poDate instanceof Date) {
              poDate = data.poDate;
            } else if (typeof data.poDate === 'string') {
              poDate = new Date(data.poDate);
            } else {
              throw new Error('Invalid PO date type');
            }
            // Validate date
            if (!isNaN(poDate.getTime())) {
              const poDateStr = poDate.toLocaleDateString('en-IN', { year: 'numeric', month: '2-digit', day: '2-digit' });
              poParts.push(`PO Date: ${String(poDateStr ?? '')}`);
            }
          } catch (e) {
            console.error('[PDF] Error formatting PO date:', e);
            // Skip PO date if invalid
          }
        }
        if (poParts.length > 0) {
          doc.text(poParts.join(' | '));
        }
      }

      if (data.paymentTerms || data.incoTerms) {
        const metaParts: string[] = [];
        if (data.incoTerms) metaParts.push(`Inco Terms: ${String(data.incoTerms ?? '')}`);
        if (data.paymentTerms) metaParts.push(`Payment Terms: ${String(data.paymentTerms ?? '')}`);
        if (metaParts.length > 0) {
          doc.text(metaParts.join(' | '));
        }
      }

      if (data.salesPerson?.name) {
        const spParts: string[] = [`Sales Person: ${String(data.salesPerson.name ?? '')}`];
        if (data.salesPerson.email) spParts.push(`Email: ${String(data.salesPerson.email ?? '')}`);
        if (data.salesPerson.phone) spParts.push(`Mobile: ${String(data.salesPerson.phone ?? '')}`);
        if (spParts.length > 0) {
          doc.text(spParts.join(' | '));
        }
      }

      doc.moveDown(1.5);

      // Parties section: Our company (From) and Customer (To)
      console.log('[PDF] Writing From/To addresses');
      const margin = doc.page.margins.left;
      const colWidth = (doc.page.width - margin * 2) / 2 - 10;
      const blockTop = doc.y;

      doc.fontSize(9);
      // From (our company)
      let fromY = blockTop;
      doc.font('Helvetica-Bold').text('From', margin, fromY);
      doc.font('Helvetica');
      fromY = doc.y;
      doc.text('Shreenathji Rasayan Private Limited', margin, fromY);
      fromY = doc.y;
      doc.text('202, Neptune Harmony, Next to Ashok Vatika BRTS Stop,', margin, fromY);
      fromY = doc.y;
      doc.text('Iscon–Ambali Road, Ahmedabad – 380058, Gujarat, India', margin, fromY);
      fromY = doc.y;
      doc.text('CIN No.: U24110GJ2006PTC049339', margin, fromY);
      // GST for our company can be configured via environment
      if (process.env.COMPANY_GSTIN) {
        fromY = doc.y;
        doc.text(`GSTIN: ${String(process.env.COMPANY_GSTIN ?? '')}`, margin, fromY);
      }

      // To (customer)
      const toX = margin + colWidth + 20;
      let toY = blockTop;
      doc.font('Helvetica-Bold').text('To', toX, toY);
      doc.font('Helvetica');
      toY = doc.y;
      doc.text(String(data.customer.companyName ?? 'Customer'), toX, toY);
      if (data.customer.billingAddress) {
        const addressLines = String(data.customer.billingAddress ?? '').split('\n');
        addressLines.forEach((line) => {
          const trimmedLine = line.trim();
          if (trimmedLine) {
            toY = doc.y;
            doc.text(String(trimmedLine), toX, toY);
          }
        });
      }
      if (data.customer.gstNo) {
        toY = doc.y;
        doc.text(`GSTIN: ${String(data.customer.gstNo ?? '')}`, toX, toY);
      }

      doc.moveDown(2);

      // Line items table
      console.log('[PDF] Writing line items table');
      doc.fontSize(10);
      const tableTop = doc.y;
      const itemHeight = 20;
      const colWidths = {
        description: 200,
        qty: 60,
        price: 80,
        discount: 60,
        amount: 100,
      };

      // Table header
      doc.font('Helvetica-Bold');
      doc.text('Description', 50, tableTop);
      doc.text('Qty', 50 + colWidths.description, tableTop);
      doc.text('Unit Price', 50 + colWidths.description + colWidths.qty, tableTop);
      doc.text('Discount', 50 + colWidths.description + colWidths.qty + colWidths.price, tableTop);
      doc.text('Amount', 50 + colWidths.description + colWidths.qty + colWidths.price + colWidths.discount, tableTop);
      
      // Draw header line
      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
      doc.moveDown();

      // Table rows
      doc.font('Helvetica');
      let currentY = tableTop + 25;
      data.items.forEach((item, index) => {
        try {
          const productName = String(item.productName ?? 'Product');
          const quantity = typeof item.quantity === 'number' ? item.quantity : 0;
          const unitPrice = typeof item.unitPrice === 'number' && !isNaN(item.unitPrice) ? item.unitPrice : 0;
          const discountPct = typeof item.discountPct === 'number' && !isNaN(item.discountPct) ? item.discountPct : 0;
          const amount = typeof item.amount === 'number' && !isNaN(item.amount) ? item.amount : 0;
          
          doc.text(productName.substring(0, 50), 50, currentY, { width: colWidths.description });
          doc.text(String(quantity), 50 + colWidths.description, currentY, { width: colWidths.qty });
          doc.text(formatCurrency(unitPrice, data.currency), 50 + colWidths.description + colWidths.qty, currentY, { width: colWidths.price });
          doc.text(`${discountPct}%`, 50 + colWidths.description + colWidths.qty + colWidths.price, currentY, { width: colWidths.discount });
          doc.text(formatCurrency(amount, data.currency), 50 + colWidths.description + colWidths.qty + colWidths.price + colWidths.discount, currentY, { width: colWidths.amount });
          currentY += itemHeight;
        } catch (itemError) {
          console.error(`[PDF] Error rendering line item ${index}:`, itemError, item);
          // Skip this item and continue
        }
      });

      // Totals section
      console.log('[PDF] Writing totals section');
      const totalsY = currentY + 20;
      doc.moveTo(50, totalsY).lineTo(550, totalsY).stroke();
      doc.moveDown(2);

      const rightAlignX = 400;
      doc.text('Subtotal:', rightAlignX, doc.y, { width: 100, align: 'right' });
      doc.text(formatCurrency(data.subtotal, data.currency ?? 'INR'), 450, doc.y, { width: 100, align: 'right' });
      doc.moveDown();

      if (data.tax) {
        if (data.tax.sgst && data.tax.cgst) {
          doc.text('SGST (9%):', rightAlignX, doc.y, { width: 100, align: 'right' });
          doc.text(formatCurrency(data.tax.sgst ?? 0, data.currency ?? 'INR'), 450, doc.y, { width: 100, align: 'right' });
          doc.moveDown();
          doc.text('CGST (9%):', rightAlignX, doc.y, { width: 100, align: 'right' });
          doc.text(formatCurrency(data.tax.cgst ?? 0, data.currency ?? 'INR'), 450, doc.y, { width: 100, align: 'right' });
          doc.moveDown();
        } else if (data.tax.igst) {
          doc.text('IGST (18%):', rightAlignX, doc.y, { width: 100, align: 'right' });
          doc.text(formatCurrency(data.tax.igst ?? 0, data.currency ?? 'INR'), 450, doc.y, { width: 100, align: 'right' });
          doc.moveDown();
        }
      }

      doc.font('Helvetica-Bold').fontSize(12);
      doc.text('Total:', rightAlignX, doc.y, { width: 100, align: 'right' });
      doc.text(formatCurrency(data.total, data.currency ?? 'INR'), 450, doc.y, { width: 100, align: 'right' });
      doc.font('Helvetica').fontSize(10);
      doc.moveDown(2);

      // Notes
      if (data.notes) {
        try {
          console.log('[PDF] Writing notes');
          doc.text('Notes:', { continued: false });
          // Ensure notes is a string and not too long
          const notesText = String(data.notes ?? '').substring(0, 2000);
          doc.text(notesText, { indent: 20 });
          doc.moveDown();
        } catch (e) {
          console.error('[PDF] Error rendering notes:', e);
          // Continue without notes if there's an error
        }
      }

      // Finalize the PDF - ensure we call end() to trigger the 'end' event
      console.log('[PDF] Finalizing PDF document');
      try {
        // Set a flag to ensure we only end once
        if (hasEnded) {
          console.warn('[PDF] Attempted to end PDF document that has already ended');
          return;
        }
        
        // Ensure all content is flushed before ending
        if (doc && typeof doc.flush === 'function') {
          try {
            doc.flush();
          } catch (flushError) {
            console.warn('[PDF] Error flushing PDF document (non-critical):', flushError);
          }
        }
        
        // End the document - this will trigger the 'end' event
        doc.end();
        console.log('[PDF] PDF document ended, waiting for end event');
        
        // Note: The 'end' event will be fired asynchronously by pdfkit
        // We don't need to wait for it here - the event handler will resolve the promise
        // However, if the event doesn't fire within a reasonable time, the timeout will catch it
      } catch (endError: any) {
        console.error('[PDF] Error ending PDF document:', endError);
        if (!hasEnded) {
          clearTimeoutAndReject(endError);
        }
        return;
      }
    } catch (error: any) {
      console.error('[PDF] Error during PDF generation:', {
        error: error?.message || error,
        stack: error?.stack,
        documentType: data.documentType,
        documentNumber: data.documentNumber,
      });
      // Ensure document is ended if it was created and hasn't ended yet
      if (doc && !hasEnded) {
        try {
          doc.end();
        } catch (e) {
          console.error('[PDF] Error ending PDF document in catch block:', e);
          // Ignore errors when ending after an error
        }
      }
      clearTimeoutAndReject(error);
    }
  });
}

function formatCurrency(amount: number, currency: string = 'INR'): string {
  // Validate and sanitize amount
  const numAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  
  try {
    if (currency === 'INR') {
      return `₹${numAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `${currency} ${numAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } catch (e) {
    // Fallback if locale formatting fails
    return `${currency} ${numAmount.toFixed(2)}`;
  }
}
