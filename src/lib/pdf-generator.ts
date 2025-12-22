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
  // Validate required data
  if (!data.documentNumber || !data.documentType || !data.customer?.companyName) {
    throw new Error('Missing required PDF data: documentNumber, documentType, or customer.companyName');
  }

  if (!data.items || data.items.length === 0) {
    throw new Error('PDF generation requires at least one line item');
  }

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 60,
        size: 'A4',
      });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => {
        console.error('PDFDocument error event:', err);
        reject(err);
      });

    const brandColor = '#8b0304';

    const drawHeader = () => {
      const headerTop = 30;
      const pageWidth = doc.page.width;
      const margin = doc.page.margins.left;

      doc.save();

      // Logo on the left – expects logo file to exist in /public
      try {
        const logoPath = path.join(process.cwd(), 'public', 'shreenathji-logo.png');
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, margin, headerTop, { height: 40 });
        }
      } catch (e) {
        console.error('PDF header logo error:', e);
      }

      // Company info to the right of logo
      const headerX = margin + 120;
      doc.fillColor(brandColor);
      doc.font('Helvetica-Bold').fontSize(16);
      doc.text('SHREENATHJI RASAYAN PRIVATE LIMITED', headerX, headerTop, {
        width: pageWidth - headerX - margin,
        align: 'left',
      });

      doc.font('Helvetica').fontSize(8);
      const headerDetails = [
        'CIN No.: U24110GJ2006PTC049339',
        'Corporate Office: 202, Neptune Harmony, Next to Ashok Vatika BRTS Stop, Iscon–Ambali Road, Ahmedabad – 380058',
        'Mobile: +91 87358 88479',
        'Email: info@shreenathjirasayan.com',
      ];
      headerDetails.forEach((line) => {
        doc.text(line, headerX, doc.y + 2, {
          width: pageWidth - headerX - margin,
        });
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
        doc.text(line, margin, footerY + idx * 10, {
          width: doc.page.width - margin * 2,
          align: 'center',
        });
      });

      doc.restore();
    };

    // Draw header/footer for first page and on every new page
    drawHeader();
    drawFooter();
    doc.on('pageAdded', () => {
      drawHeader();
      drawFooter();
    });

    // Document title & meta
    doc.moveDown();
    doc.fillColor('#000000');
    doc.font('Helvetica-Bold').fontSize(14);
    doc.text(data.documentType, { align: 'left' });

    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(9);
    doc.text(`Document No: ${data.documentNumber}`);
    doc.text(`Date: ${new Date(data.issueDate).toLocaleDateString('en-IN')}`);

    if (data.poNumber || data.poDate) {
      const poParts = [];
      if (data.poNumber) poParts.push(`PO No: ${data.poNumber}`);
      if (data.poDate) poParts.push(`PO Date: ${new Date(data.poDate).toLocaleDateString('en-IN')}`);
      doc.text(poParts.join(' | '));
    }

    if (data.paymentTerms || data.incoTerms) {
      const metaParts = [];
      if (data.incoTerms) metaParts.push(`Inco Terms: ${data.incoTerms}`);
      if (data.paymentTerms) metaParts.push(`Payment Terms: ${data.paymentTerms}`);
      doc.text(metaParts.join(' | '));
    }

    if (data.salesPerson?.name) {
      const spParts = [`Sales Person: ${data.salesPerson.name}`];
      if (data.salesPerson.email) spParts.push(`Email: ${data.salesPerson.email}`);
      if (data.salesPerson.phone) spParts.push(`Mobile: ${data.salesPerson.phone}`);
      doc.text(spParts.join(' | '));
    }

    doc.moveDown(1.5);

    // Parties section: Our company (From) and Customer (To)
    const margin = doc.page.margins.left;
    const colWidth = (doc.page.width - margin * 2) / 2 - 10;
    const blockTop = doc.y;

    doc.fontSize(9);
    // From (our company)
    doc.font('Helvetica-Bold').text('From', margin, blockTop);
    doc.font('Helvetica');
    doc.text('Shreenathji Rasayan Private Limited', margin, doc.y);
    doc.text('202, Neptune Harmony, Next to Ashok Vatika BRTS Stop,', margin, doc.y);
    doc.text('Iscon–Ambali Road, Ahmedabad – 380058, Gujarat, India', margin, doc.y);
    doc.text('CIN No.: U24110GJ2006PTC049339', margin, doc.y);
    // GST for our company can be configured via environment
    if (process.env.COMPANY_GSTIN) {
      doc.text(`GSTIN: ${process.env.COMPANY_GSTIN}`, margin, doc.y);
    }

    // To (customer)
    const toX = margin + colWidth + 20;
    doc.y = blockTop;
    doc.font('Helvetica-Bold').text('To', toX, blockTop);
    doc.font('Helvetica');
    doc.text(data.customer.companyName, toX, doc.y);
    if (data.customer.billingAddress) {
      data.customer.billingAddress.split('\n').forEach((line) => {
        doc.text(line, toX, doc.y);
      });
    }
    if (data.customer.gstNo) {
      doc.text(`GSTIN: ${data.customer.gstNo}`, toX, doc.y);
    }

    doc.moveDown(2);

    // Line items table
    doc.fontSize(10);
    const tableTop = doc.y;
    const itemHeight = 20;
    const tableWidth = 500;
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
    data.items.forEach((item) => {
      doc.text(item.productName || 'Product', 50, currentY, { width: colWidths.description });
      doc.text(String(item.quantity), 50 + colWidths.description, currentY, { width: colWidths.qty });
      doc.text(formatCurrency(item.unitPrice, data.currency), 50 + colWidths.description + colWidths.qty, currentY, { width: colWidths.price });
      doc.text(`${item.discountPct || 0}%`, 50 + colWidths.description + colWidths.qty + colWidths.price, currentY, { width: colWidths.discount });
      doc.text(formatCurrency(item.amount, data.currency), 50 + colWidths.description + colWidths.qty + colWidths.price + colWidths.discount, currentY, { width: colWidths.amount });
      currentY += itemHeight;
    });

    // Totals section
    const totalsY = currentY + 20;
    doc.moveTo(50, totalsY).lineTo(550, totalsY).stroke();
    doc.moveDown(2);

    const rightAlignX = 400;
    doc.text('Subtotal:', rightAlignX, doc.y, { width: 100, align: 'right' });
    doc.text(formatCurrency(data.subtotal, data.currency), 450, doc.y, { width: 100, align: 'right' });
    doc.moveDown();

    if (data.tax) {
      if (data.tax.sgst && data.tax.cgst) {
        doc.text('SGST (9%):', rightAlignX, doc.y, { width: 100, align: 'right' });
        doc.text(formatCurrency(data.tax.sgst, data.currency), 450, doc.y, { width: 100, align: 'right' });
        doc.moveDown();
        doc.text('CGST (9%):', rightAlignX, doc.y, { width: 100, align: 'right' });
        doc.text(formatCurrency(data.tax.cgst, data.currency), 450, doc.y, { width: 100, align: 'right' });
        doc.moveDown();
      } else if (data.tax.igst) {
        doc.text('IGST (18%):', rightAlignX, doc.y, { width: 100, align: 'right' });
        doc.text(formatCurrency(data.tax.igst, data.currency), 450, doc.y, { width: 100, align: 'right' });
        doc.moveDown();
      }
    }

    doc.font('Helvetica-Bold').fontSize(12);
    doc.text('Total:', rightAlignX, doc.y, { width: 100, align: 'right' });
    doc.text(formatCurrency(data.total, data.currency), 450, doc.y, { width: 100, align: 'right' });
    doc.font('Helvetica').fontSize(10);
    doc.moveDown(2);

    // Notes
    if (data.notes) {
      doc.text('Notes:', { continued: false });
      doc.text(data.notes, { indent: 20 });
      doc.moveDown();
    }

      doc.end();
    } catch (error) {
      console.error('Error during PDF generation:', error);
      reject(error);
    }
  });
}

function formatCurrency(amount: number, currency: string = 'INR'): string {
  if (currency === 'INR') {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

