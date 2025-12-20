'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Loader2, Upload, File, Download, Trash2, History, Plus, CheckCircle2, AlertTriangle, Check, ChevronsUpDown, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface DocumentManagerProps {
  entityType: string;
  entityId: string;
  productId?: string;
  customerId?: string;
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>(initialProductId || '');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(initialCustomerId || '');
  const [products, setProducts] = useState<Array<{ id: string; name: string }>>([]);
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
          // Map to ensure correct structure: { id, name }
          const mappedProducts = productsData.map((p: any) => ({
            id: p.id,
            name: p.name || p.productName || '',
          })).filter((p: any) => p.name && p.id); // Filter out invalid products
          console.log('Loaded products for document manager:', mappedProducts.length, mappedProducts);
          setProducts(mappedProducts);
        } else {
          console.error('Failed to fetch products:', productsRes.statusText);
          toast({
            variant: 'destructive',
            title: 'Failed to load products',
            description: 'Could not load products. Please try again.',
          });
        }

        // Fetch customers
        const customersRes = await fetch('/api/customers');
        if (customersRes.ok) {
          const customersData = await customersRes.json();
          // Map to ensure correct structure
          const mappedCustomers = customersData.map((c: any) => ({
            id: c.id,
            companyName: c.companyName || '',
            srplId: c.srplId || null,
          }));
          setCustomers(mappedCustomers);
        } else {
          console.error('Failed to fetch customers:', customersRes.statusText);
        }
      } catch (error) {
        console.error('Failed to fetch products/customers:', error);
        toast({
          variant: 'destructive',
          title: 'Failed to load data',
          description: 'Could not load products or customers. Please refresh the page.',
        });
      }
    };

    if (uploadDialogOpen) {
      fetchData();
    }
  }, [uploadDialogOpen, toast]);

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
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(selectedFile.type)) {
      toast({
        variant: 'destructive',
        title: 'Invalid file type',
        description: 'Only PDF, JPG, JPEG, and PNG files are allowed.',
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
    setUploadProgress(0);
    try {
      const formData = new FormData(e.currentTarget);
      formData.append('file', selectedFile);
      formData.append('name', selectedFile.name); // Use filename as document name
      formData.append('entityType', entityType);
      formData.append('entityId', entityId);
      if (selectedProductId) formData.append('productId', selectedProductId);
      if (selectedCustomerId) formData.append('customerId', selectedCustomerId);

      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();
      
      const uploadPromise = new Promise<{ ok: boolean; data: any }>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            setUploadProgress(percentComplete);
          }
        });

        xhr.addEventListener('load', () => {
          try {
            const data = xhr.responseText ? JSON.parse(xhr.responseText) : {};
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve({ ok: true, data });
            } else {
              resolve({ ok: false, data });
            }
          } catch (error) {
            reject(new Error('Failed to parse response'));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'));
        });

        xhr.open('POST', '/api/documents');
        xhr.send(formData);
      });

      const result = await uploadPromise;

      if (result.ok) {
        setUploadProgress(100);
        toast({
          title: 'Document uploaded',
          description: 'The document has been uploaded successfully.',
        });
        setUploadDialogOpen(false);
        setSelectedFile(null);
        setSelectedDocumentType('');
        setSelectedProductId(initialProductId || '');
        setSelectedCustomerId(initialCustomerId || '');
        setUploadProgress(0);
        fetchDocuments();
      } else {
        throw new Error(result.data.error || 'Failed to upload document');
      }
    } catch (error) {
      setUploadProgress(0);
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
                    <Label htmlFor="file">File * (PDF, JPG, JPEG, PNG - Max 10 MB)</Label>
                    <Input
                      id="file"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
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
                      <ProductCombobox
                        products={products}
                        onSelectProduct={(productId) => setSelectedProductId(productId)}
                        value={selectedProductId}
                      />
                      <input type="hidden" name="productId" value={selectedProductId} required={!!selectedProductId} />
                      <p className="text-xs text-muted-foreground mt-1">
                        This document will be linked to the selected product and visible in the product record
                      </p>
                    </div>
                  )}

                  {/* Customer selection for Contract */}
                  {DOCUMENT_TYPES.find((t) => t.value === selectedDocumentType)?.requiresCustomer && (
                    <div>
                      <Label htmlFor="customerId">Customer *</Label>
                      <CustomerCombobox
                        customers={customers}
                        onSelectCustomer={(customerId) => setSelectedCustomerId(customerId)}
                        defaultValue={selectedCustomerId}
                      />
                      <input type="hidden" name="customerId" value={selectedCustomerId} required={!!selectedCustomerId} />
                      <p className="text-xs text-muted-foreground mt-1">
                        This contract will be linked to the selected customer and visible in the customer profile
                      </p>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea id="description" name="description" placeholder="Add a description..." />
                  </div>
                  {uploading && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Uploading...</span>
                        <span className="text-muted-foreground">{Math.round(uploadProgress)}%</span>
                      </div>
                      <Progress value={uploadProgress} className="h-2" />
                    </div>
                  )}
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
                        <span className="flex items-center gap-1 text-xs" title={doc.scanResult === 'clean' ? 'Virus scan: Clean' : doc.scanResult === 'infected' ? 'Virus scan: Infected' : ''}>
                          {doc.scanResult === 'clean' ? (
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                          ) : doc.scanResult === 'infected' ? (
                            <AlertTriangle className="h-3 w-3 text-red-600" />
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
                        <>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => window.open(doc.fileUrl || '', '_blank')}
                            title="Preview document"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" title="Download document">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(doc.id)} title="Delete document">
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

// Product Combobox Component - matches Add Deal Dialog pattern
function ProductCombobox({ 
  products, 
  onSelectProduct, 
  value,
  disabled
}: { 
  products: Array<{ id: string; name: string }>; 
  onSelectProduct: (productId: string) => void; 
  value: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const selectedProductName = useMemo(() => {
    return products.find((product) => product.id === value)?.name;
  }, [products, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {value ? selectedProductName : 'Select product...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search product..." />
          <CommandEmpty>No product found.</CommandEmpty>
          <CommandList className="max-h-[300px]">
            <CommandGroup>
              {products.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No products available. Please add products first.
                </div>
              ) : (
                products.map((product) => (
                  <CommandItem
                    key={product.id}
                    value={product.name}
                    onSelect={() => {
                      onSelectProduct(product.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn('mr-2 h-4 w-4', value === product.id ? 'opacity-100' : 'opacity-0')}
                    />
                    {product.name}
                  </CommandItem>
                ))
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Customer Combobox Component
function CustomerCombobox({ 
  customers, 
  onSelectCustomer, 
  defaultValue 
}: { 
  customers: Array<{ id: string; companyName: string; srplId?: string | null }>; 
  onSelectCustomer: (customerId: string) => void; 
  defaultValue?: string;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(defaultValue || '');

  useEffect(() => {
    if (defaultValue) setValue(defaultValue);
  }, [defaultValue]);

  const selectedCustomer = useMemo(() => {
    return customers.find((customer) => customer.id === value);
  }, [customers, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value && selectedCustomer
            ? `${selectedCustomer.companyName}${selectedCustomer.srplId ? ` (${selectedCustomer.srplId})` : ''}`
            : 'Select customer...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search customer by company name or SRPL ID..." />
          <CommandEmpty>No customer found.</CommandEmpty>
          <CommandList>
            <CommandGroup>
              {customers.map((customer) => (
                <CommandItem
                  key={customer.id}
                  value={`${customer.companyName} ${customer.srplId || ''}`}
                  onSelect={() => {
                    setValue(customer.id);
                    onSelectCustomer(customer.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === customer.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{customer.companyName}</span>
                    {customer.srplId && (
                      <span className="text-xs text-muted-foreground">SRPL ID: {customer.srplId}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

