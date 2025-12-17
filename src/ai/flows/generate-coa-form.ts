'use server';

/**
 * @fileOverview This file defines a Genkit flow for automatically generating a COA (Certificate of Analysis) form.
 *
 * - generateCOAForm - A function that handles the generation of the COA form.
 * - GenerateCOAFormInput - The input type for the generateCOAForm function.
 * - GenerateCOAFormOutput - The return type for the generateCOAForm function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCOAFormInputSchema = z.object({
  productName: z.string().describe('The name of the product.'),
  batchNumber: z.string().describe('The batch number of the product.'),
  manufacturingDate: z.string().describe('The manufacturing date of the product.'),
  expiryDate: z.string().describe('The expiry date of the product.'),
  parameters: z
    .record(z.string(), z.string())
    .describe('A map of product parameters and their values (e.g., pH: 7.0, viscosity: 100 cP).'),
});

export type GenerateCOAFormInput = z.infer<typeof GenerateCOAFormInputSchema>;

const GenerateCOAFormOutputSchema = z.object({
  coaForm: z.string().describe('The generated COA form as a string.'),
});

export type GenerateCOAFormOutput = z.infer<typeof GenerateCOAFormOutputSchema>;

export async function generateCOAForm(input: GenerateCOAFormInput): Promise<GenerateCOAFormOutput> {
  return generateCOAFormFlow(input);
}

const generateCOAFormPrompt = ai.definePrompt({
  name: 'generateCOAFormPrompt',
  input: {schema: GenerateCOAFormInputSchema},
  output: {schema: GenerateCOAFormOutputSchema},
  prompt: `You are an expert in quality control and compliance for chemical products. Your task is to generate a Certificate of Analysis (COA) form based on the provided product parameters and determine if any standard safety disclaimers should be included.

Product Name: {{{productName}}}
Batch Number: {{{batchNumber}}}
Manufacturing Date: {{{manufacturingDate}}}
Expiry Date: {{{expiryDate}}}
Parameters: {{{parameters}}}

Based on the product parameters, determine if any of the following standard safety disclaimers are relevant:

1.  **Irritant:** May cause skin or eye irritation. Avoid contact with skin and eyes.
2.  **Flammable:** Keep away from open flames and heat sources.
3.  **Toxic:** May be harmful if swallowed or inhaled. Use with adequate ventilation.
4.  **Corrosive:** May cause severe burns. Handle with appropriate protective equipment.
5.  **Environmental Hazard:** May be harmful to aquatic life. Avoid release to the environment.

Generate a well-formatted COA form including the product information, parameters, and any relevant safety disclaimers. The COA form should be suitable for printing and distribution to clients.

Here is the COA form:
`,
});

const generateCOAFormFlow = ai.defineFlow(
  {
    name: 'generateCOAFormFlow',
    inputSchema: GenerateCOAFormInputSchema,
    outputSchema: GenerateCOAFormOutputSchema,
  },
  async input => {
    const {output} = await generateCOAFormPrompt(input);
    return output!;
  }
);
