'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Plus, ExternalLink, Code, Edit, Trash2, Copy } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type FormField = {
  id?: string;
  label: string;
  fieldType: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  order: number;
};

type LeadCaptureForm = {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  isActive: boolean;
  createdAt: string;
  fields: FormField[];
  _count?: {
    submissions: number;
  };
};

export default function LeadCaptureFormsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [forms, setForms] = useState<LeadCaptureForm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formToDelete, setFormToDelete] = useState<string | null>(null);
  const [embedDialogOpen, setEmbedDialogOpen] = useState(false);
  const [formToEmbed, setFormToEmbed] = useState<LeadCaptureForm | null>(null);

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/lead-capture-forms');
      if (!res.ok) throw new Error('Failed to fetch forms');
      const data = await res.json();
      setForms(data);
    } catch (error) {
      console.error('Failed to fetch forms:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load forms.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/lead-capture-forms/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete form');
      toast({
        title: 'Form deleted',
        description: 'The form has been deleted successfully.',
      });
      fetchForms();
      setDeleteDialogOpen(false);
      setFormToDelete(null);
    } catch (error) {
      console.error('Failed to delete form:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete form.',
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'Copied to clipboard.',
    });
  };

  const getEmbedCode = (form: LeadCaptureForm) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `<iframe src="${baseUrl}/forms/${form.slug}" width="100%" height="600" frameborder="0"></iframe>`;
  };

  const getFormUrl = (form: LeadCaptureForm) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/forms/${form.slug}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Loading forms...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Lead Capture Forms</h1>
          <p className="text-muted-foreground">
            Create and manage customizable lead capture forms for your website.
          </p>
        </div>
        <Button onClick={() => router.push('/sales/lead-capture-forms/builder')}>
          <Plus className="mr-2 h-4 w-4" />
          Create New Form
        </Button>
      </div>

      {forms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No forms created yet.</p>
            <Button onClick={() => router.push('/sales/lead-capture-forms/builder')}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Form
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {forms.map((form) => (
            <Card key={form.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle>{form.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {form.description || 'No description'}
                    </CardDescription>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs ${form.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {form.isActive ? 'Active' : 'Inactive'}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    <p>{form.fields.length} field(s)</p>
                    <p>{form._count?.submissions || 0} submission(s)</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFormToEmbed(form);
                        setEmbedDialogOpen(true);
                      }}
                    >
                      <Code className="mr-2 h-4 w-4" />
                      Embed
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(getFormUrl(form), '_blank')}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/sales/lead-capture-forms/builder?id=${form.id}`)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFormToDelete(form.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Form</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this form? This action cannot be undone and will also delete all submissions.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => formToDelete && handleDelete(formToDelete)}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Embed Code Dialog */}
      <Dialog open={embedDialogOpen} onOpenChange={setEmbedDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Embed Form</DialogTitle>
            <DialogDescription>
              Copy the code below to embed this form on your website.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Embed Code (iframe)</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={formToEmbed ? getEmbedCode(formToEmbed) : ''}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  onClick={() => formToEmbed && copyToClipboard(getEmbedCode(formToEmbed))}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label>Direct Link</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={formToEmbed ? getFormUrl(formToEmbed) : ''}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  onClick={() => formToEmbed && copyToClipboard(getFormUrl(formToEmbed))}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

