'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UploadCloud, MoreHorizontal, FileText, Download, Trash2, Loader2, ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, Check, ChevronsUpDown, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

type Document = {
  id: string;
  name: string;
  type: string;
  description?: string | null;
  fileSize?: number | null;
  fileUrl?: string | null;
  isScanned: boolean;
  scanResult?: string | null;
  createdAt: string;
  uploadedBy?: {
    name?: string | null;
    email?: string | null;
  } | null;
  product?: {
    id: string;
    name: string;
    srplId?: string | null;
  } | null;
  customer?: {
    id: string;
    companyName: string;
    srplId?: string | null;
  } | null;
};

const PAGE_SIZE = 10;

const DOCUMENT_TYPES = [
  { value: 'COA', label: 'Certificate of Analysis (COA)', requiresProduct: true },
  { value: 'TDS', label: 'Technical Data Sheet (TDS)', requiresProduct: true },
  { value: 'MSDS', label: 'Material Safety Data Sheet (MSDS)', requiresProduct: true },
  { value: 'contract', label: 'Contract', requiresCustomer: true },
  { value: 'approval', label: 'Approval' },
  { value: 'regulatory', label: 'Regulatory Declaration' },
];

export default function DocumentsPage() {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isUploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [products, setProducts] = useState<Array<{ id: string; name: string }>>([]);
  const [customers, setCustomers] = useState<Array<{ id: string; companyName: string; srplId?: string | null }>>([]);

  useEffect(() => {
    fetchDocuments();
  }, [currentPage]);

  useEffect(() => {
    if (isUploadDialogOpen) {
      fetchProductsAndCustomers();
    }
  }, [isUploadDialogOpen]);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/documents?page=${currentPage}&limit=${PAGE_SIZE}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || data);
        // If API returns pagination info, use it; otherwise estimate
        if (data.total !== undefined) {
          setTotalPages(Math.ceil(data.total / PAGE_SIZE));
        } else {
          setTotalPages(documents.length < PAGE_SIZE ? currentPage + 1 : currentPage + 2);
        }
      } else {
        throw new Error('Failed to fetch documents');
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to load documents',
        description: 'Could not fetch documents from the server.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProductsAndCustomers = async () => {
    try {
      const [productsRes, customersRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/customers'),
      ]);
      
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        // Map to ensure correct structure: { id, name }
        const mappedProducts = productsData.map((p: any) => ({
          id: p.id,
          name: p.name || p.productName || '',
        })).filter((p: any) => p.name && p.id); // Filter out invalid products
        console.log('Loaded products for documents page:', mappedProducts.length);
        setProducts(mappedProducts);
      } else {
        console.error('Failed to fetch products:', productsRes.statusText);
        toast({
          variant: 'destructive',
          title: 'Failed to load products',
          description: 'Could not load products. Please try again.',
        });
      }
      
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
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const res = await fetch(`/api/documents/${docId}`, {
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

  const handleNext = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrev = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
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
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Document Management</h1>
          <p className="text-muted-foreground">Store COAs, TDS, contracts, and shipping docs with version control.</p>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)}>
          <UploadCloud className="mr-2" />
          Upload Document
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Documents</CardTitle>
          <CardDescription>Browse, search, and manage your documents.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
             </div>
          ) : documents.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <p>No documents uploaded yet.</p>
              <p className="text-sm">Click "Upload Document" to add your first file.</p>
            </div>
          ) : (
            <>
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Linked To</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Uploaded By</TableHead>
                        <TableHead>Upload Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {documents.map((doc) => (
                        <TableRow key={doc.id}>
                            <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                  {doc.name}
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
                            </TableCell>
                            <TableCell>{getTypeBadge(doc.type)}</TableCell>
                            <TableCell>
                              {doc.product && (
                                <div className="text-sm">
                                  Product: {doc.product.name} {doc.product.srplId && `(${doc.product.srplId})`}
                                </div>
                              )}
                              {doc.customer && (
                                <div className="text-sm">
                                  Customer: {doc.customer.companyName} {doc.customer.srplId && `(${doc.customer.srplId})`}
                                </div>
                              )}
                              {!doc.product && !doc.customer && (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell>{doc.fileSize ? `${(doc.fileSize / 1024).toFixed(2)} KB` : '-'}</TableCell>
                            <TableCell>{doc.uploadedBy?.name || doc.uploadedBy?.email || 'Unknown'}</TableCell>
                            <TableCell>{formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}</TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                            <span className="sr-only">Open menu</span>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        {doc.fileUrl && (
                                          <>
                                            <DropdownMenuItem onClick={() => window.open(doc.fileUrl || '', '_blank')}>
                                              <Eye className="mr-2 h-4 w-4" />
                                              Preview
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                              <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center">
                                                <Download className="mr-2 h-4 w-4" />
                                                Download
                                              </a>
                                            </DropdownMenuItem>
                                          </>
                                        )}
                                        <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(doc.id)}>
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
             </Table>
              <div className="flex items-center justify-end space-x-2 py-4">
                  <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrev}
                      disabled={currentPage === 0}
                  >
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Previous
                  </Button>
                  <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNext}
                      disabled={currentPage >= totalPages - 1}
                  >
                      Next
                      <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      <UploadDocumentDialog 
        open={isUploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUpload={fetchDocuments}
        products={products}
        customers={customers}
      />
    </div>
  );
}

// Upload Dialog Component
function UploadDocumentDialog({ 
  open, 
  onOpenChange, 
  onUpload,
  products,
  customers
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  onUpload: () => void;
  products: Array<{ id: string; name: string; srplId?: string | null }>;
  customers: Array<{ id: string; companyName: string; srplId?: string | null }>;
}) {
    const [file, setFile] = useState<File | null>(null);
    const [docType, setDocType] = useState<string>('');
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [description, setDescription] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const { toast } = useToast();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
        }
    };
    
    const handleSubmit = async () => {
        if (!file || !docType) {
            toast({
                variant: 'destructive',
                title: "Missing Information",
                description: "Please select a file and document type."
            });
            return;
        }

        // Validate document type requirements
        const selectedType = DOCUMENT_TYPES.find((t) => t.value === docType);
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

        // Validate file type
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(file.type)) {
            toast({
                variant: 'destructive',
                title: 'Invalid file type',
                description: 'Only PDF, JPG, JPEG, and PNG files are allowed.',
            });
            return;
        }

        // Validate file size (10 MB max)
        const maxSize = 10 * 1024 * 1024; // 10 MB
        if (file.size > maxSize) {
            toast({
                variant: 'destructive',
                title: 'File too large',
                description: `File size ${(file.size / 1024 / 1024).toFixed(2)} MB exceeds maximum allowed size of 10 MB`,
            });
            return;
        }

        setUploading(true);
        setUploadProgress(0);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('name', file.name); // Use filename as document name
            formData.append('type', docType);
            formData.append('entityType', 'document');
            formData.append('entityId', 'dashboard');
            if (description) formData.append('description', description);
            if (selectedProductId) formData.append('productId', selectedProductId);
            if (selectedCustomerId) formData.append('customerId', selectedCustomerId);

            // Use XMLHttpRequest for progress tracking
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
                    title: "Document Uploaded",
                    description: `${file.name} has been uploaded successfully.`,
                });
                // Reset form
                setFile(null);
                setDocType('');
                setSelectedProductId('');
                setSelectedCustomerId('');
                setDescription('');
                setUploadProgress(0);
                onOpenChange(false);
                onUpload();
            } else {
                throw new Error(result.data.error || 'Failed to upload document');
            }
        } catch (error) {
            setUploadProgress(0);
            toast({
                variant: 'destructive',
                title: "Upload Failed",
                description: error instanceof Error ? error.message : 'Failed to upload document',
            });
        } finally {
            setUploading(false);
        }
    }

    return (
         <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Upload New Document</DialogTitle>
                <DialogDescription>
                    Select a file and provide the necessary details.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="file-upload">File * (PDF, JPG, JPEG, PNG - Max 10 MB)</Label>
                    <Input 
                      id="file-upload" 
                      type="file" 
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange} 
                    />
                    {file && (
                      <p className="text-sm text-muted-foreground">
                        Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="doc-type">Document Type *</Label>
                      <Select onValueChange={(value) => {
                          setDocType(value);
                          // Reset selections when type changes
                          if (!DOCUMENT_TYPES.find((t) => t.value === value)?.requiresProduct) {
                              setSelectedProductId('');
                          }
                          if (!DOCUMENT_TYPES.find((t) => t.value === value)?.requiresCustomer) {
                              setSelectedCustomerId('');
                          }
                      }} value={docType}>
                          <SelectTrigger id="doc-type">
                              <SelectValue placeholder="Select a document type" />
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
                  {DOCUMENT_TYPES.find((t) => t.value === docType)?.requiresProduct && (
                    <div className="space-y-2">
                      <Label htmlFor="product-select">Product *</Label>
                      <ProductCombobox
                        products={products}
                        onSelectProduct={(productId) => setSelectedProductId(productId)}
                        value={selectedProductId}
                      />
                    </div>
                  )}
                  {DOCUMENT_TYPES.find((t) => t.value === docType)?.requiresCustomer && (
                    <div className="space-y-2">
                      <Label htmlFor="customer-select">Customer *</Label>
                      <CustomerCombobox
                        customers={customers}
                        onSelectCustomer={(customerId) => setSelectedCustomerId(customerId)}
                        defaultValue={selectedCustomerId}
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                      <Label htmlFor="description">Description (Optional)</Label>
                      <Textarea 
                        id="description" 
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Add a description..." 
                      />
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
                <DialogClose asChild>
                  <Button type="button" variant="secondary" disabled={uploading}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="button" onClick={handleSubmit} disabled={uploading || !file || !docType}>
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <UploadCloud className="mr-2 h-4 w-4" />
                        Upload
                      </>
                    )}
                </Button>
              </DialogFooter>
          </DialogContent>
        </Dialog>
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
