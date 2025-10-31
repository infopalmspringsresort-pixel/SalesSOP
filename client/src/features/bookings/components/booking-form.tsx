import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertBookingSchema } from "@shared/schema-client";
import { z } from "zod";
import { isUnauthorizedError } from "@/lib/authUtils";
import SessionManagement from "./session-management";

const sessionSchema = z.object({
  id: z.string(),
  sessionName: z.string().min(1, "Session name is required"),
  sessionLabel: z.string().optional(),
  venue: z.string().min(1, "Venue is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  // sessionDate removed - will use event date automatically
  specialInstructions: z.string().optional(),
});

const formSchema = insertBookingSchema.extend({
  eventDate: z.string().min(1, "Event date is required"),
  eventEndDate: z.string().optional(),
  eventDates: z.array(z.string()).optional(),
  sessions: z.array(sessionSchema).min(1, "At least one session is required"),
}).omit({
  totalAmount: true,
  advanceAmount: true,
  balanceAmount: true,
  hall: true,
  contractSigned: true,
  // Keep sessions requirement
});

interface BookingFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enquiryId?: string;
}

export default function BookingForm({ open, onOpenChange, enquiryId }: BookingFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [eventDuration, setEventDuration] = useState(1);
  const [eventDates, setEventDates] = useState<string[]>([]);
  const [contractSigned, setContractSigned] = useState(false);
  const [advanceReceived, setAdvanceReceived] = useState(false);
  const [sessions, setSessions] = useState<z.infer<typeof sessionSchema>[]>([]);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictData, setConflictData] = useState<any>(null);
  const [showFinalReview, setShowFinalReview] = useState(false);

  // Fetch specific enquiry details
  const { data: enquiry, isLoading: enquiryLoading, error: enquiryError } = useQuery<any>({
    queryKey: [`/api/enquiries/${enquiryId}`],
    enabled: open && !!enquiryId,
  });

  // Debug enquiry loading
  useEffect(() => {
    if (enquiry) {
      }
  }, [enquiryId, open, enquiryLoading, enquiryError, enquiry]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      enquiryId: enquiryId || "",
      quotationId: "",
      clientName: enquiry?.clientName || "",
      contactNumber: enquiry?.contactNumber || "",
      email: enquiry?.email || "",
      eventType: enquiry?.eventType || "wedding",
      eventDate: enquiry?.eventDate ? new Date(enquiry.eventDate).toISOString().split('T')[0] : "",
      eventEndDate: "",
      eventDuration: 1,
      eventDates: [],
      confirmedPax: enquiry?.expectedPax || undefined,
      sessions: [],
    },
  });

  const createBookingMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      try {
        // Calculate event dates based on duration
        const startDate = new Date(data.eventDate);
        const calculatedEventDates = [];
        
        for (let i = 0; i < eventDuration; i++) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + i);
          calculatedEventDates.push(date.toISOString());
        }

        const endDate = eventDuration > 1 ? new Date(startDate.getTime() + (eventDuration - 1) * 24 * 60 * 60 * 1000) : null;

        const bookingData = {
          ...data,
          // bookingNumber is auto-generated on the server, don't include it
          quotationId: data.quotationId || null, // Allow null for direct bookings
          totalAmount: 0, // Will be set separately through quotations (number, not string)
          advanceAmount: 0, // Will be set separately (number, not string)
          balanceAmount: 0, // Will be calculated when amounts are set (number, not string)
          confirmedPax: parseInt(data.confirmedPax?.toString() || "0"),
          eventDate: startDate.toISOString(),
          eventEndDate: endDate?.toISOString() || null,
          eventDuration: eventDuration,
          eventDates: calculatedEventDates,
          // Sessions with event date
          sessions: data.sessions.map(session => ({
            ...session,
            sessionDate: new Date(data.eventDate).toISOString(), // Use event date
          })),
          // Default values for removed fields
          eventStartTime: "",
          eventEndTime: "",
          hall: "",
          contractSigned: true,
          contractSignedAt: new Date().toISOString(),
        };

        const response = await apiRequest("POST", "/api/bookings", bookingData);
        // Update enquiry status to 'booked' after successful booking creation
        if (enquiryId) {
          await apiRequest("PATCH", `/api/enquiries/${enquiryId}`, {
            status: 'booked'
          });
          }
        
        const result = await response.json();
        return result;
      } catch (error) {
        throw error;
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Booking created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/enquiries"] });
      queryClient.invalidateQueries({ queryKey: [`/api/enquiries/${enquiryId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      form.reset();
      setEventDuration(1);
      setEventDates([]);
      setSessions([]);
      onOpenChange(false);
    },
    onError: (error: any) => {
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

      // Handle venue conflict errors
      if (error?.status === 409 && error?.data?.conflicts) {
        setConflictData(error.data);
        setShowConflictDialog(true);
        return;
      }

      // Handle validation errors
      if (error?.status === 400 && error?.data?.errors) {
        const errorMessages = error.data.errors.map((err: any) => err.message).join(', ');
        toast({
          title: "Validation Error",
          description: errorMessages,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Error",
        description: "Failed to create booking",
        variant: "destructive",
      });
    },
  });

  // Update form values when enquiry data is loaded
  useEffect(() => {
    if (enquiry) {
      form.setValue("clientName", enquiry.clientName);
      form.setValue("contactNumber", enquiry.contactNumber);
      form.setValue("email", enquiry.email || "");
      form.setValue("eventType", enquiry.eventType);
      
      const eventDateValue = enquiry.eventDate ? new Date(enquiry.eventDate).toISOString().split('T')[0] : "";
      form.setValue("eventDate", eventDateValue);
      form.setValue("confirmedPax", enquiry.expectedPax || undefined);
    }
  }, [enquiry, form]);

  // Auto-fill event date from enquiry and add first session
  useEffect(() => {
    if (enquiry && enquiry.eventDate) {
      const eventDate = new Date(enquiry.eventDate).toISOString().split('T')[0];
      form.setValue('eventDate', eventDate);
      }
  }, [enquiry, form]);

  // Load enquiry sessions or auto-add first session
  useEffect(() => {
    if (open && sessions.length === 0) {
      if (enquiry?.sessions && enquiry.sessions.length > 0) {
        const enquirySessions = enquiry.sessions.map((session: any) => ({
          id: session.id || Math.random().toString(36).substr(2, 9),
          sessionName: session.sessionName || "",
          sessionLabel: session.sessionLabel || "",
          venue: session.venue || "",
          startTime: session.startTime || "",
          endTime: session.endTime || "",
          specialInstructions: session.specialInstructions || "",
        }));
        setSessions(enquirySessions);
        form.setValue('sessions', enquirySessions);
      } else {
        const firstSession = {
          id: Math.random().toString(36).substr(2, 9),
          sessionName: "",
          sessionLabel: "",
          venue: "",
          startTime: "10:00",
          endTime: "14:00",
          specialInstructions: ""
        };
        
        setSessions([firstSession]);
        form.setValue('sessions', [firstSession]);
      }
    }
  }, [open, form, sessions.length, enquiry]);

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    // Detailed field-by-field logging
    // Session validation details
    if (data.sessions && data.sessions.length > 0) {
      data.sessions.forEach((session, index) => {
        });
    } else {
      }
    
    // Validate booking requirements
    if (!contractSigned || !advanceReceived) {
      toast({
        title: "Requirements Not Met",
        description: "Both contract signing and advance payment are required before booking confirmation",
        variant: "destructive",
      });
      return;
    }
    
    // Sessions validation
    if (!data.sessions || data.sessions.length === 0) {
      toast({
        title: "Sessions Required",
        description: "Please add at least one event session with venue and timing details",
        variant: "destructive",
      });
      return;
    }
    
    try {
      createBookingMutation.mutate(data);
      } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create booking",
        variant: "destructive",
      });
    }
  };

  // Use the enquiry data when available to detect if duration changed
  const originallyMentionedSingleDay = enquiry && !enquiry.eventDate;

  // Update event dates based on duration and start date
  const updateEventDates = (startDateStr: string, duration: number) => {
    if (!startDateStr) {
      setEventDates([]);
      return;
    }

    const dates = [];
    const startDate = new Date(startDateStr);
    
    for (let i = 0; i < duration; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date.toISOString());
    }
    
    setEventDates(dates);
    form.setValue("eventDates", dates);
    
    if (duration > 1) {
      const endDate = dates[dates.length - 1];
      form.setValue("eventEndDate", endDate.split('T')[0]);
    } else {
      form.setValue("eventEndDate", "");
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Booking Confirmation</DialogTitle>
          <DialogDescription>
            Convert an enquiry into a confirmed booking. Financial details will be managed separately through quotations.
          </DialogDescription>
        </DialogHeader>

        {/* Final Review Section - Show when enquiry data is available */}
        {enquiry && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-blue-900">📋 Final Review - Enquiry Details</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowFinalReview(!showFinalReview)}
                className="text-blue-700 border-blue-300 hover:bg-blue-100"
              >
                {showFinalReview ? 'Hide Details' : 'Show All Details'}
              </Button>
            </div>
            
            {showFinalReview && (
              <div className="space-y-4">
                {/* Client Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-blue-800 mb-2">👤 Client Information</h4>
                    <div className="space-y-1 text-sm">
                      <p><strong>Name:</strong> {enquiry.clientName}</p>
                      <p><strong>Contact:</strong> {enquiry.contactNumber}</p>
                      {enquiry.email && <p><strong>Email:</strong> {enquiry.email}</p>}
                      {enquiry.city && <p><strong>City:</strong> {enquiry.city}</p>}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-blue-800 mb-2">📅 Event Information</h4>
                    <div className="space-y-1 text-sm">
                      <p><strong>Type:</strong> {enquiry.eventType || 'Not specified'}</p>
                      {enquiry.eventDate && (
                        <p><strong>Event Date:</strong> {new Date(enquiry.eventDate).toLocaleDateString()}</p>
                      )}
                      {enquiry.eventEndDate && (
                        <p><strong>End Date:</strong> {new Date(enquiry.eventEndDate).toLocaleDateString()}</p>
                      )}
                      {enquiry.eventDuration && enquiry.eventDuration > 1 && (
                        <p><strong>Duration:</strong> {enquiry.eventDuration} days</p>
                      )}
                      {enquiry.expectedPax && <p><strong>Expected Guests:</strong> {enquiry.expectedPax}</p>}
                    </div>
                  </div>
                </div>

                {/* Sessions Information */}
                {enquiry.sessions && enquiry.sessions.length > 0 && (
                  <div>
                    <h4 className="font-medium text-blue-800 mb-2">🎯 Event Sessions ({enquiry.sessions.length})</h4>
                    <div className="space-y-2">
                      {enquiry.sessions.map((session: any, index: number) => (
                        <div key={session.id || index} className="bg-white border border-blue-200 rounded p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{session.sessionName}</span>
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              Session {index + 1}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
                            <div><strong>Venue:</strong> {session.venue}</div>
                            <div><strong>Time:</strong> {session.startTime} - {session.endTime}</div>
                            {session.paxCount > 0 && <div><strong>Guests:</strong> {session.paxCount}</div>}
                            {session.specialInstructions && (
                              <div className="col-span-2"><strong>Notes:</strong> {session.specialInstructions}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Source Information */}
                <div>
                  <h4 className="font-medium text-blue-800 mb-2">📊 Source Information</h4>
                  <div className="text-sm">
                    <p><strong>Source:</strong> {enquiry.source}</p>
                    {enquiry.sourceNotes && <p><strong>Source Notes:</strong> {enquiry.sourceNotes}</p>}
                    {enquiry.notes && <p><strong>Additional Notes:</strong> {enquiry.notes}</p>}
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>⚠️ Important:</strong> All details below are editable. Please review and make any final adjustments before confirming the booking.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Enquiry Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Converting Enquiry</Label>
                {enquiry ? (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium" data-testid="text-enquiry-number">
                        {enquiry.enquiryNumber} - {enquiry.clientName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Status: <span className="capitalize">{enquiry.status}</span>
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 border border-dashed rounded-lg text-center text-muted-foreground">
                    Loading enquiry details...
                  </div>
                )}
              </div>

              <FormField
                control={form.control}
                name="eventDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Start Date *</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        min={new Date().toISOString().split('T')[0]}
                        {...field} 
                        readOnly
                        className="bg-muted"
                        data-testid="input-event-date"
                        title="Event date is locked from enquiry data"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Event Duration Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Event Duration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="eventDuration">Event Duration *</Label>
                  <Select 
                    value={eventDuration.toString()} 
                    onValueChange={(value) => {
                      const duration = parseInt(value);
                      setEventDuration(duration);
                      form.setValue("eventDuration", duration);
                      
                      // Update event dates based on new duration
                      const startDate = form.getValues("eventDate");
                      if (startDate) {
                        updateEventDates(startDate, duration);
                      }
                    }}
                  >
                    <SelectTrigger data-testid="select-event-duration">
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Single Day</SelectItem>
                      <SelectItem value="2">2 Days</SelectItem>
                      <SelectItem value="3">3 Days</SelectItem>
                      <SelectItem value="4">4 Days</SelectItem>
                      <SelectItem value="5">5 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {eventDuration > 1 && (
                  <div>
                    <Label>Event End Date</Label>
                    <Input 
                      type="date" 
                      value={eventDates[eventDuration - 1]?.split('T')[0] || ''} 
                      readOnly 
                      className="bg-muted"
                      data-testid="input-event-end-date"
                    />
                  </div>
                )}
              </div>

              {eventDuration > 1 && eventDates.length > 0 && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  <Label className="text-sm font-medium">All Event Dates:</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {eventDates.map((date, index) => (
                      <span 
                        key={index}
                        className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                        data-testid={`date-chip-${index}`}
                      >
                        Day {index + 1}: {new Date(date).toLocaleDateString()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {enquiry && eventDuration > 1 && (
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                    <Label className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      Duration Change Notice
                    </Label>
                  </div>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    Event duration changed from single day to {eventDuration} days during booking confirmation.
                    This change will be logged in the audit trail.
                  </p>
                </div>
              )}
            </div>

            {/* Client Information - Pre-filled from Enquiry */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Client Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="clientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Name</FormLabel>
                      <FormControl>
                        <Input {...field} readOnly className="bg-muted" data-testid="input-client-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Number</FormLabel>
                      <FormControl>
                        <Input {...field} readOnly className="bg-muted" data-testid="input-contact-number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} readOnly className="bg-muted" data-testid="input-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="eventType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select event type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="wedding">Wedding</SelectItem>
                          <SelectItem value="corporate">Corporate Event</SelectItem>
                          <SelectItem value="conference">Conference</SelectItem>
                          <SelectItem value="anniversary">Anniversary</SelectItem>
                          <SelectItem value="birthday">Birthday Party</SelectItem>
                          <SelectItem value="engagement">Engagement</SelectItem>
                          <SelectItem value="reception">Reception</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Guest Count */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="confirmedPax"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmed Guest Count *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Number of guests" 
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : "")}
                        data-testid="input-confirmed-pax"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Session Management */}
            <div className="space-y-4">
              <SessionManagement
                sessions={sessions}
                onSessionsChange={(newSessions) => {
                  setSessions(newSessions);
                  form.setValue('sessions', newSessions);
                }}
                eventStartDate={form.watch('eventDate') || ""}
                eventEndDate={form.watch('eventEndDate') || undefined}
                eventDuration={eventDuration}
              />
            </div>

            {/* Note about Financial Details */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Financial Information</h4>
              <p className="text-sm text-blue-700">
                Financial details including quotations and pricing will be managed separately after the booking is confirmed. 
                This ensures proper tracking and documentation.
              </p>
            </div>

            {/* Contract Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Contract & Agreement</h3>
              <div className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <input
                  type="checkbox"
                  id="contractSigned"
                  checked={contractSigned}
                  onChange={(e) => {
                    setContractSigned(e.target.checked);
                  }}
                  className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  data-testid="checkbox-contract-signed"
                />
                <div className="space-y-1">
                  <Label htmlFor="contractSigned" className="text-sm font-medium">
                    Contract Signed & Terms Agreed
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Confirm that the booking contract has been signed by the client.
                  </p>
                </div>
              </div>
              
              {/* Advance Payment Checkbox */}
              <div className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <input
                  type="checkbox"
                  id="advanceReceived"
                  checked={advanceReceived}
                  onChange={(e) => {
                    setAdvanceReceived(e.target.checked);
                  }}
                  className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  data-testid="checkbox-advance-received"
                />
                <div className="space-y-1">
                  <Label htmlFor="advanceReceived" className="text-sm font-medium">
                    Advance Payment Received
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Confirm that advance payment has been received from the client.
                  </p>
                </div>
              </div>

              {(!contractSigned || !advanceReceived || sessions.length === 0) ? (
                <div className="text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded p-3">
                  <div className="font-medium mb-2">⚠️ Required before booking confirmation:</div>
                  <ul className="space-y-1 text-xs">
                    {!contractSigned && <li>• Contract must be signed and terms agreed</li>}
                    {!advanceReceived && <li>• Advance payment must be received</li>}
                    {sessions.length === 0 && <li>• At least one event session must be added (venue, time)</li>}
                  </ul>
                  <div className="mt-2 text-xs text-gray-600">
                    Debug: Contract: {contractSigned ? '✓' : '✗'}, Advance: {advanceReceived ? '✓' : '✗'}, Sessions: {sessions.length}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">
                  <div className="font-medium mb-2">✅ Ready for booking confirmation!</div>
                  <div className="text-xs text-gray-600">
                    All requirements met: Contract signed, advance received, and {sessions.length} session(s) added.
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button 
                type="button"
                disabled={createBookingMutation.isPending || !contractSigned || !advanceReceived || sessions.length === 0}
                data-testid="button-save-booking"
                onClick={(e) => {
                  e.preventDefault();
                  if (!contractSigned || !advanceReceived) {
                    toast({
                      title: "Requirements Not Met",
                      description: "Both contract signing and advance payment are required before booking confirmation",
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  if (sessions.length === 0) {
                    toast({
                      title: "Sessions Required",
                      description: "Please add at least one event session before creating the booking",
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  if (createBookingMutation.isPending) {
                    return;
                  }
                  
                  try {
                    form.trigger().then((isValid) => {
                      if (!isValid) {
                        const errors = form.formState.errors;
                        // Detailed error breakdown
                        Object.entries(errors).forEach(([field, error]: [string, any]) => {
                          if (field === 'sessions' && error?.root) {
                            }
                          if (field === 'sessions' && Array.isArray(error)) {
                            error.forEach((sessionError: any, index: number) => {
                              });
                          }
                        });
                        
                        // Check each required field
                        const formValues = form.getValues();
                        toast({
                          title: "Form Validation Error",
                          description: "Please check all required fields. See browser console for details.",
                          variant: "destructive",
                        });
                        return;
                      }
                      
                      form.handleSubmit(onSubmit)();
                    // Smart fallback: Only run if first submission fails
                    setTimeout(() => {
                      if (createBookingMutation.isError) {
                        const formData = form.getValues();
                        createBookingMutation.mutate(formData);
                      } else if (createBookingMutation.isSuccess) {
                        } else {
                        }
                    }, 2000); // Wait 2 seconds to see if first submission succeeds
                    }).catch((error) => {
                      toast({
                        title: "Error",
                        description: "Form validation failed",
                        variant: "destructive",
                      });
                    });
                  } catch (error) {
                    toast({
                      title: "Error",
                      description: "Failed to submit form",
                      variant: "destructive",
                    });
                  }
                }}
              >
                {createBookingMutation.isPending ? "Creating..." : "Confirm Booking"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    {/* Conflict Dialog */}
    <Dialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Venue Conflict Detected
          </DialogTitle>
          <DialogDescription>
            The selected venue and time slot conflicts with existing bookings. Please review the conflicts below and adjust your session times or choose a different venue.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {conflictData?.conflicts?.map((conflict: any, index: number) => (
            <div key={index} className="border border-red-200 bg-red-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                </div>
                
                <div className="flex-1">
                  <h4 className="font-semibold text-red-900 mb-2">Conflict #{index + 1}</h4>
                  
                  <div className="space-y-2 text-sm">
                    {/* Venue */}
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="font-medium text-red-900">Venue:</span>
                      <span className="text-red-800">{conflict.venue}</span>
                    </div>

                    {/* Date */}
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="font-medium text-red-900">Date:</span>
                      <span className="text-red-800">
                        {new Date(conflict.date).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </span>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-red-200 my-3"></div>

                    {/* Existing Booking */}
                    <div className="bg-white rounded p-3 border border-red-200">
                      <p className="font-medium text-red-900 mb-2 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Existing Booking
                      </p>
                      <div className="space-y-1 text-sm text-gray-700 ml-6">
                        <p><span className="font-medium">Booking #:</span> {conflict.existingBooking.bookingNumber}</p>
                        <p><span className="font-medium">Client:</span> {conflict.existingBooking.clientName}</p>
                        <p><span className="font-medium">Session:</span> {conflict.existingBooking.sessionName}</p>
                        <p><span className="font-medium">Time:</span> {conflict.existingBooking.startTime} - {conflict.existingBooking.endTime}</p>
                      </div>
                    </div>

                    {/* Your Conflicting Session */}
                    <div className="bg-orange-50 rounded p-3 border border-orange-200">
                      <p className="font-medium text-orange-900 mb-2 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Your Conflicting Session
                      </p>
                      <div className="space-y-1 text-sm text-orange-800 ml-6">
                        <p><span className="font-medium">Session:</span> {conflict.conflictingSession.sessionName}</p>
                        <p><span className="font-medium">Time:</span> {conflict.conflictingSession.startTime} - {conflict.conflictingSession.endTime}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Helpful message */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="font-medium text-blue-900 mb-1">How to resolve this conflict:</p>
                <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
                  <li>Change the session time to avoid the conflict</li>
                  <li>Select a different venue for the conflicting session</li>
                  <li>Choose a different date for your event</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => {
              setShowConflictDialog(false);
              setConflictData(null);
            }}
          >
            Close
          </Button>
          <Button
            onClick={() => {
              setShowConflictDialog(false);
              // Keep the form open so user can make changes
            }}
          >
            Modify Booking
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </>
  );
}
