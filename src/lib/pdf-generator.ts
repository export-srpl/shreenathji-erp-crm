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
  destination?: string;
  isDomestic?: boolean;
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
    hsnCode?: string;
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
 * Ensure PDFKit's standard font metric files exist at the runtime path used in the compiled bundle.
 *
 * In the Next.js server build, PDFKit tries to load AFM files like:
 *   .next/server/chunks/data/Helvetica.afm
 *
 * On some setups these files are not present by default, which causes ENOENT errors like:
 *   ENOENT: no such file or directory, open '.next/server/chunks/data/Helvetica.afm'
 *
 * To make this robust, we copy the AFM files from node_modules/pdfkit/js/data into that
 * runtime location the first time a PDF is generated.
 */
function ensurePdfkitStandardFonts() {
  try {
    const projectRoot = process.cwd();
    const sourceDir = path.join(projectRoot, 'node_modules', 'pdfkit', 'js', 'data');
    const runtimeDir = path.join(projectRoot, '.next', 'server', 'chunks', 'data');

    // If the source directory doesn't exist, there's nothing we can do – just log and continue.
    if (!fs.existsSync(sourceDir)) {
      console.warn('[PDF] PDFKit data directory not found at', sourceDir);
      return;
    }

    // Ensure the runtime data directory exists.
    if (!fs.existsSync(runtimeDir)) {
      fs.mkdirSync(runtimeDir, { recursive: true });
    }

    const fontFiles = [
      'Helvetica.afm',
      'Helvetica-Bold.afm',
      'Helvetica-Oblique.afm',
      'Helvetica-BoldOblique.afm',
      'Times-Roman.afm',
      'Times-Bold.afm',
      'Times-Italic.afm',
      'Times-BoldItalic.afm',
      'Courier.afm',
      'Courier-Bold.afm',
      'Courier-Oblique.afm',
      'Courier-BoldOblique.afm',
      'Symbol.afm',
      'ZapfDingbats.afm',
    ];

    for (const file of fontFiles) {
      const src = path.join(sourceDir, file);
      const dest = path.join(runtimeDir, file);

      // Only copy if the source exists and destination is missing
      if (fs.existsSync(src) && !fs.existsSync(dest)) {
        try {
          fs.copyFileSync(src, dest);
          console.log('[PDF] Copied PDFKit font data file to runtime directory:', file);
        } catch (copyErr) {
          console.warn('[PDF] Failed to copy PDFKit font data file:', file, copyErr);
        }
      }
    }
  } catch (e) {
    console.error('[PDF] Failed to ensure PDFKit standard fonts are available:', e);
  }
}

/**
 * Convert a number into words (Indian numbering system for INR by default).
 * Only the integer part is converted; paise/cents are ignored for simplicity.
 */
