import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, MapPin, Users, Phone, Mail, FileText, Edit, RotateCcw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { formatDate } from "@/utils/dateFormat";
import { getStatusColor, getStatusLabel, bookingUpdateOptions } from "@/lib/status-utils";
import { format } from "date-fns";
interface BookingDetailsDialogProps {
  booking: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function BookingDetailsDialog({ booking, open, onOpenChange }: BookingDetailsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newStatus, setNewStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancellationReasonNotes, setCancellationReasonNotes] = useState("");
  const [showStatusChange, setShowStatusChange] = useState(false);
  const [showReopenRequest, setShowReopenRequest] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const [reopenComments, setReopenComments] = useState("");

  // Fetch booking audit log
  const { data: auditLog = [] } = useQuery<any[]>({
    queryKey: [`/api/bookings/${booking?.id}/audit-log`],
    enabled: !!booking && open,
  });

  // Update booking status mutation
  const updateBookingMutation = useMutation({
    mutationFn: async (data: { status: string; notes?: string; cancellationReason?: string }) => {
      if (!booking) throw new Error('No booking selected');
      const response = await apiRequest("PATCH", `/api/bookings/${booking.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      setShowStatusChange(false);
      setNewStatus('');
      setNotes('');
      setCancellationReason('');
      setCancellationReasonNotes('');
      toast({
        title: "Success",
        description: "Booking status updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update booking status",
        variant: "destructive",
      });
    },
  });

  // Request reopen booking mutation
  const requestReopenMutation = useMutation({
    mutationFn: async (data: { reason: string; comments: string }) => {
      if (!booking) throw new Error('No booking selected');
      const response = await apiRequest("POST", `/api/bookings/${booking.id}/request-reopen`, data);
      return response.json();
    },
    onSuccess: () => {
      setShowReopenRequest(false);
      setReopenReason("");
      setReopenComments("");
      toast({
        title: "Success",
        description: "Reopen request submitted for admin approval",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to submit reopen request",
        variant: "destructive",
      });
    },
  });

  const handleStatusUpdate = () => {
    if (!newStatus) {
      toast({
        title: "Error",
        description: "Please select a status",
        variant: "destructive"
      });
      return;
    }

    // Require cancellation reason if status is cancelled
    if (newStatus === 'cancelled' && !cancellationReason) {
      toast({
        title: "Error",
        description: "Cancellation reason is required when cancelling a booking",
        variant: "destructive"
      });
      return;
    }

    // Require notes for specific cancellation reasons
    if (newStatus === 'cancelled' && cancellationReason === 'other' && !cancellationReasonNotes.trim()) {
      toast({
        title: "Error",
        description: "Additional notes are required for the selected cancellation reason",
        variant: "destructive"
      });
      return;
    }

    const updateData: any = { status: newStatus, notes };
    if (newStatus === 'cancelled') {
      updateData.cancellationReason = cancellationReason;
      if (cancellationReason === 'other' && cancellationReasonNotes.trim()) {
        updateData.cancellationReasonNotes = cancellationReasonNotes.trim();
      }
    }

    updateBookingMutation.mutate(updateData);
  };

  const handleReopenRequest = () => {
    if (!reopenReason) {
      toast({
        title: "Error",
        description: "Please select a reason for reopening",
        variant: "destructive"
      });
      return;
    }

    requestReopenMutation.mutate({
      reason: reopenReason,
      comments: reopenComments,
    });
  };

  if (!booking) return null;

  const getSourceLabel = (source: string) => {
    // Source values are now stored as display names, so return as-is
    return source;
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[98vw] sm:w-[95vw] md:w-full max-h-[95vh] overflow-y-auto touch-manipulation">
        <DialogHeader className="space-y-2 pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="truncate">Booking Details - {booking.bookingNumber}</span>
          </DialogTitle>
          <DialogDescription className="text-sm">
            Complete information about this booking
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-9 sm:h-10">
            <TabsTrigger value="details" data-testid="tab-booking-details" className="text-xs sm:text-sm">
              Booking Details
            </TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-booking-history" className="text-xs sm:text-sm">
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 sm:space-y-6 min-h-[500px]">
            {/* Change Status Actions */}
            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                {!booking.statusChanged ? (
                  <Button 
                    variant="outline"
                    className="flex items-center justify-center gap-2 w-full sm:w-auto" 
                    data-testid="button-change-status"
                    onClick={() => setShowStatusChange(true)}
                    size="sm"
                  >
                    <Edit className="w-4 h-4" />
                    <span className="hidden sm:inline">Change Status</span>
                    <span className="sm:hidden">Status</span>
                  </Button>
                ) : (
                  <Button 
                    variant="outline"
                    className="flex items-center justify-center gap-2 w-full sm:w-auto" 
                    data-testid="button-request-reopen"
                    onClick={() => setShowReopenRequest(true)}
                    size="sm"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span className="hidden sm:inline">Request Reopen</span>
                    <span className="sm:hidden">Reopen</span>
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <Label className="font-medium">Booking Date:</Label>
                    <span>{format(new Date(booking.createdAt), "dd MMMM, yyyy")}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(booking.status || "booked")}>
                      {getStatusLabel(booking.status || "booked")}
                    </Badge>
                  </div>

                  <Separator />

                  <div>
                    <Label className="font-medium">Client Name:</Label>
                    <p className="text-sm">{booking.clientName}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <Label className="font-medium">Contact:</Label>
                    <a 
                      href={`tel:${booking.contactNumber}`} 
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
                      data-testid="link-contact-number"
                      title="Click to call"
                    >
                      {booking.contactNumber}
                    </a>
                  </div>

                  {booking.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <Label className="font-medium">Email:</Label>
                      <span className="text-sm">{booking.email}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <Label className="font-medium">Source:</Label>
                    <span className="text-sm">{getSourceLabel(booking.enquirySource || 'direct')}</span>
                  </div>

                  <div>
                    <Label className="font-medium">Enquiry Number:</Label>
                    <p className="text-sm font-mono">{booking.enquiryNumber}</p>
                  </div>

                  <div>
                    <Label className="font-medium">Salesperson:</Label>
                    <p className="text-sm">
                      {booking.salesperson?.firstName && booking.salesperson?.lastName ? 
                        `${booking.salesperson.firstName} ${booking.salesperson.lastName}` : 
                        'TBD'
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Event Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Event Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <Label className="font-medium">Event Date{booking.eventDuration > 1 ? 's' : ''}:</Label>
                    <span>
                      {booking.eventDuration > 1 && booking.eventEndDate ? (
                        `${formatDate(booking.eventDate)} to ${formatDate(booking.eventEndDate)}`
                      ) : (
                        formatDate(booking.eventDate)
                      )}
                      {booking.eventDuration > 1 && (
                        <span className="ml-2 text-blue-600 dark:text-blue-400 font-medium text-xs">
                          ({booking.eventDuration} Day Event)
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Show all event dates for multi-day events */}
                  {booking.eventDuration > 1 && (
                    <div>
                      <Label className="font-medium">All Event Dates:</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {booking.eventDates && Array.isArray(booking.eventDates) && booking.eventDates.length > 0 ? (
                          booking.eventDates.map((date: string, index: number) => (
                            <Badge key={index} variant="default" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              Day {index + 1}: {formatDate(date)}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">Event dates not available</span>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <Label className="font-medium">Event Type:</Label>
                    <p className="text-sm">{booking.eventType?.replace('_', ' ') || 'Event'}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <Label className="font-medium">Confirmed Pax:</Label>
                    <span className="text-sm">{booking.confirmedPax}</span>
                  </div>

                  {booking.hall && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <Label className="font-medium">Venue:</Label>
                      <span className="text-sm">{booking.hall}</span>
                    </div>
                  )}

                  <div>
                    <Label className="font-medium">Contract Status:</Label>
                    <p className={`text-sm font-medium ${booking.contractSigned ? 'text-green-600' : 'text-orange-600'}`}>
                      {booking.contractSigned ? '✓ Contract Signed' : 'Pending Contract'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Session Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Session Details
                  {booking.sessions && booking.sessions.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {booking.sessions.length} Session{booking.sessions.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {booking.sessions && booking.sessions.length > 0 ? (
                  <div className="space-y-4">
                    {booking.sessions.map((session: any, index: number) => (
                      <div key={session._id || index} className="border rounded-lg p-4 bg-muted/30">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-base">{session.sessionName}</h4>
                          {session.sessionLabel && (
                            <Badge variant="outline" className="text-xs">
                              {session.sessionLabel}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <Label className="font-medium text-sm">Date:</Label>
                              <span className="text-sm">{formatDate(session.sessionDate)}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <Label className="font-medium text-sm">Time:</Label>
                              <span className="text-sm">{session.startTime} - {session.endTime}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-muted-foreground" />
                              <Label className="font-medium text-sm">Venue:</Label>
                              <span className="text-sm font-medium">{session.venue}</span>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-muted-foreground" />
                              <Label className="font-medium text-sm">Guests:</Label>
                              <span className="text-sm">{session.paxCount || booking.confirmedPax || 'N/A'}</span>
                            </div>
                            
                            {session.specialInstructions && (
                              <div>
                                <Label className="font-medium text-sm">Special Instructions:</Label>
                                <p className="text-sm text-muted-foreground mt-1 bg-background p-2 rounded border">
                                  {session.specialInstructions}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">No session details available</p>
                    <p className="text-xs mt-1">Session information will appear here once the booking is confirmed</p>
                  </div>
                )}
              </CardContent>
            </Card>

          </TabsContent>
          
          <TabsContent value="history" className="space-y-4 sm:space-y-6 min-h-[500px]">
            <div>
              <h3 className="text-lg font-semibold mb-4">Booking History</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Complete timeline of status changes and modifications
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Change Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                {auditLog && auditLog.length > 0 ? (
                  <div className="space-y-4">
                    {auditLog.map((log: any, index: number) => (
                      <div 
                        key={log.id} 
                        className="border-l-4 border-blue-200 pl-4 py-2 bg-gray-50 rounded-r-md"
                        data-testid={`booking-audit-log-${index}`}
                      >
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {log.action}
                              </Badge>
                              {log.fromStatus && log.toStatus && (
                                <span className="text-sm font-medium">
                                  {getStatusLabel(log.fromStatus)} → {getStatusLabel(log.toStatus)}
                                </span>
                              )}
                              {log.action === 'created' && (
                                <span className="text-sm font-medium">
                                  Initial Status: {getStatusLabel(log.toStatus)}
                                </span>
                              )}
                            </div>
                            {log.cancellationReason && (
                              <p className="text-sm text-gray-700 mb-1">
                                <span className="font-medium">Cancellation Reason:</span> {log.cancellationReason}
                              </p>
                            )}
                            {log.notes && (
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Notes:</span> {log.notes}
                              </p>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(log.createdAt), "dd MMM yyyy, HH:mm")}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No history available for this booking.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>

    {/* Status Change Dialog */}
    <Dialog open={showStatusChange} onOpenChange={setShowStatusChange}>
      <DialogContent className="max-w-md w-[98vw] sm:w-[95vw] md:w-full touch-manipulation">
        <DialogHeader className="space-y-2 pb-4">
          <DialogTitle className="text-lg">Change Booking Status</DialogTitle>
          <DialogDescription className="text-sm">
            Update the status of this booking
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label className="font-medium">Current Status:</Label>
            <div className="mt-2">
              <Badge className={getStatusColor(booking?.status || 'booked')}>
                {getStatusLabel(booking?.status || 'booked')}
              </Badge>
            </div>
          </div>

          <Separator />

          <div>
            <Label htmlFor="new-status">New Status</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger className="mt-1 w-full min-h-[44px] touch-manipulation">
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent className="z-50">
                {bookingUpdateOptions.map(option => (
                  <SelectItem key={option.value} value={option.value} className="min-h-[44px] cursor-pointer">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {newStatus === 'cancelled' && (
            <>
              <div>
                <Label htmlFor="cancellation-reason">Cancellation Reason *</Label>
                <Select value={cancellationReason} onValueChange={setCancellationReason}>
                  <SelectTrigger className="mt-1 w-full min-h-[44px] touch-manipulation" data-testid="select-cancellation-reason">
                    <SelectValue placeholder="Select cancellation reason" />
                  </SelectTrigger>
                  <SelectContent className="z-50">
                    <SelectItem value="client_cancelled">Client cancelled event</SelectItem>
                    <SelectItem value="date_changed">Date changed (client postponed)</SelectItem>
                    <SelectItem value="payment_not_received">Payment not received</SelectItem>
                    <SelectItem value="force_majeure">Force majeure (e.g., lockdown, disaster)</SelectItem>
                    <SelectItem value="double_booking">Double booking error / Internal mistake</SelectItem>
                    <SelectItem value="other">Other (with notes)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {cancellationReason === 'other' && (
                <div>
                  <Label htmlFor="cancellation-reason-notes">Additional Notes *</Label>
                  <Textarea
                    id="cancellation-reason-notes"
                    value={cancellationReasonNotes}
                    onChange={(e) => setCancellationReasonNotes(e.target.value)}
                    placeholder="Please provide more details..."
                    className="mt-1"
                    data-testid="textarea-cancellation-reason-notes"
                    rows={3}
                  />
                </div>
              )}
            </>
          )}

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this status change..."
              className="mt-1"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              onClick={handleStatusUpdate}
              disabled={updateBookingMutation.isPending}
              className="w-full sm:w-auto min-h-[44px] touch-manipulation"
              data-testid="button-update-status"
            >
              {updateBookingMutation.isPending ? 'Updating...' : 'Update Status'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setNewStatus('');
                setNotes('');
                setCancellationReason('');
                setCancellationReasonNotes('');
              }}
              className="w-full sm:w-auto min-h-[44px] touch-manipulation"
              data-testid="button-clear-status"
            >
              Clear
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Reopen Request Dialog */}
    <Dialog open={showReopenRequest} onOpenChange={setShowReopenRequest}>
      <DialogContent className="max-w-md w-[98vw] sm:w-[95vw] md:w-full touch-manipulation">
        <DialogHeader>
          <DialogTitle>Request Booking Reopen</DialogTitle>
          <DialogDescription>
            Submit a request to reopen this booking. Admin approval will be required.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="reopen-reason">Reason for Reopening *</Label>
            <Select value={reopenReason} onValueChange={setReopenReason}>
              <SelectTrigger data-testid="select-reopen-reason">
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="client_reconnected">Client Reconnected</SelectItem>
                <SelectItem value="wrongly_marked_lost">Wrongly Marked as Lost/Cancelled</SelectItem>
                <SelectItem value="package_revised">Package Revised</SelectItem>
                <SelectItem value="event_postponed">Event Postponed</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="reopen-comments">Additional Comments</Label>
            <Textarea
              id="reopen-comments"
              value={reopenComments}
              onChange={(e) => setReopenComments(e.target.value)}
              placeholder="Provide additional details about the reopen request..."
              data-testid="textarea-reopen-comments"
            />
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleReopenRequest}
              disabled={requestReopenMutation.isPending}
              className="flex-1"
              data-testid="button-submit-reopen-request"
            >
              {requestReopenMutation.isPending ? 'Submitting...' : 'Submit Request'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowReopenRequest(false)}
              className="flex-1"
              data-testid="button-cancel-reopen-request"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}