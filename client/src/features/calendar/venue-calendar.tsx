import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, ChevronLeft, ChevronRight, Clock, Users, MapPin, AlertTriangle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';

interface Venue {
  id: string;
  name: string;
  capacity: number;
  area: string;
  type: 'banquet_hall' | 'lawn' | 'restaurant' | 'lounge' | 'conference';
  isActive: boolean;
}

interface Booking {
  id: string;
  venueId: string;
  clientName: string;
  eventName: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  pax: number;
}

interface VenueCalendarProps {
  onBookingClick?: (booking: Booking) => void;
  onVenueSelect?: (venue: Venue) => void;
}

const VENUE_TYPES = {
  banquet_hall: { color: 'bg-blue-100 text-blue-800', icon: '🏛️' },
  lawn: { color: 'bg-green-100 text-green-800', icon: '🌿' },
  restaurant: { color: 'bg-orange-100 text-orange-800', icon: '🍽️' },
  lounge: { color: 'bg-purple-100 text-purple-800', icon: '🍸' },
  conference: { color: 'bg-gray-100 text-gray-800', icon: '💼' }
};

export function VenueCalendar({ onBookingClick, onVenueSelect }: VenueCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedVenue, setSelectedVenue] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');

  // Fetch venues
  const { data: venues = [] } = useQuery({
    queryKey: ['/api/venues'],
    queryFn: async () => {
      const response = await fetch('/api/venues');
      if (!response.ok) throw new Error('Failed to fetch venues');
      return response.json();
    },
  });

  // Fetch bookings for current month
  const { data: bookings = [] } = useQuery({
    queryKey: ['/api/calendar/venues', currentDate, selectedVenue],
    queryFn: async () => {
      const startDate = startOfMonth(currentDate).toISOString();
      const endDate = endOfMonth(currentDate).toISOString();
      const params = new URLSearchParams({
        startDate,
        endDate,
        ...(selectedVenue !== 'all' && { venueIds: selectedVenue })
      });
      
      const response = await fetch(`/api/calendar/venues?${params}`);
      if (!response.ok) throw new Error('Failed to fetch bookings');
      return response.json();
    },
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getBookingsForDate = (date: Date) => {
    return bookings.filter(booking => 
      isSameDay(new Date(booking.startDate), date)
    );
  };

  const getVenueBookings = (venueId: string, date: Date) => {
    return bookings.filter(booking => 
      booking.venueId === venueId && 
      isSameDay(new Date(booking.startDate), date)
    );
  };

  const getStatusColor = (status: string) => {
    const colors = {
      booked: 'bg-green-100 text-green-800 border-green-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
      closed: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => 
      direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold">Venue Calendar</h1>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('prev')}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('next')}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <span className="text-lg font-medium">
              {format(currentDate, 'MMMM yyyy')}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <Select value={selectedVenue} onValueChange={setSelectedVenue}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select venue" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Venues</SelectItem>
              {venues.map(venue => (
                <SelectItem key={venue.id} value={venue.id}>
                  {venue.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="day">Day</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Venue Legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(VENUE_TYPES).map(([type, config]) => (
          <Badge key={type} className={config.color}>
            <span className="mr-1">{config.icon}</span>
            {type.replace('_', ' ').toUpperCase()}
          </Badge>
        ))}
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Venue Availability</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {viewMode === 'month' && (
            <div className="space-y-4">
              {/* Days of week header */}
              <div className="grid grid-cols-7 gap-1 text-sm font-medium text-muted-foreground">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-2 text-center">{day}</div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-1">
                {days.map(day => {
                  const dayBookings = getBookingsForDate(day);
                  const isToday = isSameDay(day, new Date());
                  
                  return (
                    <div
                      key={day.toISOString()}
                      className={`min-h-[120px] p-2 border rounded-lg ${
                        isToday ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-medium ${
                          isToday ? 'text-blue-600' : 'text-gray-900'
                        }`}>
                          {format(day, 'd')}
                        </span>
                        {dayBookings.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {dayBookings.length}
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-1">
                        {dayBookings.slice(0, 3).map(booking => {
                          const venue = venues.find(v => v.id === booking.venueId);
                          return (
                            <div
                              key={booking.id}
                              className={`text-xs p-1 rounded cursor-pointer hover:opacity-80 ${getStatusColor(booking.status)}`}
                              onClick={() => onBookingClick?.(booking)}
                            >
                              <div className="flex items-center space-x-1">
                                <Clock className="w-3 h-3" />
                                <span className="truncate">{booking.startTime}</span>
                              </div>
                              <div className="truncate font-medium">{booking.eventName}</div>
                              <div className="truncate text-xs opacity-75">
                                {venue?.name} • {booking.pax} pax
                              </div>
                            </div>
                          );
                        })}
                        {dayBookings.length > 3 && (
                          <div className="text-xs text-muted-foreground">
                            +{dayBookings.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {viewMode === 'week' && (
            <div className="space-y-4">
              <div className="text-center text-lg font-medium">
                Week of {format(currentDate, 'MMM d, yyyy')}
              </div>
              <div className="grid grid-cols-7 gap-4">
                {Array.from({ length: 7 }, (_, i) => {
                  const day = new Date(currentDate);
                  day.setDate(currentDate.getDate() - currentDate.getDay() + i);
                  const dayBookings = getBookingsForDate(day);
                  
                  return (
                    <div key={i} className="space-y-2">
                      <div className="text-center font-medium">
                        {format(day, 'EEE, MMM d')}
                      </div>
                      <div className="space-y-1">
                        {dayBookings.map(booking => (
                          <div
                            key={booking.id}
                            className={`p-2 rounded text-xs ${getStatusColor(booking.status)}`}
                            onClick={() => onBookingClick?.(booking)}
                          >
                            <div className="font-medium">{booking.eventName}</div>
                            <div className="text-xs opacity-75">
                              {booking.startTime} - {booking.endTime}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {viewMode === 'day' && (
            <div className="space-y-4">
              <div className="text-center text-lg font-medium">
                {format(currentDate, 'EEEE, MMMM d, yyyy')}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {venues.map(venue => {
                  const venueBookings = getVenueBookings(venue.id, currentDate);
                  const venueType = VENUE_TYPES[venue.type];
                  
                  return (
                    <Card key={venue.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center space-x-2 text-sm">
                          <span>{venueType.icon}</span>
                          <span>{venue.name}</span>
                          <Badge className={venueType.color}>
                            {venue.type.replace('_', ' ')}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2 text-xs text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Users className="w-3 h-3" />
                            <span>Capacity: {venue.capacity}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-3 h-3" />
                            <span>{venue.area}</span>
                          </div>
                        </div>
                        
                        <div className="mt-3 space-y-1">
                          {venueBookings.length > 0 ? (
                            venueBookings.map(booking => (
                              <div
                                key={booking.id}
                                className={`p-2 rounded text-xs ${getStatusColor(booking.status)}`}
                                onClick={() => onBookingClick?.(booking)}
                              >
                                <div className="font-medium">{booking.eventName}</div>
                                <div className="text-xs opacity-75">
                                  {booking.startTime} - {booking.endTime}
                                </div>
                                <div className="text-xs opacity-75">
                                  {booking.clientName} • {booking.pax} pax
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                              ✅ Available all day
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

