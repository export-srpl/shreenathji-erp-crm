'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating a PDF from document data.
 *
 * - generatePdf - A function that handles the PDF generation.
 * - GeneratePdfInput - The input type for the generatePdf function.
 * - GeneratePdfOutput - The return type for the generatePdf function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GeneratePdfInputSchema = z.object({
  documentType: z.string().describe('The type of the document (e.g., Quote, Invoice).'),
  documentId: z.string().describe('The ID of the document.'),
  documentData: z.any().describe('The data of the document to be included in the PDF.'),
});

export type GeneratePdfInput = z.infer<typeof GeneratePdfInputSchema>;

const GeneratePdfOutputSchema = z.object({
  pdfBase64: z.string().describe('The generated PDF file as a Base64 encoded string.'),
});

export type GeneratePdfOutput = z.infer<typeof GeneratePdfOutputSchema>;

export async function generatePdf(input: GeneratePdfInput): Promise<GeneratePdfOutput> {
  return generatePdfFlow(input);
}

// This was previously a demo placeholder. The application now uses dedicated
// PDF generation logic in `src/lib/pdf-generator.ts` and related API routes.
// To avoid confusion with demo data, this flow simply throws until wired
// to a real implementation or removed entirely.
const generatePdfFlow = ai.defineFlow(
  {
    name: 'generatePdfFlow',
    inputSchema: GeneratePdfInputSchema,
    outputSchema: GeneratePdfOutputSchema,
  },
  async (input) => {
    throw new Error(
      `generatePdfFlow is not configured. Use the dedicated PDF APIs (quotes/proforma/invoices) backed by pdf-generator instead.`,
    );
  }
);
