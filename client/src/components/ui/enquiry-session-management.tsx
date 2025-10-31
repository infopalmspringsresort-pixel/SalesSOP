import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Trash2, Clock, MapPin, AlertTriangle, Calendar } from "lucide-react";
import { z } from "zod";

// Session name options (standardized with booking form)
const SESSION_NAME_OPTIONS = [
  "Breakfast",
  "Lunch", 
  "Hi-Tea",
  "Dinner"
];

// Venue options
const VENUES = [
  'Areca I - The Banquet Hall',
  'Areca II',
  'Oasis - The Lawn',
  'Pool-side Lawn',
  '3rd floor Lounge',
  'Board Room',
  'Amber Restaurant',
  'Sway Lounge Bar'
];

const sessionSchema = z.object({
  id: z.string(),
  sessionName: z.string().min(1, "Session name is required"),
  sessionLabel: z.string().optional(),
  venue: z.string().min(1, "Venue is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  sessionDate: z.date(),
  paxCount: z.number().default(0),
  specialInstructions: z.string().optional(),
});

interface EnquirySessionManagementProps {
  sessions: z.infer<typeof sessionSchema>[];
  setSessions: (sessions: z.infer<typeof sessionSchema>[]) => void;
  eventStartDate?: string;
  eventEndDate?: string;
  eventDuration?: number;
  disabled?: boolean;
}

export default function EnquirySessionManagement({
  sessions,
  setSessions,
  eventStartDate,
  eventEndDate,
  eventDuration = 1,
  disabled = false
}: EnquirySessionManagementProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  // Auto-add first session when component mounts
  useEffect(() => {
    if (sessions.length === 0) {
      const firstSession = {
        id: Math.random().toString(36).substr(2, 9),
        sessionName: "",
        sessionLabel: "",
        venue: "",
        startTime: "",
        endTime: "",
        sessionDate: eventStartDate ? new Date(eventStartDate) : new Date(),
        paxCount: 0,
        specialInstructions: "",
      };
      setSessions([firstSession]);
    }
  }, [sessions.length, setSessions, eventStartDate]);

  const addSession = () => {
    const newSession = {
      id: Math.random().toString(36).substr(2, 9),
      sessionName: "",
      sessionLabel: "",
      venue: "",
      startTime: "",
      endTime: "",
      sessionDate: eventStartDate ? new Date(eventStartDate) : new Date(),
      paxCount: 0,
      specialInstructions: "",
    };
    setSessions([...sessions, newSession]);
  };

  const removeSession = (sessionId: string) => {
    if (sessions.length > 1) {
      setSessions(sessions.filter(s => s.id !== sessionId));
    }
  };

  const updateSession = (sessionId: string, field: string, value: any) => {
    setSessions(sessions.map(session => 
      session.id === sessionId 
        ? { ...session, [field]: value }
        : session
    ));
  };

  const validateSessionTime = (startTime: string, endTime: string) => {
    if (!startTime || !endTime) return true;
    
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    return endMinutes > startMinutes;
  };

  const getSessionDate = (session: z.infer<typeof sessionSchema>) => {
    if (eventStartDate && eventEndDate && eventDuration > 1) {
      // For multi-day events, show which day this session is for
      const startDate = new Date(eventStartDate);
      const sessionDate = new Date(session.sessionDate);
      const dayDiff = Math.ceil((sessionDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return `Day ${dayDiff} of ${eventDuration}`;
    }
    return session.sessionDate.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Event Sessions</Label>
        {!disabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addSession}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Session
          </Button>
        )}
      </div>

      {sessions.map((session, index) => (
        <div key={session.id} className="border border-gray-200 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Session {index + 1}
              </Badge>
              {eventStartDate && eventEndDate && eventDuration > 1 && (
                <Badge variant="secondary" className="text-xs">
                  {getSessionDate(session)}
                </Badge>
              )}
            </div>
            {!disabled && sessions.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeSession(session.id)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Session Name */}
            <div className="space-y-2">
              <Label htmlFor={`sessionName-${session.id}`}>Session Name *</Label>
              <Select
                value={session.sessionName}
                onValueChange={(value) => updateSession(session.id, 'sessionName', value)}
                disabled={disabled}
              >
                <SelectTrigger id={`sessionName-${session.id}`}>
                  <SelectValue placeholder="Select session name" />
                </SelectTrigger>
                <SelectContent>
                  {SESSION_NAME_OPTIONS.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom Label */}
            <div className="space-y-2">
              <Label htmlFor={`sessionLabel-${session.id}`}>Custom Label</Label>
              <Input
                id={`sessionLabel-${session.id}`}
                value={session.sessionLabel || ''}
                onChange={(e) => updateSession(session.id, 'sessionLabel', e.target.value)}
                placeholder="e.g., Main Event, Cocktail"
                disabled={disabled}
              />
            </div>

            {/* Venue */}
            <div className="space-y-2">
              <Label htmlFor={`venue-${session.id}`}>Venue *</Label>
              <Select
                value={session.venue}
                onValueChange={(value) => updateSession(session.id, 'venue', value)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select venue" />
                </SelectTrigger>
                <SelectContent>
                  {VENUES.map((venue) => (
                    <SelectItem key={venue} value={venue}>
                      {venue}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Session Date (for multi-day events) */}
            {eventStartDate && eventEndDate && eventDuration > 1 && (
              <div className="space-y-2">
                <Label htmlFor={`sessionDate-${session.id}`}>Session Date *</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                  <Input
                    id={`sessionDate-${session.id}`}
                    type="date"
                    value={session.sessionDate.toISOString().split('T')[0]}
                    onChange={(e) => updateSession(session.id, 'sessionDate', new Date(e.target.value))}
                    min={eventStartDate}
                    max={eventEndDate}
                    disabled={disabled}
                    className="pl-10 font-medium"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  📅 Event runs from {new Date(eventStartDate).toLocaleDateString()} to {new Date(eventEndDate).toLocaleDateString()} ({eventDuration} days)
                </p>
              </div>
            )}

            {/* Start Time */}
            <div className="space-y-2">
              <Label htmlFor={`startTime-${session.id}`}>Start Time *</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                <Input
                  id={`startTime-${session.id}`}
                  type="time"
                  value={session.startTime}
                  onChange={(e) => updateSession(session.id, 'startTime', e.target.value)}
                  className="pl-10 font-medium"
                  disabled={disabled}
                />
              </div>
            </div>

            {/* End Time */}
            <div className="space-y-2">
              <Label htmlFor={`endTime-${session.id}`}>End Time *</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                <Input
                  id={`endTime-${session.id}`}
                  type="time"
                  value={session.endTime}
                  onChange={(e) => updateSession(session.id, 'endTime', e.target.value)}
                  className="pl-10 font-medium"
                  disabled={disabled}
                />
              </div>
              {session.startTime && session.endTime && !validateSessionTime(session.startTime, session.endTime) && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800 text-sm">
                    ⚠️ End time must be after start time
                  </AlertDescription>
                </Alert>
              )}
            </div>

          </div>

          {/* Special Instructions */}
          <div className="space-y-2">
            <Label htmlFor={`specialInstructions-${session.id}`}>Special Instructions</Label>
            <Input
              id={`specialInstructions-${session.id}`}
              value={session.specialInstructions || ''}
              onChange={(e) => updateSession(session.id, 'specialInstructions', e.target.value)}
              placeholder="Any special requirements or notes"
              disabled={disabled}
            />
          </div>
        </div>
      ))}

      {sessions.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No sessions added yet</p>
          {!disabled && (
            <Button
              type="button"
              variant="outline"
              onClick={addSession}
              className="mt-2"
            >
              Add First Session
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

