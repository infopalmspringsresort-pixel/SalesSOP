import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Bell, ArrowRight, CheckCircle, XCircle, Clock, User } from "lucide-react";
import { format } from "date-fns";

interface Transfer {
  id: string;
  enquiryId: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  transferReason?: string;
  responseNotes?: string;
  requestedAt: string;
  respondedAt?: string;
  fromUser?: {
    firstName: string;
    lastName: string;
  };
  toUser?: {
    firstName: string;
    lastName: string;
  };
  enquiry?: {
    enquiryNumber: string;
    clientName: string;
  };
}

export default function TransferNotifications() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [responseNotes, setResponseNotes] = useState('');
  const [showResponseDialog, setShowResponseDialog] = useState(false);

  // Test simple endpoint first
  const { data: testData } = useQuery({
    queryKey: ['/api/test-transfers'],
    enabled: false, // Don't auto-fetch
  });

  // Test transfers data endpoint
  const { data: testTransfersData } = useQuery({
    queryKey: ['/api/test-transfers-data'],
    enabled: false, // Don't auto-fetch
  });

  // Fetch pending transfers for current user
  const { data: transfers = [], isLoading, error } = useQuery<Transfer[]>({
    queryKey: ['/api/enquiries/transfers'],
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: false, // Don't retry on error
  });

  const pendingTransfers = transfers.filter(t => {
    const isPending = t.status === 'pending';
    const isForCurrentUser = t.toUserId === user?.id;
    return isPending && isForCurrentUser;
  });
  

  // Accept transfer mutation
  const acceptTransferMutation = useMutation({
    mutationFn: async ({ transferId, responseNotes }: { transferId: string; responseNotes?: string }) => {
      const response = await fetch(`/api/enquiries/transfers/${transferId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responseNotes }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to accept transfer');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Transfer accepted", description: "Enquiry ownership has been transferred." });
      queryClient.invalidateQueries({ queryKey: ['/api/enquiries/transfers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/enquiries'] });
      setShowResponseDialog(false);
      setSelectedTransfer(null);
      setResponseNotes('');
    },
    onError: (error: any) => {
      let title = "Error";
      let description = error.message;
      
      if (error.message.includes("You can only accept transfers sent to you")) {
        title = "Permission Denied";
        description = "You can only accept transfer requests that were sent to you.";
      } else if (error.message.includes("Transfer is not pending")) {
        title = "Transfer Already Processed";
        description = "This transfer request has already been processed and cannot be accepted.";
      } else if (error.message.includes("Transfer not found")) {
        title = "Transfer Not Found";
        description = "The transfer request could not be found. It may have been cancelled or already processed.";
      }
      
      toast({ title, description, variant: "destructive" });
    },
  });

  // Decline transfer mutation
  const declineTransferMutation = useMutation({
    mutationFn: async ({ transferId, responseNotes }: { transferId: string; responseNotes?: string }) => {
      const response = await fetch(`/api/enquiries/transfers/${transferId}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responseNotes }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to decline transfer');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Transfer declined", description: "The transfer request has been declined." });
      queryClient.invalidateQueries({ queryKey: ['/api/enquiries/transfers'] });
      setShowResponseDialog(false);
      setSelectedTransfer(null);
      setResponseNotes('');
    },
    onError: (error: any) => {
      let title = "Error";
      let description = error.message;
      
      if (error.message.includes("You can only decline transfers sent to you")) {
        title = "Permission Denied";
        description = "You can only decline transfer requests that were sent to you.";
      } else if (error.message.includes("Transfer is not pending")) {
        title = "Transfer Already Processed";
        description = "This transfer request has already been processed and cannot be declined.";
      } else if (error.message.includes("Transfer not found")) {
        title = "Transfer Not Found";
        description = "The transfer request could not be found. It may have been cancelled or already processed.";
      }
      
      toast({ title, description, variant: "destructive" });
    },
  });

  const handleAccept = () => {
    if (selectedTransfer) {
      acceptTransferMutation.mutate({ 
        transferId: selectedTransfer.id, 
        responseNotes: responseNotes || undefined 
      });
    }
  };

  const handleDecline = () => {
    if (selectedTransfer) {
      declineTransferMutation.mutate({ 
        transferId: selectedTransfer.id, 
        responseNotes: responseNotes || undefined 
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'accepted':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'declined':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pending</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="text-green-600 border-green-600">Accepted</Badge>;
      case 'declined':
        return <Badge variant="outline" className="text-red-600 border-red-600">Declined</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="text-gray-600 border-gray-600">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-blue-600 animate-pulse" />
            <span className="text-blue-800">Loading transfer requests...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pendingTransfers.length === 0) {
    return null; // Don't show anything when there are no pending transfers
  }

  return (
    <>
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Bell className="w-5 h-5" />
            Transfer Requests ({pendingTransfers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingTransfers.map((transfer) => (
            <div key={transfer.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
              <div className="flex items-center space-x-3 flex-1">
                {getStatusIcon(transfer.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium text-sm">
                      {transfer.fromUser?.firstName && transfer.fromUser?.lastName 
                        ? `${transfer.fromUser.firstName} ${transfer.fromUser.lastName}`
                        : transfer.fromUser?.email || 'Unknown User'}
                    </span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">You</span>
                  </div>
                  {transfer.enquiry && (
                    <div className="text-sm font-medium text-foreground mb-1">
                      {transfer.enquiry.enquiryNumber || 'N/A'} - {transfer.enquiry.clientName || 'N/A'}
                    </div>
                  )}
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-1">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{format(new Date(transfer.requestedAt), 'MMM dd, yyyy HH:mm')}</span>
                    </div>
                    {transfer.transferReason && (
                      <div className="truncate max-w-xs">
                        <span className="font-medium">Reason:</span> {transfer.transferReason}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusBadge(transfer.status)}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedTransfer(transfer);
                    setShowResponseDialog(true);
                  }}
                >
                  Respond
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Response Dialog */}
      <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Respond to Transfer Request</DialogTitle>
            <DialogDescription>
              {selectedTransfer?.fromUser?.firstName} {selectedTransfer?.fromUser?.lastName} wants to transfer enquiry {selectedTransfer?.enquiry?.enquiryNumber} to you.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedTransfer?.transferReason && (
              <div>
                <Label className="text-sm font-medium">Transfer Reason</Label>
                <p className="text-sm text-muted-foreground mt-1">{selectedTransfer.transferReason}</p>
              </div>
            )}
            
            <div>
              <Label htmlFor="response-notes">Response Notes (Optional)</Label>
              <Textarea
                id="response-notes"
                placeholder="Add any notes about your decision..."
                value={responseNotes}
                onChange={(e) => setResponseNotes(e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowResponseDialog(false);
                  setSelectedTransfer(null);
                  setResponseNotes('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={handleDecline}
                disabled={declineTransferMutation.isPending}
                className="text-red-600 border-red-600 hover:bg-red-50"
              >
                {declineTransferMutation.isPending ? 'Declining...' : 'Decline'}
              </Button>
              <Button
                onClick={handleAccept}
                disabled={acceptTransferMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {acceptTransferMutation.isPending ? 'Accepting...' : 'Accept'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
