import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, User, MessageSquare, Clock, CheckCircle, XCircle } from "lucide-react";

const transferSchema = z.object({
  toUserId: z.string().min(1, "Please select a recipient"),
  transferReason: z.string().optional(),
});

interface EnquiryTransferDialogProps {
  enquiry: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: {
    name: string;
    displayName: string;
  };
}

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
  fromUser?: User;
  toUser?: User;
}

export default function EnquiryTransferDialog({ enquiry, open, onOpenChange }: EnquiryTransferDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'request' | 'history'>('request');

  const form = useForm({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      toUserId: "",
      transferReason: "",
    },
  });

  // Fetch eligible users for transfer dropdown
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users/transfer-targets'],
    enabled: open,
  });

  // Debug: log fetched users count
  if (open) {
    // eslint-disable-next-line no-console
    console.log('Transfer targets fetched:', users.length, users);
  }

  // Fetch transfer history
  const { data: transfers = [], refetch: refetchTransfers } = useQuery<Transfer[]>({
    queryKey: [`/api/enquiries/transfers`],
    enabled: open,
  });

  // Users returned are already eligible; just use as-is
  const eligibleUsers = users;

  // Create transfer mutation
  const createTransferMutation = useMutation({
    mutationFn: async (data: { toUserId: string; transferReason?: string }) => {
      const response = await fetch(`/api/enquiries/${enquiry.id}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create transfer');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Transfer request sent", description: "The recipient will be notified." });
      form.reset();
      refetchTransfers();
    },
    onError: (error: any) => {
      // Handle specific error types with user-friendly messages
      let title = "Error";
      let description = error.message;
      
      if (error.message.includes("pending transfer")) {
        title = "Transfer Conflict";
        description = "There is already a pending transfer request for this enquiry. Please wait for it to be resolved before creating a new one.";
      } else if (error.message.includes("cannot transfer an enquiry to yourself")) {
        title = "Invalid Transfer";
        description = "You cannot transfer an enquiry to yourself. Please select a different recipient.";
      } else if (error.message.includes("You can only transfer enquiries you own")) {
        title = "Permission Denied";
        description = "You can only transfer enquiries that you own. Contact an administrator if you need to transfer this enquiry.";
      } else if (error.message.includes("Cannot transfer enquiry")) {
        title = "Enquiry Not Transferable";
        description = "This enquiry cannot be transferred in its current state. Only active enquiries can be transferred.";
      } else if (error.message.includes("Recipient is required")) {
        title = "Missing Information";
        description = "Please select a recipient for the transfer.";
      }
      
      toast({ title, description, variant: "destructive" });
    },
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
      refetchTransfers();
      queryClient.invalidateQueries({ queryKey: ['/api/enquiries'] });
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
      refetchTransfers();
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
      }
      
      toast({ title, description, variant: "destructive" });
    },
  });

  const onSubmit = (data: z.infer<typeof transferSchema>) => {
    createTransferMutation.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle className="w-3 h-3 mr-1" />Accepted</Badge>;
      case 'declined':
        return <Badge variant="outline" className="text-red-600 border-red-600"><XCircle className="w-3 h-3 mr-1" />Declined</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="text-gray-600 border-gray-600">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transfer Enquiry Ownership</DialogTitle>
          <DialogDescription>
            Transfer ownership of enquiry {enquiry?.enquiryNumber} to another team member.
          </DialogDescription>
        </DialogHeader>

        <div className="flex space-x-1 mb-6">
          <Button
            variant={activeTab === 'request' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('request')}
          >
            Request Transfer
          </Button>
          <Button
            variant={activeTab === 'history' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('history')}
          >
            Transfer History
          </Button>
        </div>

        {activeTab === 'request' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Enquiry Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Enquiry Number</label>
                    <p className="font-mono text-sm">{enquiry?.enquiryNumber}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Client Name</label>
                    <p className="text-sm">{enquiry?.clientName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Event Type</label>
                    <p className="text-sm">{enquiry?.eventType}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Current Owner</label>
                    <p className="text-sm">{enquiry?.salespersonId ? 'Assigned' : 'Unassigned'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="toUserId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transfer to</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a team member" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {eligibleUsers.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              <div className="flex items-center space-x-2">
                                <User className="w-4 h-4" />
                                <span>{user.firstName} {user.lastName}</span>
                                <Badge variant="outline" className="text-xs">
                                  {user.role?.displayName}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="transferReason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason for transfer (optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Explain why you're transferring this enquiry..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createTransferMutation.isPending}
                  >
                    {createTransferMutation.isPending ? 'Sending...' : 'Send Transfer Request'}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            {transfers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No transfer requests found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {transfers.map((transfer) => (
                  <Card key={transfer.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">
                              {transfer.fromUser?.firstName} {transfer.fromUser?.lastName}
                            </span>
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">
                              {transfer.toUser?.firstName} {transfer.toUser?.lastName}
                            </span>
                            {getStatusBadge(transfer.status)}
                          </div>
                          
                          {transfer.transferReason && (
                            <p className="text-sm text-muted-foreground mb-2">
                              <strong>Reason:</strong> {transfer.transferReason}
                            </p>
                          )}
                          
                          {transfer.responseNotes && (
                            <p className="text-sm text-muted-foreground mb-2">
                              <strong>Response:</strong> {transfer.responseNotes}
                            </p>
                          )}
                          
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <span>Requested: {formatDate(transfer.requestedAt)}</span>
                            {transfer.respondedAt && (
                              <span>Responded: {formatDate(transfer.respondedAt)}</span>
                            )}
                          </div>
                        </div>

                        {/* Action buttons for pending transfers where current user is recipient */}
                        {transfer.status === 'pending' && transfer.toUserId === user?.id && (
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => declineTransferMutation.mutate({ 
                                transferId: transfer.id, 
                                responseNotes: 'Declined by recipient' 
                              })}
                              disabled={declineTransferMutation.isPending}
                            >
                              Decline
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => acceptTransferMutation.mutate({ 
                                transferId: transfer.id, 
                                responseNotes: 'Accepted by recipient' 
                              })}
                              disabled={acceptTransferMutation.isPending}
                            >
                              Accept
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

