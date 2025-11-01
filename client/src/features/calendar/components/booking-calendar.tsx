import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarIcon, Search, Users, MapPin, Clock } from "lucide-react";
import { BookingDetailsDialog } from "@/features/bookings";
import type { BookingWithRelations } from "@/types";
import { format } from "date-fns";
import { VenueDisplay } from "@/components/ui/venue-display";

interface BookingDateEntry {
  booking: BookingWithRelations;
  eventDate: Date;
  isMultiDay: boolean;
  dateIndex: number;
  totalDays: number;
}

export default function BookingCalendar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedBooking, setSelectedBooking] = useState<BookingWithRelations | null>(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: bookings = [] } = useQuery<BookingWithRelations[]>({
    queryKey: ["/api/bookings"],
  });

  // Create grouped bookings for display
  const groupedBookings = useMemo(() => {
    const filteredBookings = (bookings || []).filter(booking => {
      // Only show booked bookings (exclude cancelled, closed)
      const isActive = booking.status && !['cancelled', 'closed'].includes(booking.status.toLowerCase());
      
      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesSearch = 
          booking.clientName.toLowerCase().includes(query) ||
          booking.bookingNumber.toLowerCase().includes(query) ||
          booking.eventType.toLowerCase().includes(query) ||
          (booking.hall && booking.hall.toLowerCase().includes(query));
        return isActive && matchesSearch;
      }
      
      return isActive;
    });

    const grouped = filteredBookings.map(booking => {
      const startDate = new Date(booking.eventDate);
      const entries: BookingDateEntry[] = [];
      
      if (booking.eventEndDate) {
        // Multi-day booking - create entry for each date
        const endDate = new Date(booking.eventEndDate);
        const currentDate = new Date(startDate);
        let dateIndex = 0;
        
        // Calculate total days including both start and end dates
        const timeDiff = endDate.getTime() - startDate.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        const totalDays = daysDiff + 1; // +1 to include both start and end dates
        
        // Create entries for each day including the end date
        while (currentDate.getTime() <= endDate.getTime()) {
          entries.push({
            booking,
            eventDate: new Date(currentDate),
            isMultiDay: true,
            dateIndex,
            totalDays
          });
          currentDate.setDate(currentDate.getDate() + 1);
          dateIndex++;
        }
      } else {
        // Single day booking
        entries.push({
          booking,
          eventDate: startDate,
          isMultiDay: false,
          dateIndex: 0,
          totalDays: 1
        });
      }
      
      return {
        booking,
        entries,
        isMultiDay: entries.length > 1
      };
    });
    
    // Sort by first event date
    grouped.sort((a, b) => a.entries[0].eventDate.getTime() - b.entries[0].eventDate.getTime());
    
    return grouped;
  }, [bookings, searchQuery]);

  // Calculate total entries for display
  const totalEntries = groupedBookings.reduce((sum, group) => sum + group.entries.length, 0);

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

  const handleRowClick = (booking: BookingWithRelations) => {
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

  const getSalespersonName = (booking: BookingWithRelations) => {
    const name = `${(booking as any).salesperson?.firstName || ''} ${(booking as any).salesperson?.lastName || ''}`.trim();
    return name || 'Not Assigned';
  };

  // Function to determine if this booking needs a top border
  const needsTopBorder = (entry: BookingDateEntry, index: number) => {
    if (entry.isMultiDay && entry.dateIndex === 0) return true; // First day of multi-day
    if (!entry.isMultiDay) return true; // Single day booking
    return false;
  };
  
  // Function to determine if this booking needs a bottom border
  const needsBottomBorder = (entry: BookingDateEntry, index: number) => {
    if (entry.isMultiDay && entry.dateIndex === entry.totalDays - 1) return true; // Last day of multi-day
    if (!entry.isMultiDay) return true; // Single day booking
    return false;
  };
  
  // Function to get color based on event type
  const getEventTypeColor = (eventType: string) => {
    const type = eventType.toLowerCase();
    if (type.includes('birthday')) return 'border-l-purple-500 bg-purple-50/30';
    if (type.includes('wedding')) return 'border-l-pink-500 bg-pink-50/30';
    if (type.includes('corporate') || type.includes('business')) return 'border-l-blue-500 bg-blue-50/30';
    return 'border-l-gray-500 bg-gray-50/30';
  };

  // Function to determine if this row should show booking details (first row only for multi-day)
  const shouldShowBookingDetails = (entry: BookingDateEntry) => {
    if (!entry.isMultiDay) return true;
    // Show details only on the first row for multi-day events
    return entry.dateIndex === 0;
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50/30 min-h-screen">
      {/* Table Section */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto rounded-xl border border-border shadow-sm">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-border">
                <th className="text-left px-6 py-4 text-sm font-bold text-foreground tracking-wide">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    Event Date
                  </div>
                </th>
                <th className="text-left px-6 py-4 text-sm font-bold text-foreground tracking-wide">Booking ID</th>
                <th className="text-left px-6 py-4 text-sm font-bold text-foreground tracking-wide">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Client Name
                  </div>
                </th>
                <th className="text-left px-6 py-4 text-sm font-bold text-foreground tracking-wide">Event Type</th>
                <th className="text-left px-6 py-4 text-sm font-bold text-foreground tracking-wide">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Venue
                  </div>
                </th>
                <th className="text-left px-6 py-4 text-sm font-bold text-foreground tracking-wide">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Sessions
                  </div>
                </th>
                <th className="text-left px-6 py-4 text-sm font-bold text-foreground tracking-wide">Salesperson</th>
                <th className="text-left px-6 py-4 text-sm font-bold text-foreground tracking-wide">Notes</th>
              </tr>
            </thead>
            <tbody>
              {groupedBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center px-6 py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <CalendarIcon className="w-8 h-8 text-gray-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {searchQuery.trim() ? 'No matching bookings' : 'No active bookings'}
                        </h3>
                        <p className="text-gray-600 mb-4">
                          {searchQuery.trim() ? 'Try adjusting your search criteria' : 'No active bookings found in the system'}
                        </p>
                        {searchQuery.trim() && (
                          <Button
                            variant="outline"
                            onClick={() => setSearchQuery("")}
                            className="border-gray-300 hover:bg-gray-50"
                          >
                            Clear search
                          </Button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                groupedBookings.map((group, groupIndex) => {
                  const groupRows = group.entries.map((entry, entryIndex) => {
                    const entryKey = `${entry.booking.id}-${entry.dateIndex}`;
                    const showDetails = shouldShowBookingDetails(entry);
                    const isFirstInGroup = entryIndex === 0;
                    const isLastInGroup = entryIndex === group.entries.length - 1;
                    const isLastEntry = entryIndex === group.entries.length - 1;
                    
                    return (
                      <tr
                        key={entryKey}
                        className={`
                          border-b border-border hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-transparent cursor-pointer transition-all duration-200 group
                          ${getEventTypeColor(group.booking.eventType)}
                        `}
                        style={{
                          borderLeft: group.isMultiDay ? '3px solid #3B82F6' : 'none',
                          backgroundColor: group.isMultiDay ? '#E2E8F0' : 'transparent'
                        }}
                        onClick={() => handleRowClick(entry.booking)}
                        data-testid={`booking-row-${entryKey}`}
                      >
                        <td className="px-6 py-4 align-top" data-testid={`event-date-${entryKey}`}>
                          <div className="flex flex-col">
                            <div className="font-semibold text-gray-900">
                              {format(entry.eventDate, 'MMM dd, yyyy')}
                            </div>
                            {entry.isMultiDay && (
                              <div className="text-xs text-gray-500 mt-1">
                                {isFirstInGroup ? `Multi-day event (${entry.totalDays} days)` : `Day ${entry.dateIndex + 1} of ${entry.totalDays}`}
                              </div>
                            )}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 align-top" data-testid={`booking-id-${entryKey}`}>
                          {showDetails ? (
                            <div className="text-xs text-muted-foreground font-mono bg-gray-100 px-2 py-1 rounded-md font-semibold">
                              {entry.booking.bookingNumber}
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground font-medium">
                              Day {entry.dateIndex + 1} of {entry.totalDays}
                            </div>
                          )}
                        </td>
                        
                        <td className="px-6 py-4 align-top" data-testid={`client-name-${entryKey}`}>
                          {showDetails && (
                            <div className="text-sm font-bold text-foreground leading-tight mb-1 group-hover:text-primary transition-colors">
                              {entry.booking.clientName}
                            </div>
                          )}
                        </td>
                        
                        <td className="px-6 py-4 align-top" data-testid={`event-type-${entryKey}`}>
                          {showDetails && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 capitalize">
                              {entry.booking.eventType}
                            </span>
                          )}
                        </td>
                        
                        <td className="px-6 py-4 align-top" data-testid={`venue-${entryKey}`}>
                          {showDetails && (
                            <div className="text-sm text-foreground">
                              {(() => {
                                // First try the hall field
                                if (entry.booking.hall && entry.booking.hall.trim()) {
                                  return <VenueDisplay venues={[entry.booking.hall]} />;
                                }
                                
                                // If no hall, get venues from sessions
                                const sessions = (entry.booking as any).sessions || [];
                                if (sessions.length > 0) {
                                  const venues = [...new Set(sessions.map((s: any) => s.venue).filter(Boolean))];
                                  return <VenueDisplay venues={venues} />;
                                }
                                
                                // Fallback
                                return <VenueDisplay venues={[]} />;
                              })()}
                            </div>
                          )}
                        </td>
                        
                        <td className="px-6 py-4 align-top" data-testid={`sessions-${entryKey}`}>
                          {showDetails && (
                            (entry.booking as any).sessions && (entry.booking as any).sessions.length > 0 ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {(entry.booking as any).sessions.length} session{(entry.booking as any).sessions.length > 1 ? 's' : ''}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">No sessions</span>
                            )
                          )}
                        </td>
                        
                        <td className="px-6 py-4 align-top" data-testid={`salesperson-${entryKey}`}>
                          {showDetails && (
                            <div className="text-sm text-foreground">
                              {getSalespersonName(entry.booking)}
                            </div>
                          )}
                        </td>
                        
                        <td className="px-6 py-4 align-top" data-testid={`notes-${entryKey}`}>
                          {showDetails && (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  });
                  
                  // Add spacing row after each group except the last one
                  if (groupIndex < groupedBookings.length - 1) {
                    groupRows.push(
                      <tr key={`spacer-${group.booking.id}`} className="h-2">
                        <td colSpan={8} className="p-0 h-2"></td>
                      </tr>
                    );
                  }
                  
                  return groupRows;
                }).flat()
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden">
          {groupedBookings.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <CalendarIcon className="w-8 h-8 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {searchQuery.trim() ? 'No matching bookings' : 'No active bookings'}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {searchQuery.trim() ? 'Try adjusting your search criteria' : 'No active bookings found in the system'}
                  </p>
                  {searchQuery.trim() && (
                    <Button
                      variant="outline"
                      onClick={() => setSearchQuery("")}
                      className="border-gray-300 hover:bg-gray-50"
                    >
                      Clear search
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {groupedBookings.map((group, groupIndex) => (
                <div key={group.booking.id} className="space-y-2">
                  {group.entries.map((entry, entryIndex) => {
                    const entryKey = `${entry.booking.id}-${entry.dateIndex}`;
                    const showDetails = shouldShowBookingDetails(entry);
                    const isFirstInGroup = entryIndex === 0;
                    const isLastInGroup = entryIndex === group.entries.length - 1;
                    
                    return (
                      <div
                        key={entryKey}
                        className={`
                          bg-white border rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-md
                          ${getEventTypeColor(group.booking.eventType)}
                        `}
                        style={{
                          borderLeft: group.isMultiDay ? '3px solid #3B82F6' : 'none',
                          backgroundColor: group.isMultiDay ? '#E2E8F0' : 'transparent'
                        }}
                        onClick={() => handleRowClick(entry.booking)}
                        data-testid={`booking-card-${entryKey}`}
                      >
                        {/* Header with Date and Booking ID */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4 text-gray-500" />
                            <span className="font-semibold text-gray-900">
                              {format(entry.eventDate, 'MMM dd, yyyy')}
                            </span>
                            {entry.isMultiDay && (
                              <span className="text-xs text-gray-500">
                                {isFirstInGroup ? `Multi-day event (${entry.totalDays} days)` : `Day ${entry.dateIndex + 1} of ${entry.totalDays}`}
                              </span>
                            )}
                          </div>
                          {showDetails && (
                            <span className="font-mono text-sm font-semibold text-gray-600">
                              {entry.booking.bookingNumber}
                            </span>
                          )}
                        </div>

                        {/* Client and Event Details */}
                        {showDetails && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-gray-500" />
                              <span className="font-medium text-gray-900">{entry.booking.clientName}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 capitalize">
                                {entry.booking.eventType}
                              </span>
                            </div>

                            {entry.booking.hall && (
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-gray-500" />
                                <span className="text-gray-900">{entry.booking.hall}</span>
                              </div>
                            )}

                            {(entry.booking as any).sessions && (entry.booking as any).sessions.length > 0 && (
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-gray-500" />
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  {(entry.booking as any).sessions.length} session{(entry.booking as any).sessions.length > 1 ? 's' : ''}
                                </span>
                              </div>
                            )}

                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600">Salesperson:</span>
                              <span className="text-sm text-gray-900">{getSalespersonName(entry.booking)}</span>
                            </div>
                          </div>
                        )}

                        {/* Multi-day indicator for non-first entries */}
                        {!showDetails && (
                          <div className="text-sm text-gray-600 text-center py-2">
                            Day {entry.dateIndex + 1} of {entry.totalDays}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* Spacing between groups */}
                  {groupIndex < groupedBookings.length - 1 && (
                    <div className="h-4"></div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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