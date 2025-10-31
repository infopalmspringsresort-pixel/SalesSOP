import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Filter, Eye, FileText, Edit, CreditCard, Phone, Calendar, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import type { BookingWithRelations } from "@/types";
import { formatDate } from "@/utils/dateFormat";
import { getStatusColor, getStatusLabel, bookingStatusOptions } from "@/lib/status-utils";
import BookingDetailsDialog from "./components/booking-details-dialog";

export default function Bookings() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [amountFilter, setAmountFilter] = useState("all");
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

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

  // Function to check if user can access booking modal
  const canAccessBookingModal = (booking: any) => {
    if (!user) return false;
    
    // Admin can access all bookings
    if (user.role?.name === 'admin') return true;
    
    // Check if user is the assigned salesperson
    if (booking.salesperson?.id === user.id) return true;
    
    // Manager can access bookings assigned to their team members
    if (user.role?.name === 'manager') {
      // For now, managers can access all bookings
      // You can add team membership logic here if needed
      return true;
    }
    
    // Staff can only view (read-only access)
    if (user.role?.name === 'staff') return false;
    
    return false;
  };

  // Function to handle booking row click
  const handleBookingClick = (booking: any) => {
    if (canAccessBookingModal(booking)) {
      setSelectedBooking(booking);
      setShowBookingDetails(true);
    } else {
      toast({
        title: "Access Denied",
        description: "You can only access bookings assigned to you. Contact your manager if you need access to this booking.",
        variant: "destructive",
      });
    }
  };

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<any[]>({
    queryKey: statusFilter !== "all" 
      ? ["/api/bookings", { status: statusFilter }]
      : ["/api/bookings"],
    enabled: isAuthenticated,
  });

  // Handle URL search parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get('search');
    const highlightParam = urlParams.get('highlight');
    
    if (searchParam) {
      setSearchQuery(searchParam);
    }
    
    if (highlightParam && (bookings || []).length > 0) {
      const bookingToHighlight = (bookings || []).find(b => b.id === highlightParam);
      if (bookingToHighlight) {
        setSelectedBooking(bookingToHighlight);
        setShowBookingDetails(true);
      }
    }
  }, [bookings]);

  const filteredBookings = (bookings || []).filter(booking => {
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = (
        booking.bookingNumber.toLowerCase().includes(query) ||
        booking.clientName.toLowerCase().includes(query) ||
        booking.contactNumber.includes(query) ||
        booking.enquiryNumber.toLowerCase().includes(query) ||
        (booking.email && booking.email.toLowerCase().includes(query)) ||
        (booking.salesperson?.firstName && booking.salesperson.firstName.toLowerCase().includes(query)) ||
        (booking.salesperson?.lastName && booking.salesperson.lastName.toLowerCase().includes(query))
      );
      if (!matchesSearch) return false;
    }
    
    // Status filter
    if (statusFilter !== "all" && booking.status !== statusFilter) {
      return false;
    }

    // Event type filter
    if (eventTypeFilter !== "all" && booking.eventType !== eventTypeFilter) {
      return false;
    }
    
    // Date filter
    if (dateFilter !== "all" && booking.eventDate) {
      const eventDate = new Date(booking.eventDate);
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      
      switch (dateFilter) {
        case "today":
          if (eventDate.toDateString() !== today.toDateString()) return false;
          break;
        case "tomorrow":
          if (eventDate.toDateString() !== tomorrow.toDateString()) return false;
          break;
        case "this_week":
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          if (eventDate < weekStart || eventDate > weekEnd) return false;
          break;
        case "next_week":
          const nextWeekStart = new Date(today);
          nextWeekStart.setDate(today.getDate() + (7 - today.getDay()));
          const nextWeekEnd = new Date(nextWeekStart);
          nextWeekEnd.setDate(nextWeekStart.getDate() + 6);
          if (eventDate < nextWeekStart || eventDate > nextWeekEnd) return false;
          break;
        case "this_month":
          if (eventDate.getMonth() !== today.getMonth() || eventDate.getFullYear() !== today.getFullYear()) return false;
          break;
        case "next_month":
          const nextMonth = new Date(today);
          nextMonth.setMonth(today.getMonth() + 1);
          if (eventDate.getMonth() !== nextMonth.getMonth() || eventDate.getFullYear() !== nextMonth.getFullYear()) return false;
          break;
      }
    }
    
    // Amount filter
    if (amountFilter !== "all" && booking.totalQuotedAmount) {
      const amount = booking.totalQuotedAmount;
      switch (amountFilter) {
        case "under_50k":
          if (amount >= 50000) return false;
          break;
        case "50k_to_100k":
          if (amount < 50000 || amount >= 100000) return false;
          break;
        case "100k_to_500k":
          if (amount < 100000 || amount >= 500000) return false;
          break;
        case "above_500k":
          if (amount < 500000) return false;
          break;
      }
    }
    
    return true;
  });

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
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto h-screen touch-pan-y" style={{ paddingTop: '0' }}>
        <header className="bg-card border-b border-border px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-12 lg:w-0"></div>
            <h2 className="text-2xl font-semibold text-foreground text-center flex-1">
              Bookings
            </h2>
            <div className="w-12 lg:w-0"></div>
          </div>
        </header>

        <div className="p-6 pb-20 lg:pb-6">
          <Card className="shadow-lg border-0">
            <CardHeader className="pb-3 lg:pb-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <CardTitle className="text-lg lg:text-xl">All Bookings</CardTitle>
                <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:space-x-4 lg:gap-0">
                  {/* Search - Full width on mobile */}
                  <div className="relative w-full lg:w-80">
                    <Input
                      type="search"
                      placeholder="Search by booking number, client name..."
                      className="w-full"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      data-testid="input-search-bookings"
                    />
                    <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                  
                  {/* Filters */}
                  <div className="flex items-center gap-2">
                    <Popover open={showFilters} onOpenChange={setShowFilters}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="relative">
                          <Filter className="w-4 h-4 mr-2" />
                          Filters
                          {(statusFilter !== "all" || eventTypeFilter !== "all" || dateFilter !== "all" || amountFilter !== "all") && (
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-0 max-h-96 overflow-hidden" align="end">
                        <div className="p-4 border-b">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold">Filter Bookings</h3>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowFilters(false)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="p-4 space-y-4 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                          <div>
                            <Label className="text-sm font-medium mb-2 block">Status</Label>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {bookingStatusOptions.map(option => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-sm font-medium mb-2 block">Event Type</Label>
                            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Events</SelectItem>
                                <SelectItem value="wedding">Wedding</SelectItem>
                                <SelectItem value="corporate">Corporate</SelectItem>
                                <SelectItem value="birthday">Birthday</SelectItem>
                                <SelectItem value="anniversary">Anniversary</SelectItem>
                                <SelectItem value="social">Social</SelectItem>
                                <SelectItem value="conference">Conference</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label className="text-sm font-medium mb-2 block">Date Range</Label>
                            <Select value={dateFilter} onValueChange={setDateFilter}>
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Dates</SelectItem>
                                <SelectItem value="today">Today</SelectItem>
                                <SelectItem value="tomorrow">Tomorrow</SelectItem>
                                <SelectItem value="this_week">This Week</SelectItem>
                                <SelectItem value="next_week">Next Week</SelectItem>
                                <SelectItem value="this_month">This Month</SelectItem>
                                <SelectItem value="next_month">Next Month</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label className="text-sm font-medium mb-2 block">Amount Range</Label>
                            <Select value={amountFilter} onValueChange={setAmountFilter}>
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Amounts</SelectItem>
                                <SelectItem value="under_50k">Under ₹50K</SelectItem>
                                <SelectItem value="50k_to_100k">₹50K - ₹1L</SelectItem>
                                <SelectItem value="100k_to_500k">₹1L - ₹5L</SelectItem>
                                <SelectItem value="above_500k">Above ₹5L</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div className="p-4 border-t bg-background sticky bottom-0">
                          <div className="flex justify-between">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSearchQuery("");
                                setStatusFilter("all");
                                setEventTypeFilter("all");
                                setDateFilter("all");
                                setAmountFilter("all");
                              }}
                            >
                              Clear All
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => setShowFilters(false)}
                            >
                              Apply Filters
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Badge className="bg-blue-100 text-blue-800">{filteredBookings.length} Total</Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              {bookingsLoading ? (
                <div className="space-y-4">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="h-16 bg-muted rounded animate-pulse"></div>
                  ))}
                </div>
              ) : filteredBookings.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">No bookings found</p>
                  <p className="text-sm text-muted-foreground">
                    Bookings will appear here when enquiries are marked as 'booked'
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-muted/60">
                          <th className="text-left p-4 text-sm font-semibold text-muted-foreground tracking-wide">Booking #</th>
                          <th className="text-left p-4 text-sm font-semibold text-muted-foreground tracking-wide">Client Details</th>
                          <th className="text-left p-4 text-sm font-semibold text-muted-foreground tracking-wide">Event Details</th>
                          <th className="text-left p-4 text-sm font-semibold text-muted-foreground tracking-wide">Salesperson</th>
                          <th className="text-left p-4 text-sm font-semibold text-muted-foreground tracking-wide">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBookings.map((booking) => {
                          
                          return (
                            <tr key={booking.id} className="border-b border-border hover:bg-muted/30 cursor-pointer transition-colors duration-150"
                                onClick={() => handleBookingClick(booking)}>
                              <td className="p-4 align-top">
                                <div className="text-xs text-muted-foreground font-mono" data-testid={`booking-number-${booking.id}`}>
                                  {booking.bookingNumber}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  From {booking.enquiryNumber}
                                </div>
                              </td>
                              <td className="p-4 align-top">
                                <div className="text-base font-semibold text-foreground leading-tight mb-1">{booking.clientName}</div>
                                <div className="text-xs text-muted-foreground">{booking.contactNumber}</div>
                                {booking.email && (
                                  <div className="text-xs text-muted-foreground">{booking.email}</div>
                                )}
                              </td>
                              <td className="p-4 align-top">
                                <div className="text-sm text-foreground">
                                  {formatDate(booking.eventDate)}
                                  {booking.eventDuration > 1 && booking.eventEndDate && (
                                    <span className="text-xs text-muted-foreground ml-2">
                                      to {formatDate(booking.eventEndDate)}
                                    </span>
                                  )}
                                </div>
                                {booking.eventDuration > 1 && (
                                  <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                    {booking.eventDuration} Day Event
                                  </div>
                                )}
                                {(booking.eventStartTime || booking.eventEndTime) && (
                                  <div className="text-xs text-muted-foreground">
                                    {booking.eventStartTime} - {booking.eventEndTime || 'TBD'}
                                  </div>
                                )}
                                <div className="text-xs text-muted-foreground">
                                  {booking.confirmedPax} pax • {booking.eventType?.replace('_', ' ') || 'Event'}
                                </div>
                              </td>
                              <td className="p-4 align-top">
                                <div className="text-sm text-foreground">
                                  {booking.salesperson?.firstName && booking.salesperson?.lastName ? 
                    `${booking.salesperson.firstName} ${booking.salesperson.lastName}` : 
                    'TBD'
                  }
                                </div>
                                {canAccessBookingModal(booking) && (
                                  <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                                    ✓ You can manage
                                  </div>
                                )}
                                {!canAccessBookingModal(booking) && user?.role?.name !== 'admin' && (
                                  <div className="text-xs text-muted-foreground">
                                    View only
                                  </div>
                                )}
                              </td>
                              <td className="p-4 align-top">
                                <Badge className={getStatusColor(booking.status || 'booked')}>
                                  {getStatusLabel(booking.status || 'booked')}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View - Enhanced for touch */}
                  <div className="lg:hidden space-y-3 pb-20">
                    {filteredBookings.map((booking) => {

                      return (
                        <Card 
                          key={booking.id} 
                          className="cursor-pointer hover:shadow-lg transition-all border-l-4 border-l-green-400 shadow-md border-0 touch-manipulation min-h-[120px]"
                          onClick={() => {
                            setSelectedBooking(booking);
                            setShowBookingDetails(true);
                          }}
                          data-testid={`booking-card-${booking.id}`}
                        >
                          <CardContent className="p-4 touch-manipulation">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <div className="font-mono text-xs text-muted-foreground" data-testid={`booking-number-${booking.id}`}>
                                  {booking.bookingNumber}
                                </div>
                                <div className="font-semibold text-base text-foreground" data-testid={`booking-client-${booking.id}`}>
                                  {booking.clientName}
                                </div>
                              </div>
                              <Badge className={getStatusColor(booking.status || 'booked')}>
                                {getStatusLabel(booking.status || 'booked')}
                              </Badge>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Phone className="w-3 h-3" />
                                <span>{booking.contactNumber}</span>
                              </div>
                              
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                <span className="font-medium">
                                  {formatDate(booking.eventDate)}
                                  {booking.eventDuration > 1 && booking.eventEndDate && (
                                    <> to {formatDate(booking.eventEndDate)}</>
                                  )}
                                  • {booking.confirmedPax} PAX
                                </span>
                              </div>
                              
                              {booking.eventDuration > 1 && (
                                <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                  {booking.eventDuration} Day Event
                                </div>
                              )}
                              
                              {(booking.eventStartTime || booking.eventEndTime) && (
                                <div className="text-sm text-muted-foreground font-medium">
                                  {booking.eventStartTime} - {booking.eventEndTime || 'TBD'}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <BookingDetailsDialog 
          booking={selectedBooking} 
          open={showBookingDetails} 
          onOpenChange={setShowBookingDetails} 
        />
      </main>
    </div>
  );
}
