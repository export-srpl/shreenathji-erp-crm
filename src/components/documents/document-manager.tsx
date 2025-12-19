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
import { Loader2, Upload, File, Download, Trash2, History, Plus, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface DocumentManagerProps {
  entityType: string;
  entityId: string;
}

const DOCUMENT_TYPES = [
  { value: 'COA', label: 'Certificate of Analysis (COA)', requiresProduct: true },
  { value: 'TDS', label: 'Technical Data Sheet (TDS)', requiresProduct: true },
  { value: 'MSDS', label: 'Material Safety Data Sheet (MSDS)', requiresProduct: true },
  { value: 'contract', label: 'Contract', requiresCustomer: true },
  { value: 'approval', label: 'Approval' },
  { value: 'regulatory', label: 'Regulatory Declaration' },
];

export function DocumentManager({ entityType, entityId, productId: initialProductId, customerId: initialCustomerId }: DocumentManagerProps) {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>(initialProductId || '');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(initialCustomerId || '');
  const [products, setProducts] = useState<Array<{ id: string; name: string; srplId?: string | null }>>([]);
  const [customers, setCustomers] = useState<Array<{ id: string; companyName: string; srplId?: string | null }>>([]);

  useEffect(() => {
    fetchDocuments();
  }, [entityType, entityId, initialProductId, initialCustomerId]);

  // Fetch products and customers for selection
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch products
        const productsRes = await fetch('/api/products');
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          setProducts(productsData.slice(0, 100)); // Limit to first 100 for performance
        }

        // Fetch customers
        const customersRes = await fetch('/api/customers');
        if (customersRes.ok) {
          const customersData = await customersRes.json();
          setCustomers(customersData.slice(0, 100)); // Limit to first 100 for performance
        }
      } catch (error) {
        console.error('Failed to fetch products/customers:', error);
      }
    };

    if (uploadDialogOpen) {
      fetchData();
    }
  }, [uploadDialogOpen]);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      // If we have productId or customerId, use the specific endpoints
      let url = `/api/documents?entityType=${entityType}&entityId=${entityId}`;
      if (initialProductId) {
        url = `/api/documents/by-product/${initialProductId}`;
      } else if (initialCustomerId) {
        url = `/api/documents/by-customer/${initialCustomerId}`;
      }

      const res = await fetch(url);
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

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff'];
    if (!allowedTypes.includes(selectedFile.type)) {
      toast({
        variant: 'destructive',
        title: 'Invalid file type',
        description: 'Only PDF and image files (JPG, PNG, GIF, WEBP, BMP, TIFF) are allowed.',
      });
      return;
    }

    // Validate file size (10 MB max)
    const maxSize = 10 * 1024 * 1024; // 10 MB
    if (selectedFile.size > maxSize) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: `File size ${(selectedFile.size / 1024 / 1024).toFixed(2)} MB exceeds maximum allowed size of 10 MB`,
      });
      return;
    }

    // Validate document type requirements
    const selectedType = DOCUMENT_TYPES.find((t) => t.value === selectedDocumentType);
    if (selectedType?.requiresProduct && !selectedProductId) {
      toast({
        variant: 'destructive',
        title: 'Product required',
        description: `Please select a product for ${selectedType.label}`,
      });
      return;
    }

    if (selectedType?.requiresCustomer && !selectedCustomerId) {
      toast({
        variant: 'destructive',
        title: 'Customer required',
        description: `Please select a customer for ${selectedType.label}`,
      });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData(e.currentTarget);
      formData.append('file', selectedFile);
      formData.append('entityType', entityType);
      formData.append('entityId', entityId);
      if (selectedProductId) formData.append('productId', selectedProductId);
      if (selectedCustomerId) formData.append('customerId', selectedCustomerId);

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
        setSelectedDocumentType('');
        setSelectedProductId(initialProductId || '');
        setSelectedCustomerId(initialCustomerId || '');
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
      TDS: { label: 'TDS', variant: 'default' },
      MSDS: { label: 'MSDS', variant: 'default' },
      contract: { label: 'Contract', variant: 'secondary' },
      approval: { label: 'Approval', variant: 'outline' },
      regulatory: { label: 'Regulatory', variant: 'outline' },
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
                    <Label htmlFor="file">File * (PDF, JPG, PNG, GIF, WEBP, BMP, TIFF - Max 10 MB)</Label>
                    <Input
                      id="file"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff"
                      onChange={handleFileSelect}
                      required
                      className="mt-1"
                    />
                    {selectedFile && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                        {selectedFile.size > 10 * 1024 * 1024 && (
                          <span className="text-destructive ml-2">⚠ File exceeds 10 MB limit</span>
                        )}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="name">Document Name</Label>
                    <Input id="name" name="name" required placeholder="e.g. Product COA 2024" />
                  </div>
                  <div>
                    <Label htmlFor="type">Document Type *</Label>
                    <Select
                      name="type"
                      required
                      value={selectedDocumentType}
                      onValueChange={(value) => {
                        setSelectedDocumentType(value);
                        // Reset selections when type changes
                        if (!DOCUMENT_TYPES.find((t) => t.value === value)?.requiresProduct) {
                          setSelectedProductId('');
                        }
                        if (!DOCUMENT_TYPES.find((t) => t.value === value)?.requiresCustomer) {
                          setSelectedCustomerId('');
                        }
                      }}
                    >
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

                  {/* Product selection for COA, TDS, MSDS */}
                  {DOCUMENT_TYPES.find((t) => t.value === selectedDocumentType)?.requiresProduct && (
                    <div>
                      <Label htmlFor="productId">Product *</Label>
                      <Select
                        name="productId"
                        required
                        value={selectedProductId}
                        onValueChange={setSelectedProductId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} {product.srplId && `(${product.srplId})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        This document will be linked to the selected product and visible in the product record
                      </p>
                    </div>
                  )}

                  {/* Customer selection for Contract */}
                  {DOCUMENT_TYPES.find((t) => t.value === selectedDocumentType)?.requiresCustomer && (
                    <div>
                      <Label htmlFor="customerId">Customer *</Label>
                      <Select
                        name="customerId"
                        required
                        value={selectedCustomerId}
                        onValueChange={setSelectedCustomerId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.companyName} {customer.srplId && `(${customer.srplId})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        This contract will be linked to the selected customer and visible in the customer profile
                      </p>
                    </div>
                  )}

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
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{doc.name}</span>
                      {doc.isScanned && (
                        <span className="flex items-center gap-1 text-xs">
                          {doc.scanResult === 'clean' ? (
                            <CheckCircle2 className="h-3 w-3 text-green-600" title="Virus scan: Clean" />
                          ) : doc.scanResult === 'infected' ? (
                            <AlertTriangle className="h-3 w-3 text-red-600" title="Virus scan: Infected" />
                          ) : null}
                        </span>
                      )}
                    </div>
                    {doc.product && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Product: {doc.product.name} {doc.product.srplId && `(${doc.product.srplId})`}
                      </div>
                    )}
                    {doc.customer && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Customer: {doc.customer.companyName} {doc.customer.srplId && `(${doc.customer.srplId})`}
                      </div>
                    )}
                  </TableCell>
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

