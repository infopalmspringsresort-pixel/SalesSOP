import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Calendar, MapPin, Clock, Users, Eye, MoreHorizontal } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { useVenues } from "@/hooks/useVenues";

const EVENT_TYPES = [
  'wedding', 'corporate', 'birthday', 'conference', 'anniversary', 
  'product_launch', 'charity_gala', 'family_reunion', 'meeting', 'dinner'
];

const STATUS_COLORS = {
  tentative: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  booked: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  closed: 'bg-gray-100 text-gray-800 border-gray-200'
};

const EVENT_TYPE_COLORS = {
  wedding: 'bg-pink-100 text-pink-800',
  corporate: 'bg-blue-100 text-blue-800',
  birthday: 'bg-purple-100 text-purple-800',
  conference: 'bg-indigo-100 text-indigo-800',
  anniversary: 'bg-rose-100 text-rose-800',
  product_launch: 'bg-orange-100 text-orange-800',
  charity_gala: 'bg-emerald-100 text-emerald-800',
  family_reunion: 'bg-amber-100 text-amber-800',
  meeting: 'bg-gray-100 text-gray-800',
  dinner: 'bg-cyan-100 text-cyan-800'
};

interface BookingSession {
  _id?: string;
  sessionName: string;
  sessionLabel?: string;
  venue: string;
  startTime: string;
  endTime: string;
  sessionDate: string;
  paxCount: number;
  specialInstructions?: string;
}

interface Booking {
  _id: string;
  bookingNumber: string;
  clientName: string;
  eventType: string;
  eventDate: string;
  eventEndDate?: string;
  confirmedPax: number;
  status: string;
  sessions: BookingSession[];
  hall?: string;
  eventStartTime?: string;
  eventEndTime?: string;
}

interface VenueBooking {
  id: string;
  bookingId: string;
  bookingNumber: string;
  clientName: string;
  eventType: string;
  venue: string;
  sessionName: string;
  sessionLabel?: string;
  date: Date;
  startTime: string;
  endTime: string;
  paxCount: number;
  status: string;
  specialInstructions?: string;
}

// Custom hook for responsive design
function useResponsive() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768); // md breakpoint
      setIsTablet(width >= 768 && width < 1024); // lg breakpoint
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return { isMobile, isTablet };
}

