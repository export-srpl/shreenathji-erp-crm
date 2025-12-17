import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

export interface PDFDocumentData {
  documentNumber: string;
  documentType: 'Quote' | 'Proforma Invoice' | 'Invoice';
  issueDate: Date;
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
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(20).text(data.documentType, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Document #: ${data.documentNumber}`, { align: 'center' });
    doc.text(`Date: ${new Date(data.issueDate).toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(2);

    // Company Info (left side)
    doc.fontSize(10);
    doc.text('From:', { continued: false });
    doc.font('Helvetica-Bold').text('Shreenathji ERP CRM', { indent: 20 });
    doc.font('Helvetica');
    doc.text('Your Company Address', { indent: 20 });
    doc.text('City, State, ZIP', { indent: 20 });
    doc.text('India', { indent: 20 });
    doc.moveDown();

    // Customer Info (right side)
    const customerY = doc.y - 60; // Align with company info
    doc.y = customerY;
    doc.text('To:', { align: 'right', continued: false });
    doc.font('Helvetica-Bold').text(data.customer.companyName, { align: 'right' });
    doc.font('Helvetica');
    if (data.customer.billingAddress) {
      const addressLines = data.customer.billingAddress.split('\\n');
      addressLines.forEach((line: string) => {
        doc.text(line, { align: 'right' });
      });
    }
    if (data.customer.contactName) {
      doc.text(`Contact: ${data.customer.contactName}`, { align: 'right' });
    }
    if (data.customer.contactEmail) {
      doc.text(`Email: ${data.customer.contactEmail}`, { align: 'right' });
    }
    if (data.customer.contactPhone) {
      doc.text(`Phone: ${data.customer.contactPhone}`, { align: 'right' });
    }
    if (data.customer.gstNo) {
      doc.text(`GST No: ${data.customer.gstNo}`, { align: 'right' });
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

    // Footer
    doc.fontSize(8);
    doc.text('Thank you for your business!', { align: 'center' });

    doc.end();
  });
}

function formatCurrency(amount: number, currency: string = 'INR'): string {
  if (currency === 'INR') {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

