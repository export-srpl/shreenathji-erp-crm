'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Copy, ExternalLink, Plus, Trash2, Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface FormField {
  label: string;
  fieldType: string;
  required?: boolean;
  placeholder?: string;
  order?: number;
}

interface LeadCaptureForm {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  isActive: boolean;
  createdAt: string;
  submissionCount?: number;
  fields: FormField[];
}

export default function LeadFormsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [forms, setForms] = useState<LeadCaptureForm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formToDelete, setFormToDelete] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const [newForm, setNewForm] = useState({
    name: '',
    description: '',
  });

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
        title: 'Failed to load forms',
        description: 'Could not fetch your lead capture forms.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateForm = async () => {
    if (!newForm.name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please enter a form name.',
      });
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch('/api/lead-capture-forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newForm),
      });

      if (!res.ok) {
        let errorMessage = 'Failed to create form';
        try {
          const error = await res.json();
          errorMessage = error.error || error.message || errorMessage;
        } catch (e) {
          // If response is not JSON, use status-based messages
          if (res.status === 401) {
            errorMessage = 'Unauthorized. Please log in again.';
          } else if (res.status === 403) {
            errorMessage = 'Access denied. You do not have permission to create forms.';
          } else if (res.status >= 500) {
            errorMessage = 'Server error. Please try again later.';
          }
        }
        throw new Error(errorMessage);
      }

      const createdForm = await res.json();
      
      // Close dialog and reset form only on success
      setCreateDialogOpen(false);
      setNewForm({ name: '', description: '' });
      
      toast({
        title: 'Form Created',
        description: 'Your lead capture form has been created successfully.',
      });
      
      // Refresh the forms list
      fetchForms();
    } catch (error) {
      console.error('Failed to create form:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to create form',
        description: error instanceof Error ? error.message : 'Please try again later.',
      });
      // Don't close dialog on error so user can retry
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteForm = async () => {
    if (!formToDelete) return;

    try {
      // Find the form to get its ID
      const form = forms.find(f => f.id === formToDelete);
      if (!form) return;

      const res = await fetch(`/api/lead-capture-forms/${form.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete form');

      toast({
        title: 'Form Deleted',
        description: 'The form has been deleted successfully.',
      });
      setDeleteDialogOpen(false);
      setFormToDelete(null);
      fetchForms();
    } catch (error) {
      console.error('Failed to delete form:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to delete form',
        description: 'Please try again later.',
      });
    }
  };

  const getFormUrl = (slug: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/lead-form/${slug}`;
    }
    return '';
  };

  const handleCopyLink = (slug: string) => {
    const url = getFormUrl(slug);
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    toast({
      title: 'Link Copied',
      description: 'Form link has been copied to clipboard.',
    });
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Lead Capture Forms</h1>
          <p className="text-muted-foreground">
            Create and manage shareable lead capture forms. Leads submitted through your forms will be automatically assigned to you.
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Form
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Lead Capture Form</DialogTitle>
              <DialogDescription>
                Create a new shareable lead capture form. The form will include all standard lead fields.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="formName">Form Name</Label>
                <Input
                  id="formName"
                  value={newForm.name}
                  onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                  placeholder="e.g. Website Contact Form"
                />
              </div>
              <div>
                <Label htmlFor="formDescription">Description (Optional)</Label>
                <Textarea
                  id="formDescription"
                  value={newForm.description}
                  onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                  placeholder="Brief description of the form"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateForm} disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Form'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {forms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No forms created yet.</p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Form
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Your Forms</CardTitle>
            <CardDescription>
              Manage your lead capture forms and share the links with potential customers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Form Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submissions</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forms.map((form) => (
                  <TableRow key={form.id}>
                    <TableCell className="font-medium">{form.name}</TableCell>
                    <TableCell>
                      <Badge variant={form.isActive ? 'default' : 'secondary'}>
                        {form.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>{form.submissionCount || 0}</TableCell>
                    <TableCell>
                      {new Date(form.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopyLink(form.slug)}
                          title="Copy form link"
                        >
                          {copiedSlug === form.slug ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(getFormUrl(form.slug), '_blank')}
                          title="Open form in new tab"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setFormToDelete(form.id);
                            setDeleteDialogOpen(true);
                          }}
                          title="Delete form"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Form?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the form and all its submissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteForm} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

