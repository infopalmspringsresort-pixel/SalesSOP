import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Search, Filter, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookingDetailsDialog } from "@/features/bookings";
import type { BookingWithRelations } from "@/types";

interface CalendarBooking {
  id: string;
  booking: BookingWithRelations;
  startDate: Date;
  endDate: Date;
  isMultiDay: boolean;
  sessions: any[];
  color: string;
}

// Generate consistent colors for bookings
function getBookingColor(bookingId: string): string {
  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ];
  let hash = 0;
  for (let i = 0; i < bookingId.length; i++) {
    hash = bookingId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// Check if a time is morning (before 2 PM) or evening (after 2 PM)
function isMorningSession(startTime: string): boolean {
  const hour = parseInt(startTime.split(':')[0]);
  return hour < 14; // Before 2 PM = morning/left half
}

export default function SplitCellCalendar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState<BookingWithRelations | null>(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  
  // Filters
  const [venueFilter, setVenueFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Function to check if user can access booking modal
  const canAccessBookingModal = (booking: BookingWithRelations) => {
    if (!user) return false;
    
    // Admin can access all bookings
    if (user.role?.name === 'admin') return true;
    
    // Check if user is the assigned salesperson
    if (booking.salesperson?.id === user.id) return true;
    
    // Manager can access bookings assigned to their team members
    if (user.role?.name === 'manager') {
      return true;
    }
    
    // Staff can only view (read-only access)
    if (user.role?.name === 'staff') return false;
    
    return false;
  };

  // Function to handle booking click with access control
  const handleBookingClick = (booking: BookingWithRelations) => {
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

  const { data: bookings = [] } = useQuery<BookingWithRelations[]>({
    queryKey: ["/api/bookings"],
  });

  // Process bookings for calendar display
  const calendarBookings: CalendarBooking[] = useMemo(() => {
    return (bookings || []).map(booking => {
      const startDate = new Date(booking.eventDate);
      let endDate = new Date(booking.eventDate);
      
      // Handle multi-day events
      if (booking.eventEndDate) {
        endDate = new Date(booking.eventEndDate);
      }

      const isMultiDay = startDate.getTime() !== endDate.getTime();

      return {
        id: booking.id,
        booking,
        startDate,
        endDate,
        isMultiDay,
        sessions: booking.sessions || [],
        color: getBookingColor(booking.id)
      };
    });
  }, [bookings]);

  // Filter bookings
  const filteredBookings = useMemo(() => {
    return calendarBookings.filter(calBooking => {
      const booking = calBooking.booking;
      if (venueFilter !== "all" && booking.hall !== venueFilter) return false;
      if (statusFilter !== "all" && booking.status !== statusFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return booking.clientName.toLowerCase().includes(query) ||
               booking.bookingNumber.toLowerCase().includes(query);
      }
      return true;
    });
  }, [calendarBookings, venueFilter, statusFilter, searchQuery]);

  // Generate calendar grid
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday
    
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay())); // End on Saturday
    
    const days = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  const calendarDays = generateCalendarDays();

  // Get bookings for a specific date
  const getBookingsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    
    return filteredBookings.filter(calBooking => {
      const startStr = calBooking.startDate.toISOString().split('T')[0];
      const endStr = calBooking.endDate.toISOString().split('T')[0];
      
      return dateStr >= startStr && dateStr <= endStr;
    });
  };

  // Group bookings by position for stacking
  const getBookingsByPosition = (date: Date, position: 'morning' | 'evening' | 'full') => {
    const dayBookings = getBookingsForDate(date);
    return dayBookings.filter(calBooking => {
      const bookingPosition = getBookingPosition(date, calBooking);
      return bookingPosition === position;
    });
  };

  // Check for conflicts in the same venue and same half
  const hasConflict = (date: Date, calBooking: CalendarBooking, position: string) => {
    const dayBookings = getBookingsForDate(date);
    const sessions = getSessionsForDate(date, calBooking);
    
    if (sessions.length === 0) return false;
    
    const currentVenue = sessions[0].venue;
    
    return dayBookings.some(otherBooking => {
      if (otherBooking.id === calBooking.id) return false;
      
      const otherPosition = getBookingPosition(date, otherBooking);
      if (otherPosition !== position) return false;
      
      const otherSessions = getSessionsForDate(date, otherBooking);
      if (otherSessions.length === 0) return false;
      
      return otherSessions.some((session: any) => session.venue === currentVenue);
    });
  };

  // Get sessions for a specific date
  const getSessionsForDate = (date: Date, calBooking: CalendarBooking) => {
    const dateStr = date.toISOString().split('T')[0];
    
    return calBooking.sessions.filter((session: any) => {
      const sessionDateStr = session.sessionDate.split('T')[0];
      return sessionDateStr === dateStr;
    });
  };

  // Determine booking position in date cell
  const getBookingPosition = (date: Date, calBooking: CalendarBooking) => {
    const dateStr = date.toISOString().split('T')[0];
    const startStr = calBooking.startDate.toISOString().split('T')[0];
    const endStr = calBooking.endDate.toISOString().split('T')[0];

    // Multi-day booking logic
    if (calBooking.isMultiDay) {
      if (dateStr === startStr) {
        return 'start'; // Right half (check-in at 2 PM)
      } else if (dateStr === endStr) {
        return 'end'; // Left half (check-out at 10 AM)
      } else {
        return 'middle'; // Full width
      }
    }

    // Single day booking - check sessions
    const sessions = getSessionsForDate(date, calBooking);
    if (sessions.length > 0) {
      // Use first session to determine position
      return isMorningSession(sessions[0].startTime) ? 'morning' : 'evening';
    }

    // Default for bookings without sessions
    return 'full';
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">Booking Calendar</CardTitle>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('prev')}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-lg font-semibold min-w-[200px] text-center">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('next')}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              <Input
                placeholder="Search bookings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
                data-testid="input-search"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40" data-testid="select-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="booked">Booked</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-0">
          <div className="calendar-grid">
            {/* Week day headers */}
            <div className="grid grid-cols-7 border-b">
              {weekDays.map(day => (
                <div key={day} className="p-3 font-semibold text-center border-r last:border-r-0">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7">
              {calendarDays.map((date, index) => {
                const dayBookings = getBookingsForDate(date);
                const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                const isToday = new Date().toDateString() === date.toDateString();

                return (
                  <div
                    key={index}
                    className={`relative min-h-[120px] border-r border-b last:border-r-0 ${
                      !isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''
                    } ${isToday ? 'bg-blue-50' : ''}`}
                  >
                    {/* Date number */}
                    <div className="absolute top-2 left-2 text-sm font-medium z-10">
                      {date.getDate()}
                    </div>

                    {/* Split cell content */}
                    <div className="h-full flex">
                      {/* Left half (morning/check-out) */}
                      <div className="flex-1 relative p-1 pt-8">
                        {dayBookings.map((calBooking, idx) => {
                          const position = getBookingPosition(date, calBooking);
                          const sessions = getSessionsForDate(date, calBooking);
                          const conflict = hasConflict(date, calBooking, position);
                          
                          if (position === 'morning' || position === 'end') {
                            return (
                              <div
                                key={calBooking.id}
                                className={`text-xs p-1 mb-1 rounded cursor-pointer hover:opacity-80 transition-opacity ${
                                  conflict ? 'ring-2 ring-red-500' : ''
                                }`}
                                style={{ 
                                  backgroundColor: calBooking.color, 
                                  color: 'white',
                                  height: '20px',
                                  marginTop: `${idx * 2}px`
                                }}
                                onClick={() => handleBookingClick(calBooking.booking)}
                                title={`${calBooking.booking.clientName} - ${calBooking.booking.eventType}${
                                  conflict ? ' (CONFLICT!)' : ''
                                }`}
                                data-testid={`booking-${calBooking.id}`}
                              >
                                <div className="truncate">
                                  {sessions.length > 0 ? sessions[0].sessionName : calBooking.booking.clientName}
                                </div>
                              </div>
                            );
                          }
                          
                          if (position === 'full') {
                            return (
                              <div
                                key={calBooking.id}
                                className={`text-xs p-1 mb-1 rounded cursor-pointer hover:opacity-80 transition-opacity ${
                                  conflict ? 'ring-2 ring-red-500' : ''
                                }`}
                                style={{ 
                                  backgroundColor: calBooking.color, 
                                  color: 'white',
                                  height: '20px',
                                  marginTop: `${idx * 2}px`
                                }}
                                onClick={() => handleBookingClick(calBooking.booking)}
                                title={`${calBooking.booking.clientName} - ${calBooking.booking.eventType}${
                                  conflict ? ' (CONFLICT!)' : ''
                                }`}
                                data-testid={`booking-${calBooking.id}`}
                              >
                                <div className="truncate">{calBooking.booking.clientName}</div>
                              </div>
                            );
                          }
                          
                          return null;
                        })}
                      </div>

                      {/* Right half (evening/check-in) */}
                      <div className="flex-1 relative p-1 pt-8 border-l border-gray-200">
                        {dayBookings.map((calBooking, idx) => {
                          const position = getBookingPosition(date, calBooking);
                          const sessions = getSessionsForDate(date, calBooking);
                          const conflict = hasConflict(date, calBooking, position);
                          
                          if (position === 'evening' || position === 'start') {
                            return (
                              <div
                                key={calBooking.id}
                                className={`text-xs p-1 mb-1 rounded cursor-pointer hover:opacity-80 transition-opacity ${
                                  conflict ? 'ring-2 ring-red-500' : ''
                                }`}
                                style={{ 
                                  backgroundColor: calBooking.color, 
                                  color: 'white',
                                  height: '20px',
                                  marginTop: `${idx * 2}px`
                                }}
                                onClick={() => handleBookingClick(calBooking.booking)}
                                title={`${calBooking.booking.clientName} - ${calBooking.booking.eventType}${
                                  conflict ? ' (CONFLICT!)' : ''
                                }`}
                                data-testid={`booking-${calBooking.id}`}
                              >
                                <div className="truncate">
                                  {sessions.length > 0 ? sessions[0].sessionName : calBooking.booking.clientName}
                                </div>
                              </div>
                            );
                          }
                          
                          return null;
                        })}
                      </div>
                    </div>

                    {/* Multi-day continuous line */}
                    {dayBookings.map(calBooking => {
                      const position = getBookingPosition(date, calBooking);
                      
                      if (position === 'middle') {
                        return (
                          <div
                            key={`line-${calBooking.id}`}
                            className="absolute inset-x-0 top-1/2 h-6 -translate-y-1/2 cursor-pointer hover:opacity-80 transition-opacity flex items-center justify-center"
                            style={{ backgroundColor: calBooking.color }}
                            onClick={() => {
                              setSelectedBooking(calBooking.booking);
                              setShowBookingDetails(true);
                            }}
                            title={`${calBooking.booking.clientName} - ${calBooking.booking.eventType}`}
                            data-testid={`booking-line-${calBooking.id}`}
                          >
                            <span className="text-xs text-white font-medium truncate px-2">
                              {calBooking.booking.clientName}
                            </span>
                          </div>
                        );
                      }
                      
                      return null;
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent>
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span>Left Half: Morning Sessions / Check-out (10 AM)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span>Right Half: Evening Sessions / Check-in (2 PM)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-4 bg-purple-500 rounded"></div>
              <span>Continuous Line: Multi-day Booking</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Booking Details Dialog */}
      {selectedBooking && (
        <BookingDetailsDialog
          booking={selectedBooking}
          open={showBookingDetails}
          onOpenChange={setShowBookingDetails}
        />
      )}
    </div>
  );
}