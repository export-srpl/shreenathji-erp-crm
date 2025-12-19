'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, GripVertical, Save, ArrowLeft } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

type FormField = {
  id?: string;
  label: string;
  fieldType: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  order: number;
};

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Select (Dropdown)' },
  { value: 'checkbox', label: 'Checkbox' },
];

function FormBuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formId = searchParams.get('id');
  const { toast } = useToast();

  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [fields, setFields] = useState<FormField[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (formId) {
      loadForm();
    } else {
      // Add a default field for new forms
      setFields([{
        label: 'Company Name',
        fieldType: 'text',
        placeholder: 'Enter company name',
        required: true,
        order: 0,
      }]);
    }
  }, [formId]);

  const loadForm = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/lead-capture-forms/${formId}`);
      if (!res.ok) throw new Error('Failed to load form');
      const form = await res.json();
      
      setFormName(form.name);
      setFormDescription(form.description || '');
      setIsActive(form.isActive);
      setFields(form.fields.map((f: any) => ({
        ...f,
        options: f.options ? JSON.parse(f.options) : undefined,
      })));
    } catch (error) {
      console.error('Failed to load form:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load form.',
      });
      router.push('/sales/lead-capture-forms');
    } finally {
      setIsLoading(false);
    }
  };

  const addField = () => {
    setFields([
      ...fields,
      {
        label: `Field ${fields.length + 1}`,
        fieldType: 'text',
        placeholder: '',
        required: false,
        order: fields.length,
      },
    ]);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index).map((f, i) => ({ ...f, order: i })));
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFields(newFields);
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === fields.length - 1) return;

    const newFields = [...fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
    newFields.forEach((f, i) => (f.order = i));
    setFields(newFields);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Form name is required.',
      });
      return;
    }

    if (fields.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'At least one field is required.',
      });
      return;
    }

    try {
      setIsSaving(true);
      const url = formId ? `/api/lead-capture-forms/${formId}` : '/api/lead-capture-forms';
      const method = formId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          description: formDescription,
          isActive,
          fields: fields.map((f, i) => ({
            ...f,
            order: i,
          })),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save form');
      }

      toast({
        title: 'Form saved',
        description: 'The form has been saved successfully.',
      });

      if (!formId) {
        const savedForm = await res.json();
        router.push(`/sales/lead-capture-forms/builder?id=${savedForm.id}`);
      }
    } catch (error: any) {
      console.error('Failed to save form:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to save form.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Loading form...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => router.push('/sales/lead-capture-forms')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">
            {formId ? 'Edit Form' : 'Create New Form'}
          </h1>
          <p className="text-muted-foreground">
            {formId ? 'Update your lead capture form.' : 'Build a customizable lead capture form.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Settings */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Form Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="formName">Form Name *</Label>
                <Input
                  id="formName"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Contact Us Form"
                />
              </div>
              <div>
                <Label htmlFor="formDescription">Description</Label>
                <Textarea
                  id="formDescription"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Describe what this form is for..."
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Active</Label>
                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
              <Button onClick={handleSave} disabled={isSaving} className="w-full">
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Form'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Form Fields Builder */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Form Fields</CardTitle>
                  <CardDescription>
                    Add and configure fields for your form.
                  </CardDescription>
                </div>
                <Button onClick={addField} variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Field
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {fields.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No fields added yet.</p>
                  <Button onClick={addField} variant="outline" className="mt-4">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Field
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <Card key={index}>
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div className="flex items-start gap-2">
                            <GripVertical className="h-5 w-5 text-muted-foreground mt-2" />
                            <div className="flex-1 space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>Field Label *</Label>
                                  <Input
                                    value={field.label}
                                    onChange={(e) => updateField(index, { label: e.target.value })}
                                    placeholder="e.g. Company Name"
                                  />
                                </div>
                                <div>
                                  <Label>Field Type *</Label>
                                  <Select
                                    value={field.fieldType}
                                    onValueChange={(value) => updateField(index, { fieldType: value })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {FIELD_TYPES.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                          {type.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div>
                                <Label>Placeholder</Label>
                                <Input
                                  value={field.placeholder || ''}
                                  onChange={(e) => updateField(index, { placeholder: e.target.value })}
                                  placeholder="Enter placeholder text"
                                />
                              </div>
                              {(field.fieldType === 'select' || field.fieldType === 'checkbox') && (
                                <div>
                                  <Label>Options (one per line)</Label>
                                  <Textarea
                                    value={field.options?.join('\n') || ''}
                                    onChange={(e) => {
                                      const options = e.target.value
                                        .split('\n')
                                        .map(o => o.trim())
                                        .filter(o => o);
                                      updateField(index, { options: options.length > 0 ? options : undefined });
                                    }}
                                    placeholder="Option 1&#10;Option 2&#10;Option 3"
                                    rows={4}
                                  />
                                </div>
                              )}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={field.required}
                                    onCheckedChange={(checked) => updateField(index, { required: checked })}
                                  />
                                  <Label>Required</Label>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => moveField(index, 'up')}
                                    disabled={index === 0}
                                  >
                                    ↑
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => moveField(index, 'down')}
                                    disabled={index === fields.length - 1}
                                  >
                                    ↓
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeField(index)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function FormBuilderPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <p>Loading...</p>
      </div>
    }>
      <FormBuilderContent />
    </Suspense>
  );
}

