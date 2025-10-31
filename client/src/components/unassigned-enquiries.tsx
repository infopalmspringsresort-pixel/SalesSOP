import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  Users, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Clock, 
  UserPlus, 
  Hand,
  UserMinus
} from "lucide-react";
import { format } from "date-fns";

interface UnassignedEnquiriesProps {
  onClaim?: (enquiryId: string) => void;
}

export default function UnassignedEnquiries({ onClaim }: UnassignedEnquiriesProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Check user role and permissions
  const userRole = (user as any)?.role?.name || (user as any)?.role;
  
  // Only show unassigned enquiries to salespeople, managers, and admins (not staff)
  const canSeeUnassigned = userRole === 'salesperson' || userRole === 'manager' || userRole === 'admin';
  
  // Only allow claiming to salespeople, managers, and admins
  const canClaim = userRole === 'salesperson' || userRole === 'manager' || userRole === 'admin';

  // Fetch unassigned enquiries
  const { data: enquiries = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/enquiries"],
    select: (data) => canSeeUnassigned ? data.filter(enquiry => 
      enquiry.assignmentStatus === 'unassigned' || !enquiry.salespersonId
    ) : [],
  });

  // Claim enquiry mutation
  const claimEnquiryMutation = useMutation({
    mutationFn: async (enquiryId: string) => {
      const response = await fetch(`/api/enquiries/${enquiryId}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to claim enquiry');
      }

      return response.json();
    },
    onSuccess: (data, enquiryId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/enquiries"] });
      toast({
        title: "Enquiry Claimed Successfully",
        description: "You have successfully claimed this enquiry.",
      });
      onClaim?.(enquiryId);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Claim Enquiry",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Unclaim enquiry mutation
  const unclaimEnquiryMutation = useMutation({
    mutationFn: async (enquiryId: string) => {
      const response = await fetch(`/api/enquiries/${enquiryId}/unclaim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to unclaim enquiry');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enquiries"] });
      toast({
        title: "Enquiry Unclaimed",
        description: "You have released this enquiry back to the pool.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Unclaim Enquiry",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleClaim = (enquiryId: string) => {
    claimEnquiryMutation.mutate(enquiryId);
  };

  const handleUnclaim = (enquiryId: string) => {
    unclaimEnquiryMutation.mutate(enquiryId);
  };

  const isClaimedByCurrentUser = (enquiry: any) => {
    return enquiry.salespersonId === user?.id;
  };

  // Don't render the component if user doesn't have permission to see unassigned enquiries
  if (!canSeeUnassigned) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Unassigned Enquiries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (enquiries.length === 0) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Unassigned Enquiries ({enquiries.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
                  <TableRow>
                    <TableHead>Enquiry #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Event Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
            </TableHeader>
            <TableBody>
              {enquiries.map((enquiry) => (
                <TableRow key={enquiry.id}>
                  <TableCell className="font-medium">
                    {enquiry.enquiryNumber}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{enquiry.clientName}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {enquiry.contactNumber}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {enquiry.eventType || 'Not specified'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {enquiry.eventDate ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(enquiry.eventDate), 'MMM dd, yyyy')}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Not specified</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {canClaim ? (
                        isClaimedByCurrentUser(enquiry) ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnclaim(enquiry.id)}
                            disabled={unclaimEnquiryMutation.isPending}
                          >
                            <UserMinus className="w-4 h-4 mr-1" />
                            Unclaim
                          </Button>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleClaim(enquiry.id)}
                            disabled={claimEnquiryMutation.isPending}
                          >
                            <Hand className="w-4 h-4 mr-1" />
                            Claim
                          </Button>
                        )
                      ) : (
                        <span className="text-sm text-muted-foreground">No actions allowed</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
