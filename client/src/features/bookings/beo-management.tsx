import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/sidebar";
import BeoForm from "./components/beo-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Filter, Eye, Edit, CheckCircle, XCircle, Clock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { getStatusColor, getStatusLabel } from "@/lib/status-utils";
import type { BeoWithRelations } from "@/types";

export default function BeoManagement() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [showBeoForm, setShowBeoForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Note: Since there's no direct BEO listing endpoint, we'll need to fetch all bookings and their BEOs
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<any[]>({
    queryKey: ["/api/bookings"],
    enabled: isAuthenticated,
  });

  const updateBeoMutation = useMutation({
    mutationFn: async ({ beoId, status }: { beoId: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/beos/${beoId}`, { status });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "BEO updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update BEO",
        variant: "destructive",
      });
    },
  });

  const getUrgencyClass = (createdAt: string) => {
    const createdDate = new Date(createdAt);
    const daysSinceCreated = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceCreated >= 2) {
      return 'border-l-4 border-l-red-500';
    } else if (daysSinceCreated >= 1) {
      return 'border-l-4 border-l-orange-500';
    }
    return 'border-l-4 border-l-blue-500';
  };

  // Transform bookings data to show BEO information
  const beoData = (bookings || []).flatMap((booking: any) => 
    booking.beos?.map((beo: any) => ({
      ...beo,
      booking: {
        bookingNumber: booking.bookingNumber,
        clientName: booking.clientName,
        eventDate: booking.eventDate,
      }
    })) || []
  );

  const filteredBeos = beoData.filter((beo: any) => {
    if (statusFilter !== "all" && beo.status !== statusFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        beo.beoNumber.toLowerCase().includes(query) ||
        beo.booking?.clientName.toLowerCase().includes(query) ||
        beo.booking?.bookingNumber.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const pendingBeos = filteredBeos.filter((beo: any) => beo.status === 'pending_verification');
  const draftBeos = filteredBeos.filter((beo: any) => beo.status === 'draft');
  const approvedBeos = filteredBeos.filter((beo: any) => beo.status === 'approved');

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <div className="w-64 bg-card border-r animate-pulse"></div>
        <div className="flex-1 p-6 animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-6"></div>
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <header className="bg-card border-b border-border px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-foreground">BEO Management</h2>
            <Button onClick={() => setShowBeoForm(true)} data-testid="button-new-beo">
              <Plus className="w-4 h-4 mr-2" />
              New BEO
            </Button>
          </div>
        </header>

        <div className="p-6">
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative">
              <Input
                type="search"
                placeholder="Search by BEO number, client, booking..."
                className="w-80"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-beos"
              />
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending_verification">Pending Verification</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon">
              <Filter className="w-4 h-4" />
            </Button>
          </div>

          <Tabs defaultValue="pending" className="space-y-6">
            <TabsList>
              <TabsTrigger value="pending" className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Pending Verification ({pendingBeos.length})</span>
              </TabsTrigger>
              <TabsTrigger value="draft">
                Draft ({draftBeos.length})
              </TabsTrigger>
              <TabsTrigger value="approved">
                Approved ({approvedBeos.length})
              </TabsTrigger>
              <TabsTrigger value="all">
                All BEOs ({filteredBeos.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              <Card className="shadow-md border-0">
                <CardHeader>
                  <CardTitle className="text-lg text-orange-600">
                    Pending Verification - Requires Immediate Attention
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pendingBeos.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No BEOs pending verification
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pendingBeos.map((beo: any) => (
                        <div key={beo.id} className={`p-4 bg-card border rounded-lg ${getUrgencyClass(beo.createdAt)}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <span className="text-sm font-medium text-foreground font-mono" data-testid={`beo-number-${beo.id}`}>
                                  {beo.beoNumber}
                                </span>
                                <Badge className={getStatusColor(beo.status)}>
                                  {beo.status.replace('_', ' ')}
                                </Badge>
                                {Math.floor((Date.now() - new Date(beo.createdAt).getTime()) / (1000 * 60 * 60 * 24)) >= 2 && (
                                  <Badge variant="destructive">Overdue</Badge>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Booking:</span>
                                  <span className="ml-2 font-medium">{beo.booking?.bookingNumber}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Client:</span>
                                  <span className="ml-2 font-medium">{beo.booking?.clientName}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Event Date:</span>
                                  <span className="ml-2">{new Date(beo.booking?.eventDate).toLocaleDateString()}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Created:</span>
                                  <span className="ml-2">{new Date(beo.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                              {beo.createdBy && (
                                <div className="text-xs text-muted-foreground mt-2">
                                  Created by: {beo.createdBy.firstName} {beo.createdBy.lastName}
                                </div>
                              )}
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                onClick={() => updateBeoMutation.mutate({ beoId: beo.id, status: 'approved' })}
                                disabled={updateBeoMutation.isPending}
                                data-testid={`button-approve-beo-${beo.id}`}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateBeoMutation.mutate({ beoId: beo.id, status: 'rejected' })}
                                disabled={updateBeoMutation.isPending}
                                data-testid={`button-reject-beo-${beo.id}`}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Reject
                              </Button>
                              <Button size="sm" variant="ghost" data-testid={`button-view-beo-${beo.id}`}>
                                <Eye className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="draft">
              <Card className="shadow-md border-0">
                <CardHeader>
                  <CardTitle>Draft BEOs</CardTitle>
                </CardHeader>
                <CardContent>
                  {draftBeos.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No draft BEOs
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {draftBeos.map((beo: any) => (
                        <div key={beo.id} className="p-4 bg-card border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-foreground font-mono">
                              {beo.beoNumber}
                            </span>
                            <Badge className={getStatusColor(beo.status)}>Draft</Badge>
                          </div>
                          <div className="space-y-1 text-sm">
                            <div>
                              <span className="text-muted-foreground">Booking:</span>
                              <span className="ml-2">{beo.booking?.bookingNumber}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Client:</span>
                              <span className="ml-2">{beo.booking?.clientName}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Event Date:</span>
                              <span className="ml-2">{new Date(beo.booking?.eventDate).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex space-x-2 mt-3">
                            <Button size="sm" variant="outline" data-testid={`button-edit-beo-${beo.id}`}>
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => updateBeoMutation.mutate({ beoId: beo.id, status: 'pending_verification' })}
                              disabled={updateBeoMutation.isPending}
                              data-testid={`button-submit-beo-${beo.id}`}
                            >
                              Submit for Verification
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="approved">
              <Card className="shadow-md border-0">
                <CardHeader>
                  <CardTitle>Approved BEOs</CardTitle>
                </CardHeader>
                <CardContent>
                  {approvedBeos.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No approved BEOs
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border bg-muted">
                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">BEO #</th>
                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Booking</th>
                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Client</th>
                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Event Date</th>
                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Approved By</th>
                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {approvedBeos.map((beo: any) => (
                            <tr key={beo.id} className="border-b border-border hover:bg-background">
                              <td className="p-4">
                                <span className="text-sm font-medium text-foreground font-mono">
                                  {beo.beoNumber}
                                </span>
                              </td>
                              <td className="p-4">
                                <span className="text-sm">{beo.booking?.bookingNumber}</span>
                              </td>
                              <td className="p-4">
                                <span className="text-sm">{beo.booking?.clientName}</span>
                              </td>
                              <td className="p-4">
                                <span className="text-sm">{new Date(beo.booking?.eventDate).toLocaleDateString()}</span>
                              </td>
                              <td className="p-4">
                                <div className="text-sm">
                                  {beo.verifiedBy?.firstName} {beo.verifiedBy?.lastName}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {beo.verifiedAt && new Date(beo.verifiedAt).toLocaleDateString()}
                                </div>
                              </td>
                              <td className="p-4">
                                <Button size="sm" variant="ghost" data-testid={`button-view-approved-beo-${beo.id}`}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="all">
              <Card className="shadow-md border-0">
                <CardHeader>
                  <CardTitle>All BEOs</CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredBeos.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No BEOs found
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border bg-muted">
                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">BEO #</th>
                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Booking</th>
                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Client</th>
                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Event Date</th>
                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Created</th>
                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredBeos.map((beo: any) => (
                            <tr key={beo.id} className="border-b border-border hover:bg-background">
                              <td className="p-4">
                                <span className="text-sm font-medium text-foreground font-mono">
                                  {beo.beoNumber}
                                </span>
                              </td>
                              <td className="p-4">
                                <span className="text-sm">{beo.booking?.bookingNumber}</span>
                              </td>
                              <td className="p-4">
                                <span className="text-sm">{beo.booking?.clientName}</span>
                              </td>
                              <td className="p-4">
                                <span className="text-sm">{new Date(beo.booking?.eventDate).toLocaleDateString()}</span>
                              </td>
                              <td className="p-4">
                                <Badge className={getStatusColor(beo.status)}>
                                  {beo.status.replace('_', ' ')}
                                </Badge>
                              </td>
                              <td className="p-4">
                                <div className="text-sm">{new Date(beo.createdAt).toLocaleDateString()}</div>
                                <div className="text-xs text-muted-foreground">
                                  {beo.createdBy?.firstName} {beo.createdBy?.lastName}
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex space-x-1">
                                  <Button size="sm" variant="ghost" data-testid={`button-view-all-beo-${beo.id}`}>
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  {beo.status === 'draft' && (
                                    <Button size="sm" variant="ghost" data-testid={`button-edit-all-beo-${beo.id}`}>
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <BeoForm open={showBeoForm} onOpenChange={setShowBeoForm} />
      </main>
    </div>
  );
}
