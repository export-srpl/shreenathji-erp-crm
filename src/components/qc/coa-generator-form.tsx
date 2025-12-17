'use client';

import { useActionState, useEffect, startTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { generateCoaAction } from '@/app/qc/coa-generator/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, PlusCircle, Loader2, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

type FormData = z.infer<typeof formSchema>;

const initialState = {
  message: '',
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
      Generate COA
    </Button>
  );
}

export function CoaGeneratorForm() {
  const [state, formAction] = useActionState(generateCoaAction, initialState);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productName: '',
      batchNumber: '',
      manufacturingDate: '',
      expiryDate: '',
      parameters: [{ key: 'pH', value: '' }, { key: 'Viscosity (cP)', value: '' }, { key: 'Solid Content (%)', value: '' }],
    },
    context: state,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "parameters",
  });

  useEffect(() => {
    if (state.message && !state.coaForm) {
      toast({
        variant: 'destructive',
        title: 'Error Generating COA',
        description: state.message,
      });
    }
  }, [state, toast]);
  
  const handleFormSubmit = (formData: FormData) => {
    const data = new FormData();
    data.append('productName', formData.productName);
    data.append('batchNumber', formData.batchNumber);
    data.append('manufacturingDate', formData.manufacturingDate);
    data.append('expiryDate', formData.expiryDate);
    data.append('parameters', JSON.stringify(formData.parameters));
    startTransition(() => {
      formAction(data);
    });
  };

  return (
    <div className="space-y-8">
      <form
        className="space-y-6"
        onSubmit={form.handleSubmit(handleFormSubmit)}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="productName">Product Name</Label>
            <Input id="productName" {...form.register('productName')} placeholder="e.g. Formaldehyde" />
            {form.formState.errors.productName && <p className="text-sm text-destructive mt-1">{form.formState.errors.productName.message}</p>}
          </div>
          <div>
            <Label htmlFor="batchNumber">Batch Number</Label>
            <Input id="batchNumber" {...form.register('batchNumber')} placeholder="e.g. SRPL/24/001" />
            {form.formState.errors.batchNumber && <p className="text-sm text-destructive mt-1">{form.formState.errors.batchNumber.message}</p>}
          </div>
          <div>
            <Label htmlFor="manufacturingDate">Manufacturing Date</Label>
            <Input id="manufacturingDate" type="date" {...form.register('manufacturingDate')} />
            {form.formState.errors.manufacturingDate && <p className="text-sm text-destructive mt-1">{form.formState.errors.manufacturingDate.message}</p>}
          </div>
          <div>
            <Label htmlFor="expiryDate">Expiry Date</Label>
            <Input id="expiryDate" type="date" {...form.register('expiryDate')} />
            {form.formState.errors.expiryDate && <p className="text-sm text-destructive mt-1">{form.formState.errors.expiryDate.message}</p>}
          </div>
        </div>
        
        <div>
          <Label className="block mb-2 font-medium">Test Parameters</Label>
          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-2">
                <Input
                  {...form.register(`parameters.${index}.key`)}
                  placeholder="Parameter Name"
                />
                <Input
                  {...form.register(`parameters.${index}.value`)}
                  placeholder="Value"
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
             {form.formState.errors.parameters && <p className="text-sm text-destructive mt-1">{form.formState.errors.parameters.root?.message}</p>}
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            onClick={() => append({ key: '', value: '' })}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Parameter
          </Button>
        </div>

        <div className="flex justify-end">
          <SubmitButton />
        </div>
      </form>
      
      <div>
        <Label className="block mb-2 font-medium">Generated COA</Label>
        <Card className="h-full min-h-[400px] bg-white border-black flex flex-col">
          <CardHeader>
            <CardTitle className="text-center text-xl font-bold uppercase tracking-widest text-black">Certificate of Analysis</CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex-grow">
            {state.coaForm ? (
              <Textarea
                readOnly
                value={state.coaForm}
                className="h-full min-h-[400px] bg-white font-mono text-sm resize-none text-black border-none focus-visible:ring-0"
                rows={20}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground p-8 text-center">
                The generated Certificate of Analysis will appear here once submitted.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
