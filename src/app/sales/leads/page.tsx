'use client';

import { Button } from "@/components/ui/button";
import { PlusCircle, Upload } from "lucide-react";
import Link from "next/link";
import { LeadsTable } from "@/components/leads/leads-table";
import { useState } from "react";
import { ImportLeadsDialog } from "@/components/leads/import-leads-dialog";
import type { Lead } from "@/types";
import { useToast } from "@/hooks/use-toast";

export default function LeadsPage() {
  const [isImportDialogOpen, setImportDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleImportLeads = async (importedLeads: Omit<Lead, 'id' | 'createdAt'>[]) => {
    try {
      const res = await fetch('/api/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: importedLeads }),
      });

      if (!res.ok) {
        throw new Error('Failed to import leads');
      }

      toast({
        title: 'Import complete',
        description: `${importedLeads.length} leads were imported successfully.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Import failed',
        description: 'There was a problem importing leads. Please try again.',
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Lead Management</h1>
          <p className="text-muted-foreground">Capture, qualify, and convert new business leads.</p>
        </div>
        <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setImportDialogOpen(true)}
              data-testid="import-leads-button"
            >
              <Upload className="mr-2" />
              Import Bulk Leads
            </Button>
            <Link href="/sales/leads/add">
                <Button data-testid="add-new-lead-button">
                <PlusCircle className="mr-2" />
                Add New Lead
                </Button>
            </Link>
        </div>
      </div>

      <div className="mt-4">
        <LeadsTable />
      </div>

      <ImportLeadsDialog
        open={isImportDialogOpen}
        onOpenChange={setImportDialogOpen}
        onLeadsImported={handleImportLeads}
      />
    </div>
  );
}
