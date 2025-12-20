'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FormField {
  id: string;
  label: string;
  fieldType: string;
  required: boolean;
  placeholder: string | null;
  order: number;
}

interface FormData {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  fields: FormField[];
  createdBy: {
    id: string;
    name: string | null;
  };
}

export default function PublicLeadFormPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { toast } = useToast();

  const [form, setForm] = useState<FormData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [customerType, setCustomerType] = useState<'domestic' | 'international' | ''>('');

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const res = await fetch(`/api/lead-capture-forms/${slug}`);
        if (!res.ok) {
          throw new Error('Form not found');
        }
        const data = await res.json();
        setForm(data);
        
        // Initialize form data
        const initialData: Record<string, string> = {};
        data.fields.forEach((field: FormField) => {
          initialData[field.label] = '';
        });
        setFormData(initialData);
      } catch (error) {
        console.error('Failed to load form:', error);
        toast({
          variant: 'destructive',
          title: 'Form Not Found',
          description: 'The form you are looking for does not exist or has been deactivated.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (slug) {
      fetchForm();
    }
  }, [slug, toast]);

  const handleFieldChange = (label: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [label]: value,
    }));

    // Handle country change - show/hide GST and set customer type
    if (label === 'Country' || label === 'country') {
      setSelectedCountry(value);
      if (value.trim().toLowerCase() === 'india') {
        setCustomerType('domestic');
        // Keep GST field visible (it will be shown conditionally)
      } else if (value.trim() !== '') {
        setCustomerType('international');
        // Clear GST field when switching to international
        setFormData(prev => ({
          ...prev,
          'GST Number': '',
          'gstNo': '',
        }));
      } else {
        setCustomerType('');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form) return;

    // Validate required fields (exclude GST if country is not India)
    const missingFields = form.fields
      .filter(field => {
        const isGSTField = field.label.toLowerCase().includes('gst') || field.label.toLowerCase() === 'gst number';
        if (isGSTField && selectedCountry.toLowerCase() !== 'india') {
          return false; // Skip GST validation for non-India
        }
        return field.required && !formData[field.label]?.trim();
      })
      .map(field => field.label);

    if (missingFields.length > 0) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: `Please fill in required fields: ${missingFields.join(', ')}`,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Add customer type to form data
      const submissionData = {
        ...formData,
        customerType: customerType || (selectedCountry.toLowerCase() === 'india' ? 'domestic' : 'international'),
      };

      const res = await fetch(`/api/lead-capture-forms/${slug}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: submissionData }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Failed to submit form');
      }

      setIsSubmitted(true);
      toast({
        title: 'Form Submitted Successfully',
        description: 'Thank you for your interest! We will contact you soon.',
      });
    } catch (error) {
      console.error('Failed to submit form:', error);
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: error instanceof Error ? error.message : 'Please try again later.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: FormField) => {
    // Hide GST field if country is not India
    const isGSTField = field.label.toLowerCase().includes('gst') || field.label.toLowerCase() === 'gst number';
    if (isGSTField && selectedCountry.toLowerCase() !== 'india' && selectedCountry !== '') {
      return null;
    }

    const value = formData[field.label] || '';
    const commonProps = {
      id: field.id,
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        handleFieldChange(field.label, e.target.value),
      placeholder: field.placeholder || '',
      required: field.required && !(isGSTField && selectedCountry.toLowerCase() !== 'india'),
      className: 'mt-1',
    };

    switch (field.fieldType) {
      case 'textarea':
        return (
          <Textarea
            {...commonProps}
            rows={4}
          />
        );
      case 'email':
        return (
          <Input
            {...commonProps}
            type="email"
          />
        );
      case 'phone':
        return (
          <Input
            {...commonProps}
            type="tel"
          />
        );
      default:
        return (
          <Input
            {...commonProps}
            type="text"
          />
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Loading form...</p>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Form not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
            <p className="text-muted-foreground mb-4">
              Your form has been submitted successfully. We will contact you soon.
            </p>
            {form.createdBy.name && (
              <p className="text-sm text-muted-foreground">
                Submitted to: {form.createdBy.name}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>{form.name}</CardTitle>
            {form.description && (
              <CardDescription>{form.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {form.fields.map((field) => (
                <div key={field.id}>
                  <Label htmlFor={field.id}>
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  {renderField(field)}
                </div>
              ))}

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isSubmitting} size="lg">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

