'use server';

import { generateCOAForm, GenerateCOAFormInput, GenerateCOAFormOutput } from '@/ai/flows/generate-coa-form';
import { z } from 'zod';

const formSchema = z.object({
  productName: z.string().min(1, 'Product name is required.'),
  batchNumber: z.string().min(1, 'Batch number is required.'),
  manufacturingDate: z.string().min(1, 'Manufacturing date is required.'),
  expiryDate: z.string().min(1, 'Expiry date is required.'),
  parameters: z.array(z.object({
    key: z.string().min(1, 'Parameter name is required.'),
    value: z.string().min(1, 'Parameter value is required.'),
  })).min(1, 'At least one parameter is required.'),
});

type FormState = {
  message: string;
  coaForm?: string;
  errors?: {
    [key: string]: string[] | undefined;
  };
};

export async function generateCoaAction(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const validatedFields = formSchema.safeParse({
    productName: formData.get('productName'),
    batchNumber: formData.get('batchNumber'),
    manufacturingDate: formData.get('manufacturingDate'),
    expiryDate: formData.get('expiryDate'),
    parameters: JSON.parse(formData.get('parameters') as string || '[]'),
  });

  if (!validatedFields.success) {
    return {
      message: 'Validation failed. Please check the fields.',
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  const { productName, batchNumber, manufacturingDate, expiryDate, parameters } = validatedFields.data;

  try {
    const parametersObject = parameters.reduce((acc, { key, value }) => {
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    const input: GenerateCOAFormInput = {
      productName,
      batchNumber,
      manufacturingDate,
      expiryDate,
      parameters: parametersObject,
    };

    const result: GenerateCOAFormOutput = await generateCOAForm(input);

    return {
      message: 'COA generated successfully.',
      coaForm: result.coaForm,
    };
  } catch (error) {
    console.error(error);
    return {
      message: 'An unexpected error occurred while generating the COA.',
    };
  }
}
