'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Check, X, Clock, User, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface ApprovalRequest {
  id: string;
  resource: string;
  resourceId: string;
  action: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requestedAt: string;
  reviewedAt: string | null;
  reason: string | null;
  rejectionReason: string | null;
  requestedBy: {
    id: string;
    name: string | null;
    email: string;
  };
  approvedBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  workflow: {
    id: string;
    name: string;
  } | null;
  metadata: string | null;
}

export default function ApprovalsPage() {
  const { toast } = useToast();
  const [pendingRequests, setPendingRequests] = useState<ApprovalRequest[]>([]);
  const [myRequests, setMyRequests] = useState<ApprovalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    try {
      setIsLoading(true);
      const [pendingRes, myRequestsRes] = await Promise.all([
        fetch('/api/approval-requests?myApprovals=true&status=pending'),
        fetch('/api/approval-requests?myRequests=true'),
      ]);

      if (pendingRes.ok) {
        const pending = await pendingRes.json();
        setPendingRequests(pending);
      }

      if (myRequestsRes.ok) {
        const my = await myRequestsRes.json();
        setMyRequests(my);
      }
    } catch (error) {
      console.error('Failed to fetch approvals:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load approval requests. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = (request: ApprovalRequest) => {
    setSelectedRequest(request);
    setApproveDialogOpen(true);
  };

  const handleReject = (request: ApprovalRequest) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const confirmApprove = async () => {
    if (!selectedRequest) return;

    try {
      const res = await fetch(`/api/approval-requests/${selectedRequest.id}/approve`, {
        method: 'POST',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to approve request');
      }

      toast({
        title: 'Success',
        description: 'Approval request approved successfully',
      });

      setApproveDialogOpen(false);
      setSelectedRequest(null);
      fetchApprovals();
    } catch (error) {
      console.error('Failed to approve request:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to approve request',
      });
    }
  };

  const confirmReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      toast({
        variant: 'destructive',
        title: 'Required',
        description: 'Please provide a rejection reason',
      });
      return;
    }

    try {
      const res = await fetch(`/api/approval-requests/${selectedRequest.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectionReason }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to reject request');
      }

      toast({
        title: 'Success',
        description: 'Approval request rejected',
      });

      setRejectDialogOpen(false);
      setSelectedRequest(null);
      setRejectionReason('');
      fetchApprovals();
    } catch (error) {
      console.error('Failed to reject request:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reject request',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <Check className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <X className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const renderRequestTable = (requests: ApprovalRequest[], showActions: boolean = false) => (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Resource</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Requested By</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Requested At</TableHead>
            <TableHead>Status</TableHead>
            {showActions && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showActions ? 7 : 6} className="text-center text-muted-foreground py-8">
                No approval requests found
              </TableCell>
            </TableRow>
          ) : (
            requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="capitalize">{request.resource}</span>
                    {request.workflow && (
                      <Badge variant="outline" className="text-xs">
                        {request.workflow.name}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="capitalize">{request.action}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span>{request.requestedBy.name || request.requestedBy.email}</span>
                  </div>
                </TableCell>
                <TableCell className="max-w-xs truncate">
                  {request.reason || '—'}
                </TableCell>
                <TableCell>
                  {format(new Date(request.requestedAt), 'MMM dd, yyyy HH:mm')}
                </TableCell>
                <TableCell>{getStatusBadge(request.status)}</TableCell>
                {showActions && request.status === 'pending' && (
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleApprove(request)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReject(request)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Approval Requests</h1>
        <p className="text-muted-foreground">
          Review and manage approval requests for sensitive actions
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Approval Requests</CardTitle>
          <CardDescription>
            Manage approval requests that require your review
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Tabs defaultValue="pending" className="w-full">
              <TabsList>
                <TabsTrigger value="pending">
                  Pending My Approval ({pendingRequests.length})
                </TabsTrigger>
                <TabsTrigger value="my-requests">
                  My Requests ({myRequests.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="pending" className="mt-4">
                {renderRequestTable(pendingRequests, true)}
              </TabsContent>
              <TabsContent value="my-requests" className="mt-4">
                {renderRequestTable(myRequests, false)}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Request?</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this {selectedRequest?.resource} {selectedRequest?.action} request?
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="py-4">
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-semibold">Resource:</span> {selectedRequest.resource}
                </div>
                <div>
                  <span className="font-semibold">Action:</span> {selectedRequest.action}
                </div>
                {selectedRequest.reason && (
                  <div>
                    <span className="font-semibold">Reason:</span> {selectedRequest.reason}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmApprove}>Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request?</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this approval request.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rejection-reason">Rejection Reason *</Label>
            <Textarea
              id="rejection-reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter reason for rejection..."
              className="mt-2"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmReject}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