export default function VenueCalendarGrid() {
  const [currentMonth, setCurrentMonth] = useState(new Date(2025, 9, 1)); // October 2025
  const [selectedVenue, setSelectedVenue] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showAllBookings, setShowAllBookings] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDayBookings, setSelectedDayBookings] = useState<VenueBooking[]>([]);
  const { isMobile, isTablet } = useResponsive();
  const { data: venues = [], isLoading: venuesLoading, isError: venuesError } = useVenues();

  const venueOptions = useMemo(
    () =>
      venues.map((venue) => ({
        id: venue.id ?? venue.name,
        name: venue.name,
      })),
    [venues]
  );

  // Handle "View All" click
  const handleViewAllClick = (date: Date, dayBookings: VenueBooking[]) => {
    setSelectedDate(date);
    setSelectedDayBookings(dayBookings);
    setShowAllBookings(true);
  };

  // Get booking color for dots
  const getBookingDotColor = (booking: VenueBooking): string => {
    const statusColors: Record<string, string> = {
      'booked': '#10B981', // green
      'tentative': '#F59E0B', // yellow
      'cancelled': '#EF4444', // red
      'closed': '#6B7280', // gray
    };
    return statusColors[booking.status] || '#6B7280';
  };

  // Get event type color for dots
  const getEventTypeDotColor = (eventType: string): string => {
    const eventColors: Record<string, string> = {
      'wedding': '#EC4899', // pink
      'corporate': '#3B82F6', // blue
      'birthday': '#8B5CF6', // purple
      'conference': '#6366F1', // indigo
      'anniversary': '#F43F5E', // rose
      'product_launch': '#F97316', // orange
      'charity_gala': '#059669', // emerald
      'family_reunion': '#D97706', // amber
      'meeting': '#6B7280', // gray
      'dinner': '#06B6D4', // cyan
    };
    return eventColors[eventType] || '#6B7280';
  };

  // Fetch bookings data
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['/api/bookings'],
    queryFn: async () => {
      const response = await fetch('/api/bookings');
      if (!response.ok) throw new Error('Failed to fetch bookings');
      return response.json();
    },
  });

  // Fetch converted and ongoing enquiries to show as tentative
  const { data: enquiries = [] } = useQuery({
    queryKey: ['/api/enquiries'],
    queryFn: async () => {
      const response = await fetch('/api/enquiries');
      if (!response.ok) throw new Error('Failed to fetch enquiries');
      return response.json();
    },
  });

  // Transform bookings data to venue bookings
  const venueBookings = useMemo(() => {
    const transformed: VenueBooking[] = [];
    
    // Add converted and ongoing enquiries as tentative bookings
    const convertedEnquiries = enquiries.filter((enq: any) => (enq.status === 'converted' || enq.status === 'ongoing') && enq.eventDate);
    convertedEnquiries.forEach((enquiry: any) => {
      transformed.push({
        id: `enquiry-${enquiry.id}`,
        bookingId: enquiry.id,
        bookingNumber: `ENQ-${enquiry.enquiryNumber?.split('-').slice(-1)[0] || ''}`,
        clientName: enquiry.clientName,
        eventType: enquiry.eventType,
        venue: 'TBD',
        sessionName: enquiry.eventType,
        sessionLabel: 'Tentative',
        date: new Date(enquiry.eventDate),
        startTime: '09:00',
        endTime: '18:00',
        paxCount: enquiry.expectedPax || 0,
        status: 'tentative',
        specialInstructions: enquiry.notes || ''
      });
    });
    
    // Add actual bookings
    bookings.forEach((booking: Booking) => {
      // Check if this is a multi-day booking
      const isMultiDay = booking.eventEndDate && booking.eventEndDate !== booking.eventDate;
      
      // Handle bookings with sessions
      if (booking.sessions && booking.sessions.length > 0) {
        // If multi-day booking, show sessions on all days
        if (isMultiDay) {
          const startDate = new Date(booking.eventDate);
          const endDate = new Date(booking.eventEndDate);
          
          // For each day of the booking
          const currentDate = new Date(startDate);
          while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            
            // Add all sessions for this day
            booking.sessions.forEach((session: BookingSession) => {
              transformed.push({
                id: `${booking._id}-${session._id || session.sessionName}-${dateStr}`,
                bookingId: booking._id,
                bookingNumber: booking.bookingNumber,
                clientName: booking.clientName,
                eventType: booking.eventType,
                venue: session.venue,
                sessionName: session.sessionName,
                sessionLabel: session.sessionLabel ? 
                  `${session.sessionLabel} (Day ${Math.ceil((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1})` : 
                  `Day ${Math.ceil((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1}`,
                date: new Date(currentDate),
                startTime: session.startTime,
                endTime: session.endTime,
                paxCount: session.paxCount || booking.confirmedPax,
                status: booking.status,
                specialInstructions: session.specialInstructions
              });
            });
            
            currentDate.setDate(currentDate.getDate() + 1);
          }
        } else {
          // Single day booking - show sessions normally
          booking.sessions.forEach((session: BookingSession) => {
            transformed.push({
              id: `${booking._id}-${session._id || session.sessionName}`,
              bookingId: booking._id,
              bookingNumber: booking.bookingNumber,
              clientName: booking.clientName,
              eventType: booking.eventType,
              venue: session.venue,
              sessionName: session.sessionName,
              sessionLabel: session.sessionLabel,
              date: new Date(session.sessionDate),
              startTime: session.startTime,
              endTime: session.endTime,
              paxCount: session.paxCount || booking.confirmedPax,
              status: booking.status,
              specialInstructions: session.specialInstructions
            });
          });
        }
      } else {
        // Handle bookings without sessions (multi-day bookings)
        const startDate = new Date(booking.eventDate);
        const endDate = booking.eventEndDate ? new Date(booking.eventEndDate) : startDate;
        
        // Create venue booking for each day of the multi-day event
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          transformed.push({
            id: `${booking._id}-${currentDate.toISOString().split('T')[0]}`,
            bookingId: booking._id,
            bookingNumber: booking.bookingNumber,
            clientName: booking.clientName,
            eventType: booking.eventType,
            venue: booking.hall || 'TBD',
            sessionName: booking.eventType,
            sessionLabel: currentDate.getTime() === startDate.getTime() ? 'Start' : 
                         currentDate.getTime() === endDate.getTime() ? 'End' : 'Middle',
            date: new Date(currentDate),
            startTime: booking.eventStartTime || '09:00',
            endTime: booking.eventEndTime || '18:00',
            paxCount: booking.confirmedPax,
            status: booking.status,
            specialInstructions: ''
          });
          
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
    });
    
    return transformed;
  }, [bookings, enquiries]);

  // Filter venue bookings
  const filteredBookings = useMemo(() => {
    return venueBookings.filter(booking => {
      const venueMatch = selectedVenue === 'all' || booking.venue === selectedVenue;
      const statusMatch = selectedStatus === 'all' || booking.status === selectedStatus;
      return venueMatch && statusMatch;
    });
  }, [venueBookings, selectedVenue, selectedStatus]);

  // Get bookings for current month
  const currentMonthBookings = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    return filteredBookings.filter(booking => {
      const bookingDate = booking.date;
      return bookingDate >= monthStart && bookingDate <= monthEnd;
    });
  }, [filteredBookings, currentMonth]);

  // Get calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = new Date(monthStart);
    startDate.setDate(startDate.getDate() - startDate.getDay()); // Start from Sunday
    const endDate = new Date(monthEnd);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay())); // End on Saturday
    
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  // Get bookings for a specific date (including multi-day bookings)
  const getBookingsForDate = (date: Date) => {
    return currentMonthBookings.filter(booking => {
      // Check if the date matches the booking date
      return isSameDay(booking.date, date);
    });
  };

  // Check for venue conflicts on a specific date (only time overlaps, not just multiple bookings)
  const getVenueConflicts = (date: Date) => {
    const dayBookings = getBookingsForDate(date);
    const conflicts: string[] = [];
    
    // Group bookings by venue
    const venueGroups = dayBookings.reduce((acc, booking) => {
      if (!acc[booking.venue]) {
        acc[booking.venue] = [];
      }
      acc[booking.venue].push(booking);
      return acc;
    }, {} as Record<string, VenueBooking[]>);

    // Check for time overlaps within each venue
    Object.entries(venueGroups).forEach(([venue, bookings]) => {
      if (bookings.length > 1) {
        // Sort bookings by start time
        const sortedBookings = bookings.sort((a, b) => a.startTime.localeCompare(b.startTime));
        
        // Check for overlaps
        for (let i = 0; i < sortedBookings.length - 1; i++) {
          const current = sortedBookings[i];
          const next = sortedBookings[i + 1];
          
          // Convert time strings to comparable format
          const currentEnd = current.endTime;
          const nextStart = next.startTime;
          
          // If current booking ends after next booking starts, there's a conflict
          if (currentEnd > nextStart) {
            conflicts.push(venue);
            break; // Only need to flag the venue once
          }
        }
      }
    });

    return conflicts;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => 
      direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">Venue Calendar</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{format(currentMonth, 'MMMM yyyy')}</span>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Select
            value={selectedVenue}
            onValueChange={setSelectedVenue}
            disabled={venuesLoading || venuesError}
          >
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Select venue" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Venues</SelectItem>
              {venueOptions.length === 0 ? (
                <SelectItem disabled value="no-venues">
                  {venuesLoading
                    ? "Loading venues..."
                    : venuesError
                      ? "Failed to load venues"
                      : "No venues available"}
                </SelectItem>
              ) : (
                venueOptions.map((venue) => (
                  <SelectItem key={venue.id} value={venue.name}>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{venue.name}</span>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="tentative">Tentative</SelectItem>
              <SelectItem value="booked">Booked</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateMonth('prev')}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentMonth(new Date())}
        >
          Today
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateMonth('next')}
          className="flex items-center gap-2"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="border rounded-lg overflow-hidden">
        {/* Calendar Header */}
        <div className="grid grid-cols-7 bg-muted/50">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className={`${isMobile ? 'p-2' : 'p-3'} text-center text-sm font-medium text-muted-foreground`}>
              {isMobile ? day.charAt(0) : day}
            </div>
          ))}
        </div>

        {/* Calendar Body */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => {
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, new Date());
            const dayBookings = getBookingsForDate(day);
            const conflicts = getVenueConflicts(day);
            const hasConflicts = conflicts.length > 0;
            
            return (
              <div
                key={day.toISOString()}
                className={`${isMobile ? 'min-h-20' : 'min-h-40'} border-r border-b border-border p-2 ${
                  isCurrentMonth ? 'bg-background' : 'bg-muted/30'
                } ${isToday ? 'bg-primary/10' : ''} ${
                  hasConflicts ? 'ring-2 ring-orange-300 bg-orange-50/50' : ''
                }`}
              >
                <div className={`text-sm font-medium mb-2 flex items-center gap-1 ${
                  isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'
                } ${isToday ? 'text-primary font-bold' : ''}`}>
                  {format(day, 'd')}
                  {hasConflicts && (
                    <div className="w-2 h-2 bg-orange-500 rounded-full" title="Venue conflicts detected" />
                  )}
                </div>
                
                {/* Mobile: iPhone-style dots */}
                {isMobile ? (
                  <div className="flex flex-col items-center space-y-1">
                    {dayBookings.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-1 max-w-full">
                        {dayBookings.slice(0, 6).map((booking, index) => (
                          <div
                            key={booking.id}
                            className="w-2 h-2 rounded-full cursor-pointer hover:scale-125 transition-transform duration-200"
                            style={{ backgroundColor: getBookingDotColor(booking) }}
                            title={`${booking.clientName} - ${booking.sessionName} (${booking.startTime})`}
                            onClick={() => handleViewAllClick(day, dayBookings)}
                          />
                        ))}
                        {dayBookings.length > 6 && (
                          <div
                            className="w-2 h-2 rounded-full bg-gray-400 cursor-pointer hover:scale-125 transition-transform duration-200"
                            title={`+${dayBookings.length - 6} more bookings`}
                            onClick={() => handleViewAllClick(day, dayBookings)}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Desktop: Detailed cards */
                  <div className="space-y-1">
                    {dayBookings.slice(0, 2).map(booking => (
                      <div
                        key={booking.id}
                        className={`text-xs p-1.5 rounded border cursor-pointer hover:shadow-sm transition-all duration-200 ${
                          STATUS_COLORS[booking.status as keyof typeof STATUS_COLORS] || 'bg-gray-100 text-gray-800'
                        }`}
                        title={`${booking.clientName} - ${booking.sessionName} at ${booking.venue} (${booking.startTime}-${booking.endTime})`}
                      >
                        <div className="font-medium truncate text-xs">{booking.clientName}</div>
                        <div className="text-xs opacity-75 truncate">{booking.sessionName}</div>
                        <div className="flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />
                          <span className="text-xs truncate">{booking.venue}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span className="text-xs">{booking.startTime}</span>
                          <Users className="w-3 h-3 ml-1" />
                          <span className="text-xs">{booking.paxCount}</span>
                        </div>
                      </div>
                    ))}
                    
                    {dayBookings.length > 2 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs h-6 p-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                        onClick={() => handleViewAllClick(day, dayBookings)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View All ({dayBookings.length})
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium">Status:</span>
          {Object.entries(STATUS_COLORS).map(([status, className]) => (
            <Badge key={status} variant="outline" className={className}>
              {status}
            </Badge>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentMonthBookings.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Booked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {currentMonthBookings.filter(b => b.status === 'booked').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tentative</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {currentMonthBookings.filter(b => b.status === 'tentative').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Venues Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(currentMonthBookings.map(b => b.venue)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Venue-specific breakdown */}
      {selectedVenue !== 'all' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              {selectedVenue} - Booking Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {currentMonthBookings
                .sort((a, b) => a.date.getTime() - b.date.getTime())
                .map(booking => (
                  <div key={booking.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{booking.clientName}</div>
                      <div className="text-sm text-muted-foreground">{booking.sessionName}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(booking.date, 'MMM dd, yyyy')} • {booking.startTime} - {booking.endTime}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={STATUS_COLORS[booking.status as keyof typeof STATUS_COLORS]}>
                        {booking.status}
                      </Badge>
                      <div className="text-sm text-muted-foreground mt-1">
                        {booking.paxCount} guests
                      </div>
                    </div>
                  </div>
                ))}
              {currentMonthBookings.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No bookings found for {selectedVenue} in {format(currentMonth, 'MMMM yyyy')}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* View All Bookings Dialog */}
      <Dialog open={showAllBookings} onOpenChange={setShowAllBookings}>
        <DialogContent className={`${isMobile ? 'w-[90vw] h-[70vh] max-w-none mx-auto my-4' : 'max-w-4xl max-h-[80vh]'} overflow-y-auto`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              All Bookings for {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </DialogTitle>
          </DialogHeader>
          
          <div className={`space-y-${isMobile ? '2' : '3'}`}>
            {selectedDayBookings.map((booking, index) => (
              <Card key={booking.id} className="border-l-4 border-l-blue-500">
                <CardContent className={`${isMobile ? 'p-3' : 'p-4'}`}>
                  <div className={`flex ${isMobile ? 'flex-col' : 'items-start justify-between'}`}>
                    <div className="flex-1">
                      <div className={`flex items-center gap-2 mb-2 ${isMobile ? 'flex-wrap' : ''}`}>
                        <h3 className={`font-semibold ${isMobile ? 'text-base' : 'text-lg'}`}>{booking.clientName}</h3>
                        <Badge 
                          variant="outline" 
                          className={`${isMobile ? 'text-xs' : ''} ${
                            STATUS_COLORS[booking.status as keyof typeof STATUS_COLORS] || 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {booking.status}
                        </Badge>
                      </div>
                      
                      <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-4 text-sm`}>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className="font-medium">Session:</span>
                            <span className={isMobile ? 'text-xs' : ''}>{booking.sessionName}</span>
                            {booking.sessionLabel && (
                              <span className={`text-gray-600 ${isMobile ? 'text-xs' : ''}`}>({booking.sessionLabel})</span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-500" />
                            <span className="font-medium">Venue:</span>
                            <span className={isMobile ? 'text-xs' : ''}>{booking.venue}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span className="font-medium">Time:</span>
                            <span className={isMobile ? 'text-xs' : ''}>{booking.startTime} - {booking.endTime}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-gray-500" />
                            <span className="font-medium">Guests:</span>
                            <span className={isMobile ? 'text-xs' : ''}>{booking.paxCount}</span>
                          </div>
                        </div>
                      </div>
                      
                      {booking.specialInstructions && (
                        <div className={`${isMobile ? 'mt-2 p-2' : 'mt-3 p-2'} bg-gray-50 rounded text-sm ${isMobile ? 'text-xs' : ''}`}>
                          <span className="font-medium">Special Instructions:</span>
                          <p className="text-gray-700">{booking.specialInstructions}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className={`text-right text-sm text-gray-500 ${isMobile ? 'mt-2 text-left' : ''}`}>
                      <div className={isMobile ? 'text-xs' : ''}>#{booking.bookingNumber}</div>
                      <div className={`capitalize ${isMobile ? 'text-xs' : ''}`}>{booking.eventType}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {selectedDayBookings.length === 0 && (
            <div className={`text-center text-gray-500 ${isMobile ? 'py-6' : 'py-8'}`}>
              <Calendar className={`mx-auto mb-4 text-gray-300 ${isMobile ? 'w-8 h-8' : 'w-12 h-12'}`} />
              <p className={isMobile ? 'text-sm' : ''}>No bookings found for this day</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
