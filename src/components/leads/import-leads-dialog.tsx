'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UploadCloud } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Lead } from '@/types';

type ImportLeadsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadsImported: (leads: Omit<Lead, 'id' | 'createdAt'>[]) => void;
};

export function ImportLeadsDialog({ open, onOpenChange, onLeadsImported }: ImportLeadsDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast({
        variant: 'destructive',
        title: 'No file selected',
        description: 'Please select a CSV file to import.',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csvContent = event.target?.result as string;
        const lines = csvContent.split(/\r\n|\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) {
            toast({ variant: 'destructive', title: 'Invalid CSV', description: 'File is empty or contains only a header.' });
            return;
        }

        const headers = lines[0].split(',').map(h => h.trim());
        const requiredHeaders = ['companyName', 'contactName', 'email', 'phone', 'status', 'leadSource', 'country'];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        
        if (missingHeaders.length > 0) {
            toast({
                variant: 'destructive',
                title: 'Invalid CSV Format',
                description: `File must contain the following columns: ${missingHeaders.join(', ')}.`,
            });
            return;
        }

        const importedLeads: Omit<Lead, 'id' | 'createdAt'>[] = [];
        for (let i = 1; i < lines.length; i++) {
          const data = lines[i].split(',');
          if (data.length >= requiredHeaders.length) {
            const leadObject = headers.reduce((obj, header, index) => {
                obj[header] = data[index] ? data[index].trim() : '';
                return obj;
            }, {} as any);
            
            if (requiredHeaders.every(h => leadObject[h])) {
               const newLead: Omit<Lead, 'id' | 'createdAt'> = {
                 ...leadObject,
                 assignedSalesperson: '', // Set default empty value
               };
               importedLeads.push(newLead);
            }
          }
        }

        if (importedLeads.length === 0) {
            toast({
                variant: 'destructive',
                title: 'No Leads Found',
                description: 'The CSV file does not contain valid lead data matching the required headers.',
            });
            return;
        }

        onLeadsImported(importedLeads);
        onOpenChange(false);
        setFile(null);
      } catch (error) {
         toast({
            variant: 'destructive',
            title: 'Import Failed',
            description: 'There was an error processing the CSV file.',
        });
      }
    };
    
    reader.readAsText(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Import Bulk Leads</DialogTitle>
            <DialogDescription>
              Upload a CSV file with your leads. The file must contain headers for `companyName`, `contactName`, `email`, `phone`, `status`, `leadSource`, and `country`.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="csvFile">Upload CSV</Label>
              <Input id="csvFile" type="file" accept=".csv" onChange={handleFileChange} required />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit">
              <UploadCloud className="mr-2" />
              Import
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
