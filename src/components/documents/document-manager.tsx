'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Upload, File, Download, Trash2, History, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface DocumentManagerProps {
  entityType: string;
  entityId: string;
}

const DOCUMENT_TYPES = [
  { value: 'COA', label: 'Certificate of Analysis (COA)' },
  { value: 'MSDS', label: 'Material Safety Data Sheet (MSDS)' },
  { value: 'contract', label: 'Contract' },
  { value: 'approval', label: 'Approval' },
  { value: 'regulatory', label: 'Regulatory Declaration' },
  { value: 'other', label: 'Other' },
];

export function DocumentManager({ entityType, entityId }: DocumentManagerProps) {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, [entityType, entityId]);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/documents?entityType=${entityType}&entityId=${entityId}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    try {
      const formData = new FormData(e.currentTarget);
      formData.append('file', selectedFile);
      formData.append('entityType', entityType);
      formData.append('entityId', entityId);

      const res = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        toast({
          title: 'Document uploaded',
          description: 'The document has been uploaded successfully.',
        });
        setUploadDialogOpen(false);
        setSelectedFile(null);
        fetchDocuments();
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Failed to upload document');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload document',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast({
          title: 'Document deleted',
          description: 'The document has been deleted successfully.',
        });
        fetchDocuments();
      } else {
        throw new Error('Failed to delete document');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: 'Failed to delete document',
      });
    }
  };

  const getTypeBadge = (type: string) => {
    const typeMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      COA: { label: 'COA', variant: 'default' },
      MSDS: { label: 'MSDS', variant: 'default' },
      contract: { label: 'Contract', variant: 'secondary' },
      approval: { label: 'Approval', variant: 'outline' },
      regulatory: { label: 'Regulatory', variant: 'outline' },
      other: { label: 'Other', variant: 'secondary' },
    };
    const info = typeMap[type] || { label: type, variant: 'secondary' };
    return <Badge variant={info.variant}>{info.label}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Documents</CardTitle>
            <CardDescription>Manage documents and compliance files</CardDescription>
          </div>
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleUpload}>
                <DialogHeader>
                  <DialogTitle>Upload Document</DialogTitle>
                  <DialogDescription>Upload a new document for this {entityType}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="file">File</Label>
                    <Input
                      id="file"
                      type="file"
                      onChange={handleFileSelect}
                      required
                      className="mt-1"
                    />
                    {selectedFile && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="name">Document Name</Label>
                    <Input id="name" name="name" required placeholder="e.g. Product COA 2024" />
                  </div>
                  <div>
                    <Label htmlFor="type">Document Type</Label>
                    <Select name="type" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea id="description" name="description" placeholder="Add a description..." />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setUploadDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={uploading || !selectedFile}>
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : documents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No documents uploaded yet</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded By</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">{doc.name}</TableCell>
                  <TableCell>{getTypeBadge(doc.type)}</TableCell>
                  <TableCell>{doc.fileSize ? `${(doc.fileSize / 1024).toFixed(2)} KB` : '-'}</TableCell>
                  <TableCell>{doc.uploadedBy?.name || doc.uploadedBy?.email || 'Unknown'}</TableCell>
                  <TableCell>{formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {doc.fileUrl && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(doc.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

