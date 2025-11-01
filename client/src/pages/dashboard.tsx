import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/sidebar";
import { MetricsGrid } from "@/features/reports";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TimePicker } from "@/components/ui/time-picker";
import { Plus, Search, BarChart3, Mail, Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { EnquiryForm } from "@/features/enquiries";
import { useLocation } from "wouter";
import type { EnquiryWithRelations, BookingWithRelations } from "@/types";
import { formatDate } from "@/utils/dateFormat";
import { getStatusColor, getStatusLabel } from "@/lib/status-utils";
import { BookingDetailsDialog } from "@/features/bookings";
import { formatIST, isFollowUpOverdue, nowIST } from "@shared/utils/timezone";

// Helper function to extract dot color from status color classes
const getStatusDotColor = (status: string): string => {
  const statusClasses = getStatusColor(status);
  // Extract the background color class and convert to dot color
  if (statusClasses.includes('bg-blue-100')) return 'bg-blue-500';
  if (statusClasses.includes('bg-yellow-100')) return 'bg-yellow-500';
  if (statusClasses.includes('bg-orange-100')) return 'bg-orange-500';
  if (statusClasses.includes('bg-purple-100')) return 'bg-purple-500';
  if (statusClasses.includes('bg-green-100')) return 'bg-green-500';
  if (statusClasses.includes('bg-gray-100')) return 'bg-gray-500';
  if (statusClasses.includes('bg-red-100')) return 'bg-red-500';
  if (statusClasses.includes('bg-emerald-100')) return 'bg-emerald-500';
  if (statusClasses.includes('bg-amber-100')) return 'bg-amber-500';
  if (statusClasses.includes('bg-lime-100')) return 'bg-lime-500';
  if (statusClasses.includes('bg-indigo-100')) return 'bg-indigo-500';
  return 'bg-gray-500'; // fallback
};

export default function Dashboard() {
  const { toast } = useToast();
  
  // Mutations for follow-up actions
  const completeFollowUpMutation = useMutation({
    mutationFn: async (followUpId: string) => {
      const response = await fetch(`/api/follow-ups/${followUpId}/complete`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to complete follow-up');
      return response.json();
    },
    onMutate: async (followUpId: string) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['/api/follow-ups'] });
      
      // Snapshot the previous value
      const previousFollowUps = queryClient.getQueryData<any[]>(['/api/follow-ups']);
      
      // Optimistically update to the new value
      if (previousFollowUps) {
        queryClient.setQueryData(['/api/follow-ups'], (old: any[] = []) =>
          old.map((followUp: any) =>
            followUp.id === followUpId
              ? { ...followUp, completed: true, completedAt: new Date().toISOString() }
              : followUp
          )
        );
      }
      
      // Return a context object with the snapshotted value
      return { previousFollowUps };
    },
    onError: (err, followUpId, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousFollowUps) {
        queryClient.setQueryData(['/api/follow-ups'], context.previousFollowUps);
      }
      toast({ title: "Error", description: "Failed to complete follow-up", variant: "destructive" });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Follow-up marked as complete" });
      // Invalidate all follow-up related caches
      queryClient.invalidateQueries({ queryKey: ['/api/follow-ups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/enquiries'] });
      // Close dialog and refresh if needed
      setShowFollowUpDetails(false);
    }
  });

  const rescheduleFollowUpMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/follow-ups/${id}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to reschedule follow-up');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Follow-up rescheduled successfully" });
      // Invalidate all follow-up related caches
      queryClient.invalidateQueries({ queryKey: ['/api/follow-ups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/enquiries'] });
      // Force refetch follow-ups data to update dashboard immediately
      queryClient.refetchQueries({ queryKey: ['/api/follow-ups'] });
      setShowRescheduleDialog(false);
      setSelectedFollowUpId(null);
      setRescheduleDate('');
      setRescheduleTime('');
      setRescheduleNotes('');
      // Close follow-up dialog to show updated data
      setShowFollowUpDetails(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to reschedule follow-up", variant: "destructive" });
    }
  });

  const handleCompleteFollowUp = (followUpId: string) => {
    completeFollowUpMutation.mutate(followUpId);
  };

  const handleRescheduleFollowUp = (followUpId: string) => {
    setSelectedFollowUpId(followUpId);
    setShowRescheduleDialog(true);
  };

  const handleCallClient = (phone: string) => {
    if (phone) {
      window.open(`tel:${phone}`, '_self');
    } else {
      toast({ title: "No phone number", description: "Phone number not available for this client", variant: "destructive" });
    }
  };

  const submitReschedule = () => {
    if (!selectedFollowUpId || !rescheduleDate || !rescheduleTime) {
      toast({ title: "Error", description: "Please fill in date and time", variant: "destructive" });
      return;
    }
    
    rescheduleFollowUpMutation.mutate({
      id: selectedFollowUpId,
      data: {
        followUpDate: rescheduleDate,
        followUpTime: rescheduleTime,
        notes: rescheduleNotes
      }
    });
  };
  const { isAuthenticated, isLoading, user } = useAuth();
  const [showEnquiryForm, setShowEnquiryForm] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithRelations | null>(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [selectedFollowUpType, setSelectedFollowUpType] = useState<string | null>(null);
  const [showFollowUpDetails, setShowFollowUpDetails] = useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [selectedFollowUpId, setSelectedFollowUpId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleNotes, setRescheduleNotes] = useState('');
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [, navigate] = useLocation();

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

  const { data: enquiries = [] } = useQuery<EnquiryWithRelations[]>({
    queryKey: ["/api/enquiries"],
    enabled: isAuthenticated,
  });

  const { data: bookings = [] } = useQuery<BookingWithRelations[]>({
    queryKey: ["/api/bookings"],
    enabled: isAuthenticated,
  });

  const { data: followUps = [] } = useQuery<any[]>({
    queryKey: ["/api/follow-ups"],
    enabled: isAuthenticated,
  });

  // Recent enquiries for dashboard (last 5 enquiries)
  const recentEnquiries = enquiries?.slice(0, 5) || [];
  // Show all bookings, not just filtered ones, for complete visibility
  const activeBookings = bookings?.slice(0, 5) || []; // Show latest 5 bookings
  
  // Follow-up reminders and stats
  const today = new Date();
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  
  // Categorize follow-ups using single logic to ensure no duplicates
  const categorizeFollowUp = (followUp: any) => {
    if (!followUp.followUpDate || followUp.completed) return 'completed';
    
    const followUpDate = new Date(followUp.followUpDate);
    const todayIST = nowIST();
    const todayDate = new Date(todayIST.getFullYear(), todayIST.getMonth(), todayIST.getDate());
    const followUpDateOnly = new Date(followUpDate.getFullYear(), followUpDate.getMonth(), followUpDate.getDate());
    
    // Check if it's overdue (before today OR today but past the time)
    if (followUpDateOnly.getTime() < todayDate.getTime()) {
      return 'overdue';
    }
    
    if (followUpDateOnly.getTime() === todayDate.getTime()) {
      // It's today - check if time has passed
      if (followUp.followUpTime) {
        const [hours, minutes] = followUp.followUpTime.split(':').map(Number);
        const followUpDateTime = new Date(todayIST);
        followUpDateTime.setHours(hours, minutes, 0, 0);
        
        if (followUpDateTime.getTime() < todayIST.getTime()) {
          return 'overdue';
        }
      }
      return 'today';
    }
    
    // Check if it's in the next 7 days
    if (followUpDateOnly.getTime() > todayDate.getTime() && followUpDateOnly.getTime() <= nextWeek.getTime()) {
      return 'upcoming';
    }
    
    return 'future'; // Beyond 7 days
  };

  // Categorize all follow-ups
  const categorizedFollowUps = (followUps || []).reduce((acc: any, followUp: any) => {
    const category = categorizeFollowUp(followUp);
    if (!acc[category]) acc[category] = [];
    acc[category].push(followUp);
    return acc;
  }, {});

  const overdueFollowUps = categorizedFollowUps.overdue || [];
  const todaysFollowUps = categorizedFollowUps.today || [];
  const upcomingFollowUps = categorizedFollowUps.upcoming || [];
  
  // All follow-ups for main panel
  const allFollowUps = (followUps || []).sort((a, b) => 
    new Date(a.followUpDate).getTime() - new Date(b.followUpDate).getTime()
  );

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <div className="hidden lg:block w-64 bg-card border-r animate-pulse"></div>
        <div className="flex-1 p-4 lg:p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 lg:h-8 bg-muted rounded w-32 lg:w-48"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-24 lg:h-32 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto lg:ml-0 ml-0 h-screen touch-pan-y" style={{ paddingTop: '0' }}>
        {/* Top Header */}
        <header className="bg-card border-b border-border px-4 lg:px-6 py-3 lg:py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex-1"></div>
            <div className="flex items-center gap-4 flex-1 justify-center">
              <div className="text-center">
                <h1 className="text-xl lg:text-2xl font-bold text-foreground">Dashboard</h1>
                <p className="text-sm text-muted-foreground hidden lg:block">{new Date().toLocaleDateString('en-IN', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</p>
              </div>
            </div>
            <div className="flex-1 flex justify-end">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 lg:gap-4 w-full lg:w-auto">
              <div className="relative flex-1 lg:flex-none">
                <Input
                  type="search"
                  placeholder="Search enquiries, bookings, clients..."
                  className="w-full lg:w-80 text-sm min-h-[44px] touch-manipulation"
                  value={globalSearchQuery}
                  onChange={(e) => setGlobalSearchQuery(e.target.value)}
                  data-testid="input-search"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && globalSearchQuery.trim()) {
                      // Navigate to enquiries page with search applied
                      navigate(`/enquiries?search=${encodeURIComponent(globalSearchQuery.trim())}`);
                    }
                  }}
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                {globalSearchQuery && (
                  <div className="absolute top-full left-0 right-0 bg-card border border-border rounded-md shadow-lg mt-1 z-50 max-h-64 overflow-y-auto">
                    <div className="p-2 text-xs text-muted-foreground border-b">Quick Search Results</div>
                    {/* Filter and show matching enquiries */}
                    {(enquiries || []).filter(enquiry => {
                      const query = globalSearchQuery.toLowerCase();
                      return enquiry.clientName.toLowerCase().includes(query) ||
                             enquiry.enquiryNumber.toLowerCase().includes(query) ||
                             enquiry.contactNumber.includes(query);
                    }).slice(0, 3).map(enquiry => (
                      <div 
                        key={enquiry.id} 
                        className="p-2 hover:bg-muted cursor-pointer border-b last:border-b-0"
                        onClick={() => {
                          setGlobalSearchQuery('');
                          navigate(`/enquiries?highlight=${enquiry.id}`);
                        }}
                      >
                        <div className="text-sm font-medium">{enquiry.clientName}</div>
                        <div className="text-xs text-muted-foreground">{enquiry.enquiryNumber} • {enquiry.eventType}</div>
                      </div>
                    ))}
                    {/* Filter and show matching bookings */}
                    {(bookings || []).filter(booking => {
                      const query = globalSearchQuery.toLowerCase();
                      return booking.clientName.toLowerCase().includes(query) ||
                             booking.bookingNumber.toLowerCase().includes(query) ||
                             booking.contactNumber.includes(query);
                    }).slice(0, 3).map(booking => (
                      <div 
                        key={booking.id} 
                        className="p-2 hover:bg-muted cursor-pointer border-b last:border-b-0"
                        onClick={() => {
                          setGlobalSearchQuery('');
                          navigate(`/bookings?highlight=${booking.id}`);
                        }}
                      >
                        <div className="text-sm font-medium">{booking.clientName}</div>
                        <div className="text-xs text-muted-foreground">{booking.bookingNumber} • ₹{booking.totalAmount?.toLocaleString()}</div>
                      </div>
                    ))}
                    {globalSearchQuery.trim() && (
                      <div className="p-2 text-center border-t">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => navigate(`/enquiries?search=${encodeURIComponent(globalSearchQuery.trim())}`)}
                          className="w-full"
                        >
                          See all results in Enquiries →
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              </div>
            </div>
          </div>
        </header>

        <div className="p-3 lg:p-6 pb-20 lg:pb-6">
          <MetricsGrid />

          {/* Follow-up Overview Widget - Enhanced */}
          <Card className="shadow-xl mb-6 lg:mb-8 border-0 bg-gradient-to-br from-white to-gray-50">
            <CardHeader className="pb-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-white" />
                </div>
                <CardTitle className="text-xl font-bold">Follow-up Overview</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
                <div 
                  className="text-center p-6 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200 cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] group"
                  onClick={() => {
                    setSelectedFollowUpType('today');
                    setShowFollowUpDetails(true);
                  }}
                >
                  <div className="text-3xl font-bold text-orange-800 mb-2 group-hover:scale-110 transition-transform" data-testid="stat-todays-followups">
                    {todaysFollowUps.length}
                  </div>
                  <div className="text-sm font-semibold text-orange-700">Today's Follow-ups</div>
                  <div className="text-xs text-orange-600 mt-1">Due today</div>
                </div>
                <div 
                  className="text-center p-6 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200 cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] group"
                  onClick={() => {
                    setSelectedFollowUpType('overdue');
                    setShowFollowUpDetails(true);
                  }}
                >
                  <div className="text-3xl font-bold text-red-800 mb-2 group-hover:scale-110 transition-transform" data-testid="stat-overdue-followups">
                    {overdueFollowUps.length}
                  </div>
                  <div className="text-sm font-semibold text-red-700">Overdue</div>
                  <div className="text-xs text-red-600 mt-1">Needs attention</div>
                </div>
                <div 
                  className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] group"
                  onClick={() => {
                    setSelectedFollowUpType('upcoming');
                    setShowFollowUpDetails(true);
                  }}
                >
                  <div className="text-3xl font-bold text-green-800 mb-2 group-hover:scale-110 transition-transform" data-testid="stat-upcoming-followups">
                    {upcomingFollowUps.length}
                  </div>
                  <div className="text-sm font-semibold text-green-700">Next 7 Days</div>
                  <div className="text-xs text-green-600 mt-1">Upcoming</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Action Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-6 lg:mb-8">
            {/* Recent Enquiries - Enhanced */}
            <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-blue-50/30">
              <CardHeader className="pb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <Mail className="w-4 h-4 text-white" />
                    </div>
                    <CardTitle className="text-xl font-bold">Recent Enquiries</CardTitle>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate("/enquiries")} data-testid="button-view-all-recent" className="hover:bg-blue-50">
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {recentEnquiries.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Mail className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-lg font-medium mb-2">No recent enquiries</p>
                    <p className="text-sm">New enquiries will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentEnquiries.map((enquiry) => (
                      <div key={enquiry.id} className="flex items-start space-x-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-blue-100 hover:border-blue-200 group cursor-pointer">
                        <div className={`w-3 h-3 ${getStatusDotColor(enquiry.status || 'new')} rounded-full mt-2 shadow-sm`}></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-muted-foreground font-mono bg-gray-100 px-2 py-1 rounded" data-testid={`enquiry-number-${enquiry.id}`}>
                              {enquiry.enquiryNumber}
                            </p>
                            <span className="text-xs text-muted-foreground font-medium">
                              {formatDate(enquiry.enquiryDate)}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-foreground mb-1 group-hover:text-blue-600 transition-colors" data-testid={`enquiry-client-${enquiry.id}`}>
                            {enquiry.clientName}
                          </p>
                          <p className="text-xs text-muted-foreground mb-3">
                            {enquiry.expectedPax} pax • {formatDate(enquiry.eventDate)}
                          </p>
                          <div className="flex items-center space-x-2">
                            <Badge className={`${getStatusColor(enquiry.status || 'new')} shadow-sm`}>
                              {getStatusLabel(enquiry.status || 'new')}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              by {enquiry.salesperson?.firstName} {enquiry.salesperson?.lastName}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Active Bookings - New */}
            <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-green-50/30">
              <CardHeader className="pb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-4 h-4 text-white" />
                    </div>
                    <CardTitle className="text-xl font-bold">Active Bookings</CardTitle>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate("/bookings")} data-testid="button-view-all-bookings" className="hover:bg-green-50">
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {activeBookings.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <BarChart3 className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-lg font-medium mb-2">No active bookings</p>
                    <p className="text-sm">Confirmed bookings will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeBookings.map((booking) => (
                      <div 
                        key={booking.id} 
                        className="flex items-start space-x-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-green-100 hover:border-green-200 group cursor-pointer"
                        onClick={() => {
                          // Check if user can access this booking
                          const canAccess = (user as any)?.role?.name === 'admin' || 
                                           (booking as any).salesperson?.id === (user as any)?.id ||
                                           (user as any)?.role?.name === 'manager';
                          
                          if (canAccess) {
                            setSelectedBooking(booking);
                            setShowBookingDetails(true);
                          } else {
                            toast({
                              title: "Access Denied",
                              description: "You can only access bookings assigned to you. Contact your manager if you need access to this booking.",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        <div className={`w-3 h-3 ${getStatusDotColor(booking.status || 'confirmed')} rounded-full mt-2 shadow-sm`}></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-muted-foreground font-mono bg-gray-100 px-2 py-1 rounded" data-testid={`booking-number-${booking.id}`}>
                              {booking.bookingNumber}
                            </p>
                            <span className="text-xs text-muted-foreground font-medium">
                              {formatDate(booking.eventDate)}
                              {booking.eventDuration > 1 && booking.eventEndDate && (
                                <> to {formatDate(booking.eventEndDate)}</>
                              )}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-foreground mb-1 group-hover:text-green-600 transition-colors" data-testid={`booking-client-${booking.id}`}>
                            {booking.clientName}
                          </p>
                          <p className="text-xs text-muted-foreground mb-3">
                            {booking.confirmedPax} pax • {booking.eventType || 'Event'}
                            {booking.eventDuration > 1 && (
                              <span className="ml-2 text-blue-600 dark:text-blue-400 font-medium">
                                • {booking.eventDuration} Day Event
                              </span>
                            )}
                          </p>
                          <div className="text-xs text-muted-foreground mb-2">
                            <div className="flex items-center gap-4">
                              <span>📞 {booking.contactNumber}</span>
                              {booking.eventDate && <span>📅 {formatDate(booking.eventDate)}</span>}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={`${getStatusColor(booking.status || 'confirmed')} shadow-sm`}>
                              {getStatusLabel(booking.status || 'confirmed')}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Client: {booking.clientName}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Follow-up List */}
          {allFollowUps.length > 0 && (
            <Card className="shadow-sm mb-8">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle>Follow-up List</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Select>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Follow-ups</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="today">Due Today</SelectItem>
                        <SelectItem value="upcoming">Upcoming</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted">
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Priority</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Client / Enquiry</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Event Date</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Salesperson</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Follow-up Due Date</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Notes</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allFollowUps.map((followUp) => {
                        const dueDate = new Date(followUp.followUpDate);
                        const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                        const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
                        let isOverdue = followUp.isOverdue || dueDateOnly.getTime() < todayDate.getTime();
                        
                        // Also check if it's today but the time has passed using IST
                        if (!isOverdue && dueDateOnly.getTime() === todayDate.getTime() && followUp.followUpTime) {
                          isOverdue = isFollowUpOverdue(followUp.followUpDate, followUp.followUpTime);
                        }
                        const isDueToday = dueDateOnly.getTime() === todayDate.getTime();
                        const priorityColor = isOverdue ? 'bg-red-100 text-red-800' : isDueToday ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800';
                        const priorityText = isOverdue ? 'OVERDUE' : isDueToday ? 'DUE TODAY' : 'UPCOMING';
                        
                        return (
                          <tr key={followUp.id} className="border-b border-border hover:bg-background">
                            <td className="p-4">
                              <Badge className={priorityColor} data-testid={`priority-${followUp.id}`}>
                                {priorityText}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <div className="text-xs text-muted-foreground font-mono" data-testid={`followup-enquiry-${followUp.id}`}>
                                {followUp.enquiryNumber}
                              </div>
                              <div className="text-sm text-foreground">{followUp.clientName}</div>
                            </td>
                            <td className="p-4">
                              <div className="text-sm text-foreground">
                                {followUp.eventDate ? formatDate(followUp.eventDate) : 'TBD'}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="text-sm text-foreground">
                                {followUp.salesperson?.firstName} {followUp.salesperson?.lastName}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="text-sm text-red-600 font-medium">
                                {formatDate(followUp.followUpDate)}
                              </div>
                            </td>
                            <td className="p-4 max-w-xs">
                              <div className="text-sm text-foreground truncate" title={followUp.notes || ''}>
                                {followUp.notes || '-'}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex space-x-1">
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="text-green-600 hover:bg-green-50" 
                                  data-testid={`button-mark-done-${followUp.id}`}
                                  onClick={(e) => {
                                e.stopPropagation();
                                handleCompleteFollowUp(followUp.id);
                              }}
                                  disabled={completeFollowUpMutation.isPending}
                                  title="Mark Complete"
                                >
                                  ✓
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="text-blue-600 hover:bg-blue-50" 
                                  data-testid={`button-reschedule-${followUp.id}`}
                                  onClick={(e) => {
                                e.stopPropagation();
                                handleRescheduleFollowUp(followUp.id);
                              }}
                                  disabled={rescheduleFollowUpMutation.isPending}
                                  title="Reschedule"
                                >
                                  ↻
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="text-orange-600 hover:bg-orange-50" 
                                  data-testid={`button-call-client-${followUp.id}`}
                                  onClick={(e) => {
                                e.stopPropagation();
                                handleCallClient(followUp.clientPhone);
                              }}
                                  title="Call Client"
                                >
                                  📞
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

        </div>

        {/* Floating Action Button */}
        <Button
          className="fixed bottom-6 right-6 w-14 h-14 lg:w-16 lg:h-16 rounded-full shadow-lg touch-manipulation z-40"
          onClick={() => setShowEnquiryForm(true)}
          data-testid="button-floating-new-enquiry"
        >
          <Plus className="w-6 h-6 lg:w-7 lg:h-7" />
        </Button>

        <EnquiryForm open={showEnquiryForm} onOpenChange={setShowEnquiryForm} />
        <BookingDetailsDialog 
          booking={selectedBooking} 
          open={showBookingDetails} 
          onOpenChange={setShowBookingDetails} 
        />

        {/* Follow-up Details Dialog */}
        <Dialog open={showFollowUpDetails} onOpenChange={setShowFollowUpDetails}>
          <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader className="space-y-2 pb-4">
              <DialogTitle className="text-lg sm:text-xl">
                {selectedFollowUpType === 'today' && `Today's Follow-ups (${todaysFollowUps.length})`}
                {selectedFollowUpType === 'overdue' && `Overdue Follow-ups (${overdueFollowUps.length})`}
                {selectedFollowUpType === 'upcoming' && `Upcoming Follow-ups (${upcomingFollowUps.length})`}
              </DialogTitle>
              <DialogDescription className="text-sm">
                Complete list of follow-ups for the selected category
              </DialogDescription>
            </DialogHeader>
            
            <div className="overflow-x-auto">
              {((selectedFollowUpType === 'today' && todaysFollowUps.length > 0) ||
                (selectedFollowUpType === 'overdue' && overdueFollowUps.length > 0) ||
                (selectedFollowUpType === 'upcoming' && upcomingFollowUps.length > 0)) ? (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted">
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Client / Enquiry</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Contact</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Event Date</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Salesperson</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Due Date</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Notes</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedFollowUpType === 'today' && todaysFollowUps.map((followUp: any) => (
                      <tr key={followUp.id} className="border-b border-border hover:bg-muted/50">
                        <td className="p-4">
                          <div className="font-medium text-foreground">{followUp.clientName}</div>
                          <div className="text-sm text-muted-foreground font-mono">{followUp.enquiryNumber}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm text-foreground">{followUp.clientPhone}</div>
                          <div className="text-xs text-muted-foreground">{followUp.clientEmail}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm text-foreground">
                            {followUp.eventDate ? formatDate(followUp.eventDate) : 'Not set'}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm text-foreground">
                            {followUp.salespersonFirstName} {followUp.salespersonLastName}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm text-foreground">
                            {formatDate(followUp.followUpDate)}
                          </div>
                          <div className="text-xs text-orange-600 font-medium">
                            {followUp.followUpTime} • TODAY
                          </div>
                        </td>
                        <td className="p-4 max-w-xs">
                          <div className="text-sm text-foreground truncate" title={followUp.notes}>
                            {followUp.notes || 'No notes'}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex space-x-1">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-green-600 hover:bg-green-50" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCompleteFollowUp(followUp.id);
                              }}
                              disabled={completeFollowUpMutation.isPending}
                              data-testid={`button-complete-followup-${followUp.id}`}
                              title="Mark Complete"
                            >
                              ✓
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-blue-600 hover:bg-blue-50" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRescheduleFollowUp(followUp.id);
                              }}
                              data-testid={`button-reschedule-followup-${followUp.id}`}
                              title="Reschedule"
                            >
                              📅
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-purple-600 hover:bg-purple-50" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCallClient(followUp.clientPhone);
                              }}
                              data-testid={`button-call-followup-${followUp.id}`}
                              title="Call Client"
                            >
                              📞
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    
                    {selectedFollowUpType === 'overdue' && overdueFollowUps.map((followUp: any) => (
                      <tr key={followUp.id} className="border-b border-border hover:bg-muted/50">
                        <td className="p-4">
                          <div className="font-medium text-foreground">{followUp.clientName}</div>
                          <div className="text-sm text-muted-foreground font-mono">{followUp.enquiryNumber}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm text-foreground">{followUp.clientPhone}</div>
                          <div className="text-xs text-muted-foreground">{followUp.clientEmail}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm text-foreground">
                            {followUp.eventDate ? formatDate(followUp.eventDate) : 'Not set'}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm text-foreground">
                            {followUp.salespersonFirstName} {followUp.salespersonLastName}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm text-foreground">
                            {formatDate(followUp.followUpDate)}
                          </div>
                          <div className="text-xs text-red-600 font-medium">
                            {followUp.followUpTime} • OVERDUE
                          </div>
                        </td>
                        <td className="p-4 max-w-xs">
                          <div className="text-sm text-foreground truncate" title={followUp.notes}>
                            {followUp.notes || 'No notes'}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex space-x-1">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-green-600 hover:bg-green-50" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCompleteFollowUp(followUp.id);
                              }}
                              disabled={completeFollowUpMutation.isPending}
                              data-testid={`button-complete-followup-${followUp.id}`}
                              title="Mark Complete"
                            >
                              ✓
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-blue-600 hover:bg-blue-50" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRescheduleFollowUp(followUp.id);
                              }}
                              data-testid={`button-reschedule-followup-${followUp.id}`}
                              title="Reschedule"
                            >
                              📅
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-purple-600 hover:bg-purple-50" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCallClient(followUp.clientPhone);
                              }}
                              data-testid={`button-call-followup-${followUp.id}`}
                              title="Call Client"
                            >
                              📞
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    
                    {selectedFollowUpType === 'upcoming' && upcomingFollowUps.map((followUp: any) => (
                      <tr key={followUp.id} className="border-b border-border hover:bg-muted/50">
                        <td className="p-4">
                          <div className="font-medium text-foreground">{followUp.clientName}</div>
                          <div className="text-sm text-muted-foreground font-mono">{followUp.enquiryNumber}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm text-foreground">{followUp.clientPhone}</div>
                          <div className="text-xs text-muted-foreground">{followUp.clientEmail}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm text-foreground">
                            {followUp.eventDate ? formatDate(followUp.eventDate) : 'Not set'}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm text-foreground">
                            {followUp.salespersonFirstName} {followUp.salespersonLastName}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm text-foreground">
                            {formatDate(followUp.followUpDate)}
                          </div>
                          <div className="text-xs text-green-600 font-medium">
                            {followUp.followUpTime} • UPCOMING
                          </div>
                        </td>
                        <td className="p-4 max-w-xs">
                          <div className="text-sm text-foreground truncate" title={followUp.notes}>
                            {followUp.notes || 'No notes'}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex space-x-1">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-green-600 hover:bg-green-50" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCompleteFollowUp(followUp.id);
                              }}
                              disabled={completeFollowUpMutation.isPending}
                              data-testid={`button-complete-followup-${followUp.id}`}
                              title="Mark Complete"
                            >
                              ✓
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-blue-600 hover:bg-blue-50" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRescheduleFollowUp(followUp.id);
                              }}
                              data-testid={`button-reschedule-followup-${followUp.id}`}
                              title="Reschedule"
                            >
                              📅
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-purple-600 hover:bg-purple-50" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCallClient(followUp.clientPhone);
                              }}
                              data-testid={`button-call-followup-${followUp.id}`}
                              title="Call Client"
                            >
                              📞
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="text-lg mb-2">No follow-ups found</div>
                  <div className="text-sm">
                    {selectedFollowUpType === 'today' && 'No follow-ups scheduled for today'}
                    {selectedFollowUpType === 'overdue' && 'No overdue follow-ups'}
                    {selectedFollowUpType === 'upcoming' && 'No upcoming follow-ups in the next 7 days'}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Reschedule Dialog */}
        <Dialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
          <DialogContent className="max-w-md w-[95vw] sm:w-full">
            <DialogHeader>
              <DialogTitle>Reschedule Follow-up</DialogTitle>
              <DialogDescription>
                Select new date and time for this follow-up
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rescheduleDate">New Date</Label>
                  <Input
                    id="rescheduleDate"
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    data-testid="input-reschedule-date"
                  />
                </div>
                <div>
                  <Label htmlFor="rescheduleTime">New Time</Label>
                  <TimePicker
                    id="rescheduleTime"
                    value={rescheduleTime}
                    onChange={setRescheduleTime}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="rescheduleNotes">Notes (optional)</Label>
                <Textarea
                  id="rescheduleNotes"
                  placeholder="Add notes for the rescheduled follow-up..."
                  value={rescheduleNotes}
                  onChange={(e) => setRescheduleNotes(e.target.value)}
                  data-testid="textarea-reschedule-notes"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowRescheduleDialog(false)}
                  data-testid="button-cancel-reschedule"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={submitReschedule}
                  disabled={rescheduleFollowUpMutation.isPending}
                  data-testid="button-save-reschedule"
                >
                  {rescheduleFollowUpMutation.isPending ? "Saving..." : "Reschedule"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
