import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Trash2, Clock, MapPin, AlertTriangle, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { BookingWithRelations } from "@/types";
import { useSessionConflicts } from "../hooks/use-session-conflicts";
import { TimePicker } from "@/components/ui/time-picker";

interface Session {
  id: string;
  sessionName: string;
  sessionLabel?: string;
  venue: string;
  startTime: string;
  endTime: string;
  sessionDate: string;
  specialInstructions?: string;
}

interface SessionManagementProps {
  sessions: Session[];
  onSessionsChange: (sessions: Session[]) => void;
  eventStartDate: string;
  eventEndDate?: string;
  eventDuration: number;
}

const VENUE_OPTIONS = [
  "Areca I - The Banquet Hall",
  "Areca II", 
  "Oasis - The Lawn",
  "Pool-side Lawn",
  "3rd floor Lounge",
  "Board Room",
  "Amber Restaurant",
  "Sway Lounge Bar"
];

const SESSION_NAME_OPTIONS = [
  "Breakfast",
  "Lunch", 
  "Hi-Tea",
  "Dinner"
];

export default function SessionManagement({ 
  sessions, 
  onSessionsChange, 
  eventStartDate, 
  eventEndDate, 
  eventDuration 
}: SessionManagementProps) {
  const { data: existingBookings = [] } = useQuery<BookingWithRelations[]>({
    queryKey: ["/api/bookings"],
  });

  // Helper function to calculate duration between two times
  const calculateDuration = (startTime: string, endTime: string): string => {
    if (!startTime || !endTime) return '';
    
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const durationMinutes = endMinutes - startMinutes;
    
    if (durationMinutes <= 0) return '';
    
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  // Generate available dates for sessions
  const availableDates = [];
  if (eventStartDate) {
    const startDate = new Date(eventStartDate);
    // Check if the date is valid
    if (!isNaN(startDate.getTime())) {
      for (let i = 0; i < eventDuration; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        availableDates.push(date.toISOString().split('T')[0]);
      }
    }
  }

  // Check for conflicts with existing bookings
  const checkSessionConflict = (session: Session): string[] => {
    if (!session.venue || !session.sessionDate || !session.startTime || !session.endTime) {
      return [];
    }

    const conflicts: string[] = [];
    
    existingBookings.forEach(booking => {
      if (booking.sessions && booking.sessions.length > 0) {
        booking.sessions.forEach((existingSession: any) => {
          // Check if same venue and overlapping time on same date
          if (existingSession.venue === session.venue && 
              existingSession.sessionDate.split('T')[0] === session.sessionDate) {
            
            const sessionStart = session.startTime;
            const sessionEnd = session.endTime;
            const existingStart = existingSession.startTime;
            const existingEnd = existingSession.endTime;
            
            // Check for time overlap
            if ((sessionStart < existingEnd && sessionEnd > existingStart)) {
              conflicts.push(`Conflicts with ${booking.clientName} - ${existingSession.sessionName} (${existingStart}-${existingEnd})`);
            }
          }
        });
      }
    });
    
    return conflicts;
  };

  const addSession = () => {
    const newSession: Session = {
      id: Math.random().toString(36).substr(2, 9),
      sessionName: "",
      sessionLabel: "",
      venue: "",
      startTime: "10:00",
      endTime: "14:00", 
      sessionDate: "", // Will be set automatically from event date
      specialInstructions: ""
    };
    
    onSessionsChange([...sessions, newSession]);
  };

  const removeSession = (sessionId: string) => {
    onSessionsChange(sessions.filter(s => s.id !== sessionId));
  };

  const updateSession = (sessionId: string, field: keyof Session, value: any) => {
    onSessionsChange(sessions.map(s => 
      s.id === sessionId ? { ...s, [field]: value } : s
    ));
  };

  // Helper function to check if date is in the past
  const isDateInPast = (dateString: string): boolean => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  // Enhanced session validation with detailed error messages
  const validateSessionTime = (session: Session): string[] => {
    const errors: string[] = [];
    
    // Check if session name is provided
    if (!session.sessionName?.trim()) {
      errors.push("Session name is required");
    }
    
    // Check if venue is provided
    if (!session.venue?.trim()) {
      errors.push("Venue is required");
    }
    
    // Session date is automatically set from event date - no validation needed
    
    // Check start time format and presence
    if (!session.startTime) {
      errors.push("Start time is required");
    } else if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(session.startTime)) {
      errors.push("Start time must be in HH:MM format (24-hour)");
    }
    
    // Check end time format and presence
    if (!session.endTime) {
      errors.push("End time is required");
    } else if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(session.endTime)) {
      errors.push("End time must be in HH:MM format (24-hour)");
    }
    
    // Check if end time is after start time
    if (session.startTime && session.endTime && session.startTime >= session.endTime) {
      errors.push("End time must be after start time");
    }
    
    return errors;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-semibold">Event Sessions *</Label>
          <p className="text-sm text-muted-foreground mt-1">
            Sessions define the specific venue, date, and time for your event. The session date will automatically match your event date.
          </p>
        </div>
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={addSession}
          data-testid="add-session"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Session
        </Button>
      </div>

      {sessions.length === 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="w-4 h-4 text-orange-600" />
          <AlertDescription className="text-orange-700">
            <strong>Session Required:</strong> Please add at least one session with venue, date, and timing details to proceed with booking confirmation.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        {sessions.map((session, index) => {
          const conflicts = checkSessionConflict(session);
          const timeErrors = validateSessionTime(session);
          const hasErrors = conflicts.length > 0 || timeErrors.length > 0;

          return (
            <Card key={session.id} className={`${hasErrors ? 'border-red-500' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">
                    Session {index + 1}
                    {session.sessionLabel && ` - ${session.sessionLabel}`}
                  </CardTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSession(session.id)}
                    data-testid={`remove-session-${index}`}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Session Name */}
                  <div>
                    <Label htmlFor={`session-name-${session.id}`}>Session Name *</Label>
                    <Select 
                      value={session.sessionName} 
                      onValueChange={(value) => updateSession(session.id, 'sessionName', value)}
                    >
                      <SelectTrigger 
                        data-testid={`session-name-${index}`}
                        className={!session.sessionName?.trim() ? 'border-red-500' : ''}
                      >
                        <SelectValue placeholder="Select session name" />
                      </SelectTrigger>
                      <SelectContent>
                        {SESSION_NAME_OPTIONS.map(name => (
                          <SelectItem key={name} value={name}>{name}</SelectItem>
                        ))}
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                    {!session.sessionName?.trim() && (
                      <p className="text-sm text-red-500 mt-1">Session name is required</p>
                    )}
                  </div>

                  {/* Custom Session Label */}
                  <div>
                    <Label htmlFor={`session-label-${session.id}`}>Custom Label</Label>
                    <Input
                      id={`session-label-${session.id}`}
                      value={session.sessionLabel}
                      onChange={(e) => updateSession(session.id, 'sessionLabel', e.target.value)}
                      placeholder="e.g., Conference Morning, Reception Dinner"
                      data-testid={`session-label-${index}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Venue */}
                  <div>
                    <Label htmlFor={`venue-${session.id}`}>Venue *</Label>
                    <Select 
                      value={session.venue} 
                      onValueChange={(value) => updateSession(session.id, 'venue', value)}
                    >
                      <SelectTrigger 
                        data-testid={`session-venue-${index}`}
                        className={!session.venue?.trim() ? 'border-red-500' : ''}
                      >
                        <SelectValue placeholder="Select venue" />
                      </SelectTrigger>
                      <SelectContent>
                        {VENUE_OPTIONS.map(venue => (
                          <SelectItem key={venue} value={venue}>{venue}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!session.venue?.trim() && (
                      <p className="text-sm text-red-500 mt-1">Venue is required</p>
                    )}
                  </div>

                  {/* Start Time */}
                  <div>
                    <Label htmlFor={`start-time-${session.id}`}>Start Time *</Label>
                    <TimePicker
                      id={`start-time-${session.id}`}
                      value={session.startTime || ""}
                      onChange={(value) => updateSession(session.id, 'startTime', value)}
                      className={!session.startTime ? 'border-red-500' : ''}
                    />
                    {!session.startTime && (
                      <p className="text-sm text-red-500 mt-1">Start time is required</p>
                    )}
                  </div>

                  {/* End Time */}
                  <div>
                    <Label htmlFor={`end-time-${session.id}`}>End Time *</Label>
                    <TimePicker
                      id={`end-time-${session.id}`}
                      value={session.endTime || ""}
                      onChange={(value) => updateSession(session.id, 'endTime', value)}
                      className={!session.endTime ? 'border-red-500' : ''}
                    />
                    {!session.endTime && (
                      <p className="text-sm text-red-500 mt-1">End time is required</p>
                    )}
                    {session.startTime && session.endTime && session.startTime >= session.endTime && (
                      <p className="text-sm text-red-500 mt-1">⚠️ End time must be after start time</p>
                    )}
                  </div>
                </div>

                {/* Session Date Info */}
                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Session Date</span>
                  </div>
                  <p className="text-xs text-blue-700 mt-1">
                    💡 Session date automatically matches your event date: {eventStartDate ? new Date(eventStartDate).toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    }) : 'Not set'}
                  </p>
                </div>

                {/* Special Instructions */}
                <div>
                  <Label htmlFor={`instructions-${session.id}`}>Special Instructions</Label>
                  <Input
                    id={`instructions-${session.id}`}
                    value={session.specialInstructions || ""}
                    onChange={(e) => updateSession(session.id, 'specialInstructions', e.target.value)}
                    placeholder="Any special setup or service requirements..."
                    data-testid={`session-instructions-${index}`}
                  />
                </div>

                {/* Error Messages */}
                {hasErrors && (
                  <div className="space-y-2">
                    {timeErrors.map((error, idx) => (
                      <Alert key={`time-error-${idx}`} variant="destructive">
                        <AlertTriangle className="w-4 h-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    ))}
                    {conflicts.map((conflict, idx) => (
                      <Alert key={`conflict-${idx}`} variant="destructive">
                        <AlertTriangle className="w-4 h-4" />
                        <AlertDescription>{conflict}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}

                {/* Session Summary Badge */}
                {!hasErrors && session.venue && session.startTime && session.endTime && (
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Badge variant="outline" className="text-xs">
                      <MapPin className="w-3 h-3 mr-1" />
                      {session.venue}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      {session.startTime} - {session.endTime}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Sessions Summary */}
      {sessions.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-900">Sessions Summary</span>
            </div>
            <div className="space-y-1 text-sm text-blue-800">
              {sessions.map((session, index) => (
                <div key={session.id} className="flex items-center justify-between">
                  <span>
                    {session.sessionName || `Session ${index + 1}`} 
                    {session.sessionLabel && ` (${session.sessionLabel})`}
                  </span>
                  <span className="text-xs">
                    {session.venue} • {session.startTime}-{session.endTime}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}