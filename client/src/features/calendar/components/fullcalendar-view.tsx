import { useRef, useEffect, useMemo } from "react";
import FullCalendar from '@fullcalendar/react';
import resourceTimelinePlugin from '@fullcalendar/resource-timeline';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useQuery } from "@tanstack/react-query";
import type { BookingWithRelations } from "@/types";

interface FullCalendarViewProps {
  view: 'timeline' | 'grid';
  onEventClick?: (bookingId: string) => void;
}

const VENUE_RESOURCES = [
  { id: 'areca-i', title: 'Areca I - The Banquet Hall' },
  { id: 'areca-ii', title: 'Areca II' },
  { id: 'oasis-lawn', title: 'Oasis - The Lawn' },
  { id: 'poolside-lawn', title: 'Pool-side Lawn' },
  { id: 'lounge-3f', title: '3rd floor Lounge' },
  { id: 'board-room', title: 'Board Room' },
  { id: 'amber-restaurant', title: 'Amber Restaurant' },
  { id: 'sway-lounge', title: 'Sway Lounge Bar' },
];

function getResourceId(venue: string): string {
  const mapping: { [key: string]: string } = {
    'Areca I - The Banquet Hall': 'areca-i',
    'Areca II': 'areca-ii',
    'Oasis - The Lawn': 'oasis-lawn',
    'Pool-side Lawn': 'poolside-lawn',
    '3rd floor Lounge': 'lounge-3f',
    'Board Room': 'board-room',
    'Amber Restaurant': 'amber-restaurant',
    'Sway Lounge Bar': 'sway-lounge',
  };
  return mapping[venue] || venue.toLowerCase().replace(/\s+/g, '-');
}

function getStatusColor(status: string): string {
  const colors: { [key: string]: string } = {
    'booked': '#10B981',       // Green
    'cancelled': '#EF4444',    // Red
    'closed': '#6B7280',       // Gray
  };
  return colors[status] || '#6B7280';
}

export default function FullCalendarView({ view, onEventClick }: FullCalendarViewProps) {
  const calendarRef = useRef<FullCalendar>(null);
  
  const { data: bookings = [] } = useQuery<BookingWithRelations[]>({
    queryKey: ["/api/bookings"],
  });

  // Fetch converted enquiries to show as tentative
  const { data: enquiries = [] } = useQuery({
    queryKey: ['/api/enquiries'],
    queryFn: async () => {
      const response = await fetch('/api/enquiries');
      if (!response.ok) throw new Error('Failed to fetch enquiries');
      return response.json();
    },
  });

  // Convert bookings and enquiries to FullCalendar events
  const events = useMemo(() => {
    const allEvents = [];
    
    // Add converted enquiries as tentative events
    const convertedEnquiries = enquiries.filter((enq: any) => enq.status === 'converted' && enq.eventDate);
    convertedEnquiries.forEach((enquiry: any) => {
      allEvents.push({
        id: `enquiry-${enquiry.id}`,
        title: `${enquiry.clientName} - ${enquiry.eventType} (Tentative)`,
        start: enquiry.eventDate,
        end: enquiry.eventDate,
        backgroundColor: '#EAB308', // Yellow for tentative
        borderColor: '#EAB308',
        resourceId: 'areca-i', // Default venue
        extendedProps: {
          bookingId: enquiry.id,
          clientName: enquiry.clientName,
          eventType: enquiry.eventType,
          confirmedPax: enquiry.expectedPax || 0,
          status: 'tentative',
          isEnquiry: true
        }
      });
    });
    
    // Add actual bookings
    const bookingEvents = (bookings || []).flatMap((booking: any) => {
    if (!booking.sessions || booking.sessions.length === 0) {
      // Fallback for bookings without sessions - show as single event
      return [{
        id: booking.id,
        title: `${booking.clientName} - ${booking.eventType}`,
        start: booking.eventDate,
        end: booking.eventEndDate || booking.eventDate,
        backgroundColor: getStatusColor(booking.status || 'booked'),
        borderColor: getStatusColor(booking.status || 'booked'),
        resourceId: booking.hall ? getResourceId(booking.hall) : 'areca-i',
        extendedProps: {
          bookingId: booking.id,
          clientName: booking.clientName,
          eventType: booking.eventType,
          confirmedPax: booking.confirmedPax,
          salesperson: `${booking.salesperson?.firstName || ''} ${booking.salesperson?.lastName || ''}`.trim(),
          status: booking.status,
        }
      }];
    }

    // Convert each session to a separate event
    return booking.sessions.map((session: any) => ({
      id: `${booking.id}-${session.id}`,
      title: `${booking.clientName} - ${session.sessionName}${session.sessionLabel ? ` (${session.sessionLabel})` : ''}`,
      start: `${session.sessionDate.split('T')[0]}T${session.startTime}:00`,
      end: `${session.sessionDate.split('T')[0]}T${session.endTime}:00`,
      backgroundColor: getStatusColor(booking.status || 'booked'),
      borderColor: getStatusColor(booking.status || 'booked'),
      resourceId: getResourceId(session.venue),
      extendedProps: {
        bookingId: booking.id,
        sessionId: session.id,
        clientName: booking.clientName,
        eventType: booking.eventType,
        sessionName: session.sessionName,
        sessionLabel: session.sessionLabel,
        venue: session.venue,
        paxCount: session.paxCount,
        specialInstructions: session.specialInstructions,
        salesperson: `${booking.salesperson?.firstName || ''} ${booking.salesperson?.lastName || ''}`.trim(),
        status: booking.status,
      }
    }));
    
    // Combine enquiries and bookings
    return [...allEvents, ...bookingEvents];
  }, [bookings, enquiries]);

  const handleEventClick = (info: any) => {
    if (onEventClick) {
      onEventClick(info.event.extendedProps.bookingId);
    }
  };

  const renderEventContent = (eventInfo: any) => {
    const { event } = eventInfo;
    const props = event.extendedProps;
    
    return (
      <div className="p-1 text-xs">
        <div className="font-medium truncate">{props.clientName}</div>
        <div className="text-xs opacity-90 truncate">
          {props.sessionName && `${props.sessionName} - `}{props.eventType}
        </div>
        {props.paxCount && (
          <div className="text-xs opacity-75">{props.paxCount} guests</div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full">
      <FullCalendar
        ref={calendarRef}
        plugins={[resourceTimelinePlugin, dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={view === 'timeline' ? 'resourceTimelineDay' : 'dayGridMonth'}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: view === 'timeline' 
            ? 'resourceTimelineDay,resourceTimelineWeek' 
            : 'dayGridMonth,timeGridWeek,timeGridDay'
        }}
        resources={view === 'timeline' ? VENUE_RESOURCES : undefined}
        events={events}
        eventClick={handleEventClick}
        eventContent={renderEventContent}
        height="auto"
        nowIndicator={true}
        editable={false}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={true}
        weekends={true}
        resourceAreaHeaderContent="Venues"
        resourceAreaWidth="200px"
        slotMinTime="06:00:00"
        slotMaxTime="24:00:00"
        slotDuration="01:00:00"
        snapDuration="00:15:00"
        eventOverlap={false}
        selectOverlap={false}
        businessHours={{
          startTime: '06:00',
          endTime: '24:00',
        }}
        eventClassNames={(arg) => {
          const status = arg.event.extendedProps.status;
          return `status-${status} cursor-pointer hover:opacity-80 transition-opacity`;
        }}
      />
    </div>
  );
}