function amountToWords(amount: number, currency: string = 'INR'): string {
  const num = Math.floor(typeof amount === 'number' && !isNaN(amount) ? amount : 0);

  if (num === 0) {
    return currency === 'INR'
      ? 'Zero Rupees Only'
      : 'Zero Only';
  }

  const belowTwenty = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const tens = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ];

  function twoDigits(n: number): string {
    if (n === 0) return '';
    if (n < 20) return belowTwenty[n];
    const t = Math.floor(n / 10);
    const r = n % 10;
    return `${tens[t]}${r ? ' ' + belowTwenty[r] : ''}`;
  }

  function threeDigits(n: number): string {
    const h = Math.floor(n / 100);
    const r = n % 100;
    const parts: string[] = [];
    if (h) parts.push(`${belowTwenty[h]} Hundred`);
    if (r) parts.push(twoDigits(r));
    return parts.join(' ');
  }

  // Indian numbering: Crore, Lakh, Thousand, Hundred, Tens
  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const hundred = Math.floor((num % 1000));

  const parts: string[] = [];
  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${threeDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigits(thousand)} Thousand`);
  if (hundred) parts.push(threeDigits(hundred));

  const words = parts.join(' ').trim();

  if (currency === 'INR') {
    return `${words} Rupees Only`;
  }
  return `${words} Only`;
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
    // Make sure the standard font metric files exist where PDFKit expects them.
    // This prevents ENOENT errors for Helvetica.afm and similar files at runtime.
    ensurePdfkitStandardFonts();

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
      const logoPath = path.join(process.cwd(), 'public', 'logo.png');

      const drawHeader = () => {
        console.log('[PDF] Drawing header');
        const headerTop = 30;
        const pageWidth = doc.page.width;
        const margin = doc.page.margins.left;

        doc.save();

        // Layout: logo on the left, company block on the right, full-width divider underneath.
        let textStartX = margin;
        const logoMaxWidth = 80;
        const logoMaxHeight = 40;
        const companyBlockTop = headerTop;

        // Logo (if available)
        try {
          if (fs.existsSync(logoPath)) {
            doc.image(logoPath, margin, headerTop, {
              fit: [logoMaxWidth, logoMaxHeight],
              align: 'left',
              valign: 'top',
            });
            textStartX = margin + logoMaxWidth + 12;
          }
        } catch (logoErr) {
          console.warn('[PDF] Failed to render logo:', logoErr);
          textStartX = margin;
        }

        const textWidth = pageWidth - textStartX - margin;

        // Company name and details
        doc.fillColor(brandColor);
        doc.font('Helvetica-Bold').fontSize(16);
        const companyName = 'SHREENATHJI RASAYAN PVT LTD';
        doc.text(companyName, textStartX, companyBlockTop, {
          width: textWidth,
          align: 'left',
        });

        doc.font('Helvetica').fontSize(8);
        const headerDetails = [
          'CIN No.: U24110GJ2006PTC049339',
          'Corporate Office: 202, Neptune Harmony, Next to Ashok Vatika BRTS Stop, Iscon–Ambali Road, Ahmedabad – 380058',
          'Mobile: +91 87358 88479',
          'Email: info@shreenathjirasayan.com',
          'An ISO 9001, 14001, 45001 & 27001 Certified Company.',
        ];
        let detailY = companyBlockTop + 14;
        headerDetails.forEach((line) => {
          doc.text(String(line ?? ''), textStartX, detailY, {
            width: textWidth,
            align: 'left',
          });
          detailY = doc.y + 1;
        });

        // Thin divider under the full header
        const dividerY = Math.max(headerTop + logoMaxHeight, detailY + 4, headerTop + 45);
        doc.moveTo(margin, dividerY)
          .lineTo(pageWidth - margin, dividerY)
          .lineWidth(0.7)
          .strokeColor(brandColor)
          .stroke();

        doc.restore();

        // Reset content Y just below header
        doc.moveDown();
        doc.y = dividerY + 10;
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
      try {
        drawHeader();
        drawFooter();
      } catch (headerError: any) {
        console.error('[PDF] Error drawing initial header/footer:', headerError);
        throw new Error(`Failed to draw header/footer: ${headerError?.message || headerError}`);
      }
      
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
      doc.text(String(data.documentType ?? 'Document'), { align: 'center' });

      // Computer-generated note near title for clarity
      doc.moveDown(0.2);
      doc.font('Helvetica-Oblique')
        .fontSize(8)
        .fillColor('#555555')
        .text(
          'This is a computer-generated document and does not require any signature or stamp.',
          { align: 'center' },
        );

      doc.fillColor('#000000').font('Helvetica').fontSize(9);

      // Meta info block (Document No/Date, PO details, Destination, Inco/Payment)
      doc.moveDown(0.5);
      doc.font('Helvetica').fontSize(9);

      const metaStartY = doc.y;
      const metaLeftX = doc.page.margins.left;
      const metaRightX = doc.page.width - doc.page.margins.right;
      const labelWidth = 90;
      const valueWidth = (metaRightX - metaLeftX - labelWidth) / 2;

      function drawMetaRow(
        leftLabel: string,
        leftValue: string,
        rightLabel?: string,
        rightValue?: string,
      ) {
        const y = doc.y;
        if (leftLabel) {
          doc.font('Helvetica-Bold').text(leftLabel, metaLeftX, y, { width: labelWidth });
          doc.font('Helvetica').text(leftValue, metaLeftX + labelWidth, y, { width: valueWidth });
        }
        if (rightLabel) {
          const rightLabelX = metaLeftX + labelWidth + valueWidth + 20;
          doc.font('Helvetica-Bold').text(rightLabel, rightLabelX, y, { width: labelWidth });
          doc.font('Helvetica').text(rightValue ?? '', rightLabelX + labelWidth, y, { width: valueWidth });
        }
        doc.moveDown(0.4);
      }

      // Document No & Date
      let issueDate: Date;
      try {
        if (data.issueDate instanceof Date) {
          issueDate = data.issueDate;
        } else if (typeof data.issueDate === 'string') {
          issueDate = new Date(data.issueDate);
        } else {
          issueDate = new Date();
        }
        if (isNaN(issueDate.getTime())) {
          issueDate = new Date();
        }
      } catch {
        issueDate = new Date();
      }
      const issueDateStr = issueDate.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });

      drawMetaRow(
        'Document No:',
        String(data.documentNumber ?? 'N/A'),
        'Document Date:',
        issueDateStr,
      );

      // PO details (not used for Quote)
      if (data.documentType !== 'Quote' && (data.poNumber || data.poDate)) {
        let poDateStr = '';
        if (data.poDate) {
          try {
            let poDate: Date;
            if (data.poDate instanceof Date) {
              poDate = data.poDate;
            } else if (typeof data.poDate === 'string') {
              poDate = new Date(data.poDate);
            } else {
              poDate = new Date();
            }
            if (!isNaN(poDate.getTime())) {
              poDateStr = poDate.toLocaleDateString('en-IN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
              });
            }
          } catch {
            // ignore invalid PO date
          }
        }

        drawMetaRow(
          'PO No:',
          String(data.poNumber ?? ''),
          'PO Date:',
          poDateStr,
        );
      }

      // Destination & Inco Terms
      if (data.destination || data.incoTerms) {
        drawMetaRow(
          'Destination:',
          String(data.destination ?? ''),
          'Inco Terms:',
          String(data.incoTerms ?? ''),
        );
      }

      // Payment Terms & Sales Person
      const salesPersonSummary = data.salesPerson?.name
        ? [
            String(data.salesPerson.name ?? ''),
            data.salesPerson.email ? `Email: ${String(data.salesPerson.email)}` : '',
            data.salesPerson.phone ? `Mobile: ${String(data.salesPerson.phone)}` : '',
          ]
            .filter(Boolean)
            .join(' | ')
        : '';

      if (data.paymentTerms || salesPersonSummary) {
        drawMetaRow(
          'Payment Terms:',
          String(data.paymentTerms ?? ''),
          salesPersonSummary ? 'Sales Person:' : '',
          salesPersonSummary,
        );
      }

      // Draw a subtle border around the meta block
      const metaEndY = doc.y;
      doc.rect(
        metaLeftX - 4,
        metaStartY - 2,
        metaRightX - metaLeftX + 8,
        metaEndY - metaStartY + 4,
      )
        .lineWidth(0.3)
        .strokeColor('#cccccc')
        .stroke();

      doc.moveDown(1.2);

      // Parties section: Our company (From) and Customer (To)
      console.log('[PDF] Writing From/To addresses');
      const margin = doc.page.margins.left;
      const colWidth = (doc.page.width - margin * 2) / 2 - 10;
      const blockTop = doc.y;
      const lineHeight = 12;

      doc.fontSize(9);
      // From (our company)
      let fromY = blockTop;
      doc.font('Helvetica-Bold').text('From', margin, fromY);
      fromY += lineHeight;
      doc.font('Helvetica').text('Shreenathji Rasayan Private Limited', margin, fromY);
      fromY += lineHeight;
      doc.text('202, Neptune Harmony, Next to Ashok Vatika BRTS Stop,', margin, fromY);
      fromY += lineHeight;
      doc.text('Iscon–Ambali Road, Ahmedabad – 380058, Gujarat, India', margin, fromY);
      fromY += lineHeight;
      doc.text('CIN No.: U24110GJ2006PTC049339', margin, fromY);
      // GST for our company can be configured via environment
      if (process.env.COMPANY_GSTIN) {
        fromY += lineHeight;
        doc.text(`GSTIN: ${String(process.env.COMPANY_GSTIN ?? '')}`, margin, fromY);
      }

      // To (customer)
      const toX = margin + colWidth + 20;
      let toY = blockTop;
      doc.font('Helvetica-Bold').text('To', toX, toY);
      toY += lineHeight;
      doc.font('Helvetica').text(String(data.customer.companyName ?? 'Customer'), toX, toY);
      if (data.customer.billingAddress) {
        const addressLines = String(data.customer.billingAddress ?? '').split('\n');
        addressLines.forEach((line) => {
          const trimmedLine = line.trim();
          if (trimmedLine) {
            toY += lineHeight;
            doc.text(String(trimmedLine), toX, toY);
          }
        });
      }
      if (data.customer.gstNo) {
        toY += lineHeight;
        doc.text(`GSTIN: ${String(data.customer.gstNo ?? '')}`, toX, toY);
      }
      
      // Update doc.y to the bottom of the addresses section
      doc.y = Math.max(fromY, toY) + lineHeight;

      doc.moveDown(2);

      // Line items table
      console.log('[PDF] Writing line items table');
      try {
        doc.fontSize(10);
        const tableTop = doc.y;
        const itemHeight = 20;
        const colWidths = {
          sl: 30,
          description: 200,
          hsn: 70,
          qty: 60,
          price: 80,
          per: 50,
          amount: 80,
        };

        const tableLeft = 40;
        const tableRight = 550;

        // Table header
        doc.font('Helvetica-Bold');
        let x = tableLeft;
        doc.text('Sl', x, tableTop, { width: colWidths.sl, align: 'center' });
        x += colWidths.sl;
        doc.text('Description of Goods', x, tableTop, { width: colWidths.description });
        x += colWidths.description;
        doc.text('HSN/SAC', x, tableTop, { width: colWidths.hsn, align: 'center' });
        x += colWidths.hsn;
        doc.text('Qty', x, tableTop, { width: colWidths.qty, align: 'right' });
        x += colWidths.qty;
        doc.text('Rate', x, tableTop, { width: colWidths.price, align: 'right' });
        x += colWidths.price;
        doc.text('Per', x, tableTop, { width: colWidths.per, align: 'center' });
        x += colWidths.per;
        doc.text('Amount', x, tableTop, { width: colWidths.amount, align: 'right' });

        // Header bottom line
        doc.moveTo(tableLeft, tableTop + 14).lineTo(tableRight, tableTop + 14).stroke();

        // Table rows
        doc.font('Helvetica');
        let currentY = tableTop + itemHeight;
        data.items.forEach((item, index) => {
          try {
            const productName = String(item.productName ?? 'Product');
            const quantity = typeof item.quantity === 'number' ? item.quantity : 0;
            const unitPrice = typeof item.unitPrice === 'number' && !isNaN(item.unitPrice) ? item.unitPrice : 0;
            const discountPct = typeof item.discountPct === 'number' && !isNaN(item.discountPct) ? item.discountPct : 0;
            const amount = typeof item.amount === 'number' && !isNaN(item.amount) ? item.amount : 0;
            const hsnCode = String(item.hsnCode ?? '');

            let rowX = tableLeft;
            doc.text(String(index + 1), rowX, currentY, { width: colWidths.sl, align: 'center' });
            rowX += colWidths.sl;
            doc.text(productName.substring(0, 80), rowX, currentY, {
              width: colWidths.description,
            });
            rowX += colWidths.description;
            doc.text(hsnCode, rowX, currentY, { width: colWidths.hsn, align: 'center' });
            rowX += colWidths.hsn;
            doc.text(String(quantity), rowX, currentY, { width: colWidths.qty, align: 'right' });
            rowX += colWidths.qty;
            doc.text(
              formatCurrency(unitPrice, data.currency),
              rowX,
              currentY,
              { width: colWidths.price, align: 'right' },
            );
            rowX += colWidths.price;
            // Business-specific default unit (Kg) – can be adjusted later if needed
            doc.text('Kg', rowX, currentY, { width: colWidths.per, align: 'center' });
            rowX += colWidths.per;
            doc.text(
              formatCurrency(amount, data.currency),
              rowX,
              currentY,
              { width: colWidths.amount, align: 'right' },
            );

            // Row bottom line
            doc.moveTo(tableLeft, currentY + itemHeight - 6).lineTo(tableRight, currentY + itemHeight - 6).stroke();

            currentY += itemHeight;
          } catch (itemError) {
            console.error(`[PDF] Error rendering line item ${index}:`, itemError, item);
            // Skip this item and continue
          }
        });

        // Vertical borders for the table
        const tableBottom = currentY - 6;
        const columnXs = [
          tableLeft,
          tableLeft + colWidths.sl,
          tableLeft + colWidths.sl + colWidths.description,
          tableLeft + colWidths.sl + colWidths.description + colWidths.hsn,
          tableLeft + colWidths.sl + colWidths.description + colWidths.hsn + colWidths.qty,
          tableLeft +
            colWidths.sl +
            colWidths.description +
            colWidths.hsn +
            colWidths.qty +
            colWidths.price,
          tableLeft +
            colWidths.sl +
            colWidths.description +
            colWidths.hsn +
            colWidths.qty +
            colWidths.price +
            colWidths.per,
          tableRight,
        ];
        columnXs.forEach((cx) => {
          doc.moveTo(cx, tableTop).lineTo(cx, tableBottom).stroke();
        });

        // Outer border
        doc.rect(tableLeft, tableTop, tableRight - tableLeft, tableBottom - tableTop).stroke();

        // Totals section
        console.log('[PDF] Writing totals section');
        doc.moveDown(2);

        const rightAlignX = 400;
        doc.text('Subtotal:', rightAlignX, doc.y, { width: 100, align: 'right' });
        doc.text(formatCurrency(data.subtotal, data.currency ?? 'INR'), 450, doc.y, {
          width: 100,
          align: 'right',
        });
        doc.moveDown();

        if (data.tax) {
          if (data.tax.sgst && data.tax.cgst) {
            doc.text('SGST (9%):', rightAlignX, doc.y, { width: 100, align: 'right' });
            doc.text(formatCurrency(data.tax.sgst ?? 0, data.currency ?? 'INR'), 450, doc.y, {
              width: 100,
              align: 'right',
            });
            doc.moveDown();
            doc.text('CGST (9%):', rightAlignX, doc.y, { width: 100, align: 'right' });
            doc.text(formatCurrency(data.tax.cgst ?? 0, data.currency ?? 'INR'), 450, doc.y, {
              width: 100,
              align: 'right',
            });
            doc.moveDown();
          } else if (data.tax.igst) {
            doc.text('IGST (18%):', rightAlignX, doc.y, { width: 100, align: 'right' });
            doc.text(formatCurrency(data.tax.igst ?? 0, data.currency ?? 'INR'), 450, doc.y, {
              width: 100,
              align: 'right',
            });
            doc.moveDown();
          }
        }

        doc.font('Helvetica-Bold').fontSize(12);
        doc.text('Total:', rightAlignX, doc.y, { width: 100, align: 'right' });
        doc.text(formatCurrency(data.total, data.currency ?? 'INR'), 450, doc.y, {
          width: 100,
          align: 'right',
        });
        doc.font('Helvetica').fontSize(10);
        doc.moveDown(1.5);

        // Amount in words
        const totalInWords = amountToWords(data.total, data.currency ?? 'INR');
        const taxTotal = data.tax?.total ?? 0;
        const taxInWords = taxTotal > 0 ? amountToWords(taxTotal, data.currency ?? 'INR') : '';

        doc.font('Helvetica-Bold').text('Amount Chargeable (in words):', {
          continued: false,
        });
        doc.font('Helvetica').text(
          `${data.currency ?? 'INR'} ${totalInWords}`,
          { indent: 20 },
        );
        doc.moveDown(0.7);

        if (taxInWords) {
          doc.font('Helvetica-Bold').text('Tax Amount (in words):', { continued: false });
          doc.font('Helvetica').text(
            `${data.currency ?? 'INR'} ${taxInWords}`,
            { indent: 20 },
          );
          doc.moveDown(1);
        }

        // Tax summary table by HSN (for domestic documents with GST)
        if (data.tax && taxTotal > 0 && data.isDomestic) {
          try {
            const effectiveTaxRate =
              data.subtotal > 0 ? taxTotal / data.subtotal : 0;
            const ratePercent = Math.round(effectiveTaxRate * 100);

            const hsnSummary: Record<
              string,
              { taxable: number; taxAmount: number }
            > = {};

            data.items.forEach((item) => {
              const key = (item.hsnCode || 'N/A').toString();
              const taxable =
                typeof item.amount === 'number' && !isNaN(item.amount)
                  ? item.amount
                  : 0;
              const taxAmount = taxable * effectiveTaxRate;

              if (!hsnSummary[key]) {
                hsnSummary[key] = { taxable: 0, taxAmount: 0 };
              }
              hsnSummary[key].taxable += taxable;
              hsnSummary[key].taxAmount += taxAmount;
            });

            doc.moveDown(0.5);
            doc.font('Helvetica-Bold').text('Tax Summary:', { continued: false });
            doc.moveDown(0.2);

            const tableLeftX = 40;
            const colHsnWidth = 120;
            const colTaxableWidth = 120;
            const colRateWidth = 80;
            const colTaxAmtWidth = 120;
            const headerY = doc.y;

            // Header row
            doc.font('Helvetica-Bold');
            doc.text('HSN/SAC', tableLeftX, headerY, {
              width: colHsnWidth,
              align: 'center',
            });
            doc.text('Taxable Value', tableLeftX + colHsnWidth, headerY, {
              width: colTaxableWidth,
              align: 'right',
            });
            doc.text('Tax Rate', tableLeftX + colHsnWidth + colTaxableWidth, headerY, {
              width: colRateWidth,
              align: 'center',
            });
            doc.text(
              'Tax Amount',
              tableLeftX + colHsnWidth + colTaxableWidth + colRateWidth,
              headerY,
              {
                width: colTaxAmtWidth,
                align: 'right',
              },
            );

            let rowY = headerY + 14;
            doc.font('Helvetica');

            Object.entries(hsnSummary).forEach(([hsn, summary]) => {
              doc.text(hsn, tableLeftX, rowY, {
                width: colHsnWidth,
                align: 'center',
              });
              doc.text(
                formatCurrency(summary.taxable, data.currency ?? 'INR'),
                tableLeftX + colHsnWidth,
                rowY,
                {
                  width: colTaxableWidth,
                  align: 'right',
                },
              );
              doc.text(
                `${ratePercent}%`,
                tableLeftX + colHsnWidth + colTaxableWidth,
                rowY,
                {
                  width: colRateWidth,
                  align: 'center',
                },
              );
              doc.text(
                formatCurrency(summary.taxAmount, data.currency ?? 'INR'),
                tableLeftX + colHsnWidth + colTaxableWidth + colRateWidth,
                rowY,
                {
                  width: colTaxAmtWidth,
                  align: 'right',
                },
              );

              // Row separator
              doc
                .moveTo(tableLeftX, rowY + 12)
                .lineTo(
                  tableLeftX +
                    colHsnWidth +
                    colTaxableWidth +
                    colRateWidth +
                    colTaxAmtWidth,
                  rowY + 12,
                )
                .stroke();

              rowY += 16;
            });

            // Outer border for tax summary table
            const tableWidth =
              colHsnWidth + colTaxableWidth + colRateWidth + colTaxAmtWidth;
            doc
              .rect(tableLeftX, headerY - 2, tableWidth, rowY - headerY + 4)
              .stroke();

            doc.moveDown(1);
          } catch (taxSummaryErr) {
            console.error('[PDF] Error rendering tax summary table:', taxSummaryErr);
          }
        }
      } catch (tableError: any) {
        console.error('[PDF] Error rendering table/totals:', tableError);
        throw new Error(`Failed to render table/totals: ${tableError?.message || tableError}`);
      }

      // Notes
      if (data.notes) {
        try {
          console.log('[PDF] Writing notes');
          doc.font('Helvetica-Bold').text('Notes:', { continued: false });
          // Ensure notes is a string and not too long
          const notesText = String(data.notes ?? '').substring(0, 2000);
          doc.font('Helvetica').text(notesText, { indent: 20 });
          doc.moveDown();
        } catch (e) {
          console.error('[PDF] Error rendering notes:', e);
          // Continue without notes if there's an error
        }
      }

      // Declaration and computer-generated note
      doc.moveDown(1);
      doc.font('Helvetica-Bold').fontSize(9).text(
        'Declaration:',
        { continued: false },
      );
      doc.font('Helvetica').text(
        'We declare that this document shows the actual price of the goods described and that all particulars are true and correct.',
        { indent: 20 },
      );
      doc.moveDown(0.8);

      doc.font('Helvetica-Oblique')
        .fontSize(8)
        .text(
          'This is a computer-generated document and does not require any signature or stamp.',
        );

      // Finalize the PDF - ensure we call end() to trigger the 'end' event
      console.log('[PDF] Finalizing PDF document');
      try {
        // Set a flag to ensure we only end once
        if (hasEnded) {
          console.warn('[PDF] Attempted to end PDF document that has already ended');
          return;
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
