
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UploadCloud, MoreHorizontal, FileText, Download, Trash2, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
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
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, limit, startAfter, endBefore, limitToLast, DocumentData, Query } from "firebase/firestore";

type Document = {
  id: string;
  name: string;
  type: 'COA' | 'TDS' | 'MSDS' | 'Contract' | 'Other';
  version: string;
  uploadDate: string;
  // url: string; // URL to the file in Firebase Storage
};

const PAGE_SIZE = 10;

export default function DocumentsPage() {
  const firestore = useFirestore();
  const { user, isUserLoading: isAuthLoading } = useUser();
  const { toast } = useToast();
  
  const [pagination, setPagination] = useState<{
    cursors: (DocumentData | null)[],
    page: number
  }>({ cursors: [null], page: 0 });
  const [direction, setDirection] = useState<'next' | 'prev' | 'none'>('none');
  const [isUploadDialogOpen, setUploadDialogOpen] = useState(false);

  const documentsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    
    let q: Query<DocumentData>;
    const baseQuery = collection(firestore, 'documents');

    if (direction === 'next') {
        q = query(baseQuery, startAfter(pagination.cursors[pagination.page]), limit(PAGE_SIZE));
    } else if (direction === 'prev') {
        q = query(baseQuery, endBefore(pagination.cursors[pagination.page]), limitToLast(PAGE_SIZE));
    } else {
        q = query(baseQuery, limit(PAGE_SIZE));
    }
    return q;
  }, [firestore, user, pagination.page, direction]);

  const { data: documents, isLoading: isDocumentsLoading } = useCollection<Document>(documentsQuery);
  
  const isLoading = isAuthLoading || isDocumentsLoading;

  const handleNext = () => {
    if (!documents || documents.length < PAGE_SIZE) return;
    const nextCursor = documents[documents.length - 1]._raw || null;
    setPagination(prev => ({
        cursors: [...prev.cursors.slice(0, prev.page + 1), nextCursor],
        page: prev.page + 1
    }));
    setDirection('next');
  };

  const handlePrev = () => {
      if (pagination.page === 0) return;
      setPagination(prev => ({
          cursors: prev.cursors,
          page: prev.page - 1
      }));
      setDirection('prev');
  };

  const handleUpload = (newDocument: Omit<Document, 'id' | 'uploadDate'> & { file: File }) => {
    // This is a placeholder for a secure backend call.
    console.log("Calling backend to upload document and file:", newDocument);

    toast({
      title: "Upload Queued",
      description: `${newDocument.name} is being uploaded.`,
    });
    setUploadDialogOpen(false);
  };

  const handleDelete = (docId: string) => {
    // This is a placeholder for a secure backend call.
    console.log("Calling backend to delete document:", docId);
    toast({
      title: "Deletion Requested",
      description: `Document with ID ${docId} will be deleted shortly.`,
    });
  }

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
          ) : !documents || documents.length === 0 ? (
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
                        <TableHead>Version</TableHead>
                        <TableHead>Upload Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {documents.map((doc) => (
                        <TableRow key={doc.id}>
                            <TableCell className="font-medium flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                {doc.name}
                            </TableCell>
                            <TableCell>{doc.type}</TableCell>
                            <TableCell>{doc.version}</TableCell>
                            <TableCell>{doc.uploadDate}</TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                            <span className="sr-only">Open menu</span>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem>
                                            <Download className="mr-2 h-4 w-4" />
                                            Download
                                        </DropdownMenuItem>
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
                      disabled={pagination.page === 0}
                  >
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Previous
                  </Button>
                  <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNext}
                      disabled={!documents || documents.length < PAGE_SIZE}
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
        onUpload={handleUpload}
      />
    </div>
  );
}

// Upload Dialog Component
function UploadDocumentDialog({ open, onOpenChange, onUpload }: { open: boolean, onOpenChange: (open: boolean) => void, onUpload: (doc: Omit<Document, 'id' | 'uploadDate'> & { file: File }) => void }) {
    const [file, setFile] = useState<File | null>(null);
    const [docType, setDocType] = useState<'COA' | 'TDS' | 'MSDS' | 'Contract' | 'Other' | ''>('');
    const [version, setVersion] = useState('');
    const { toast } = useToast();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
        }
    };
    
    const handleSubmit = () => {
        if (!file || !docType || !version) {
            toast({
                variant: 'destructive',
                title: "Missing Information",
                description: "Please select a file, document type, and enter a version."
            });
            return;
        }

        onUpload({
            name: file.name,
            type: docType as Document['type'],
            version: version,
            file: file
        });

        // Reset form
        setFile(null);
        setDocType('');
        setVersion('');
    }

    return (
         <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Upload New Document</DialogTitle>
                <DialogDescription>
                    Select a file and provide the necessary details.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="file-upload">File</Label>
                    <Input id="file-upload" type="file" onChange={handleFileChange} />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="doc-type">Document Type</Label>
                      <Select onValueChange={(value) => setDocType(value as any)} value={docType}>
                          <SelectTrigger id="doc-type">
                              <SelectValue placeholder="Select a document type" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="COA">Certificate of Analysis (COA)</SelectItem>
                              <SelectItem value="TDS">Technical Data Sheet (TDS)</SelectItem>
                              <SelectItem value="MSDS">Material Safety Data Sheet (MSDS)</SelectItem>
                              <SelectItem value="Contract">Contract</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="version">Version</Label>
                      <Input id="version" placeholder="e.g., 1.0, 2.3b" value={version} onChange={(e) => setVersion(e.target.value)} />
                  </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="secondary">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="button" onClick={handleSubmit}>
                    <UploadCloud className="mr-2 h-4 w-4" />
                    Upload
                </Button>
              </DialogFooter>
          </DialogContent>
        </Dialog>
    );
}
