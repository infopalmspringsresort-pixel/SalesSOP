import { useState, useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertEnquirySchema, insertEnquirySessionSchema } from "@shared/schema-client";
import { z } from "zod";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { Plus, X } from "lucide-react";
import { PhoneInput } from "@/components/ui/phone-input";
import EnquirySessionManagement from "@/components/ui/enquiry-session-management";
import { CityInputAutocomplete } from "@/components/ui/city-autocomplete";

// Utility function to convert text to title case
const toTitleCase = (str: string): string => {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const formatDateInput = (value: Date | string | null | undefined) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return "";
  return date.toISOString().split('T')[0];
};

const formatDateArray = (values: any, fallback?: string): string[] => {
  if (!Array.isArray(values)) {
    return fallback ? [fallback] : [];
  }

  const formatted = values
    .map((date) => formatDateInput(date))
    .filter((value): value is string => Boolean(value));

  if (formatted.length === 0 && fallback) {
    return [fallback];
  }

  return formatted;
};

const sessionSchema = insertEnquirySessionSchema.extend({
  id: z.string(),
  sessionDate: z.date(),
});

const formSchema = insertEnquirySchema.extend({
  enquiryNumber: z.string().optional(), // Make enquiryNumber optional since it's auto-generated
  enquiryDate: z.string(),
  eventDate: z.string({ required_error: "Event date is required" }).min(1, "Event date is required").refine(
    (date) => {
      if (!date) return false;
      const eventDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day
      return eventDate >= today;
    },
    { message: "Event date cannot be in the past" }
  ),
  eventEndDate: z.string().optional(),
  eventDuration: z.number().min(1).default(1),
  eventDates: z.array(z.string()).optional(),
  tentativeDates: z.array(z.string()).optional(),
  salespersonId: z.string().optional(),
  city: z.string().optional(),
  sessions: z.array(sessionSchema).default([]),
  createdBy: z.string(),
  assignmentStatus: z.enum(['unassigned', 'pending', 'assigned', 'accepted', 'rejected']).optional(),
  assignedTo: z.string().optional(),
  contactNumber: z.string().refine(
    (phone) => {
      if (!phone) return false;
      
      // Extract country code and number
      const parts = phone.split(' ');
      if (parts.length !== 2) return false;
      
      const [countryCode, number] = parts;
      const digitsOnly = number.replace(/\D/g, '');
      
      // For India (+91), require exactly 10 digits
      if (countryCode === '+91') {
        return digitsOnly.length === 10;
      }
      
      // For other countries, require 7-15 digits
      return digitsOnly.length >= 7 && digitsOnly.length <= 15;
    },
    { message: "Phone number must be valid (10 digits for India, 7-15 digits for other countries)" }
  ),
  expectedPax: z.union([z.number().min(1, "Expected PAX must be at least 1"), z.null()]).optional(),
  numberOfRooms: z.union([z.number().min(0, "Number of rooms cannot be negative"), z.null()]).optional(),
});

interface EnquiryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingEnquiry?: any;
  prefilledData?: { clientName?: string; email?: string; city?: string; contactNumber?: string } | null;
}

export default function EnquiryForm({ open, onOpenChange, editingEnquiry, prefilledData }: EnquiryFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const initialEventDate = formatDateInput(editingEnquiry?.eventDate);
  const initialEventEndDate = formatDateInput(editingEnquiry?.eventEndDate);
  const initialEventDuration = editingEnquiry?.eventDuration || 1;
  const initialEventDates = formatDateArray(editingEnquiry?.eventDates, initialEventDate || undefined);
  const initialCustomDuration = initialEventDuration > 3 ? initialEventDuration : 4;

  const [tentativeDates, setTentativeDates] = useState<string[]>([]);
  const [sessions, setSessions] = useState<z.infer<typeof sessionSchema>[]>([]);
  const [customDuration, setCustomDuration] = useState<number>(initialCustomDuration);
  const [showCollisionDialog, setShowCollisionDialog] = useState(false);
  const [collisionMessage, setCollisionMessage] = useState<string>("");
  const [isSearchingPhone, setIsSearchingPhone] = useState(false);
  const [hasPrefilled, setHasPrefilled] = useState(false);
  const [lastSearchedPhone, setLastSearchedPhone] = useState<string>("");

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
    enabled: open,
    retry: 1,
    retryOnMount: false,
  });

  // Filter to show salespeople and managers for assignment
  const salespeople = (users || []).filter(user => {
    const userRole = user.role?.name || user.role; // Handle both object and string role formats
    return userRole === 'salesperson' || userRole === 'manager';
  });

  // For staff users, salesperson assignment is NOT allowed
  // Handle both object and string role formats
  const userRole = (user as any)?.role?.name || (user as any)?.role;
  const isStaffUser = userRole === 'staff';
  const isSalespersonOrManager = userRole === 'salesperson' || userRole === 'manager';
  
  // Role-based salesperson assignment logic
  const canChangeSalesperson = userRole === 'admin' || 
    (userRole === 'manager' && !editingEnquiry) ||
    (userRole === 'salesperson' && !editingEnquiry);

  const initialDefaults = {
    enquiryDate: editingEnquiry ? new Date(editingEnquiry.enquiryDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    clientName: editingEnquiry?.clientName || "",
    contactNumber: editingEnquiry?.contactNumber || "+91 ",
    email: editingEnquiry?.email || "",
    city: editingEnquiry?.city || "",
    eventType: editingEnquiry?.eventType || "wedding",
    expectedPax: editingEnquiry?.expectedPax || null,
    numberOfRooms: editingEnquiry?.numberOfRooms ?? null,
    source: editingEnquiry?.source || "Walk-in",
    notes: editingEnquiry?.notes || "",
    eventDate: initialEventDate,
    eventEndDate: initialEventEndDate,
    eventDuration: initialEventDuration,
    eventDates: initialEventDates,
    tentativeDates: editingEnquiry?.tentativeDates || [],
    salespersonId: editingEnquiry?.salespersonId || (user && typeof user === 'object' && 'id' in user ? user.id as string : undefined) || undefined,
    sessions: editingEnquiry?.sessions || [],
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialDefaults,
    shouldUnregister: true,
  });

  const saveEnquiryMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const enquiryData = {
        enquiryDate: new Date(data.enquiryDate || new Date().toISOString()),
        clientName: data.clientName,
        contactNumber: data.contactNumber,
        email: data.email || null,
        city: data.city || null,
        eventType: data.eventType,
        eventDate: data.eventDate ? new Date(data.eventDate) : null,
        eventEndDate: data.eventEndDate ? new Date(data.eventEndDate) : null,
        eventDuration: data.eventDuration || 1,
        eventDates: data.eventDates ? data.eventDates.map(date => new Date(date)) : null,
        tentativeDates: (tentativeDates || []).length > 0 ? (tentativeDates || []).filter(date => date).map(date => new Date(date)) : null,
        expectedPax: data.expectedPax || null,
        numberOfRooms: data.numberOfRooms ?? 0,
        source: data.source,
        notes: data.notes || null,
        salespersonId: data.salespersonId && data.salespersonId !== "no-salesperson" ? data.salespersonId : null,
        createdBy: data.createdBy, // Add createdBy field
        assignmentStatus: data.assignmentStatus, // Add assignmentStatus field
        assignedTo: data.assignedTo, // Add assignedTo field
        sessions: sessions.map(session => ({
          sessionName: session.sessionName,
          sessionLabel: session.sessionLabel || null,
          venue: session.venue,
          startTime: session.startTime,
          endTime: session.endTime,
          sessionDate: session.sessionDate,
          paxCount: session.paxCount || 0,
          specialInstructions: session.specialInstructions || null,
        })),
      };
      
      if (editingEnquiry?.id) {
        const response = await apiRequest("PATCH", `/api/enquiries/${editingEnquiry.id}`, enquiryData);
        return response.json();
      } else {
        const response = await apiRequest("POST", "/api/enquiries", enquiryData);
        return response.json();
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: editingEnquiry?.id ? "Enquiry updated successfully" : "Enquiry created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/enquiries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      form.reset();
      setTentativeDates([]);
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
      if (error?.status === 409) {
        const msg = error?.data?.message || 'Venue collision with existing converted/booked record. Creation/update blocked.';
        setCollisionMessage(msg);
        setShowCollisionDialog(true);
        return;
      }
      toast({
        title: "Error",
        description: editingEnquiry?.id ? "Failed to update enquiry" : "Failed to create enquiry",
        variant: "destructive",
      });
    },
  });

  // Reset form when editing enquiry changes
  useEffect(() => {
    if (open) {
      // Reset prefilled state for new enquiries
      if (!editingEnquiry) {
        // If we have prefilledData, mark as prefilled to prevent auto-search
        if (prefilledData?.contactNumber) {
          setHasPrefilled(true);
          setLastSearchedPhone(prefilledData.contactNumber);
        } else {
          setHasPrefilled(false);
          setLastSearchedPhone("");
        }
      }
      
      // Convert tentative dates to string format if they exist
      const tentativeDatesStrings = editingEnquiry?.tentativeDates 
        ? (editingEnquiry.tentativeDates || []).map((date: any) => {
            if (typeof date === 'string') {
              // If it's already a string, check if it's in ISO format or date format
              return date.includes('T') ? new Date(date).toISOString().split('T')[0] : date;
            } else {
              return new Date(date).toISOString().split('T')[0];
            }
          })
        : [];

      const defaultEventDate = formatDateInput(editingEnquiry?.eventDate);
      const defaultEventDuration = editingEnquiry?.eventDuration || 1;
      const defaultEventEndDate = formatDateInput(editingEnquiry?.eventEndDate);
      const defaultEventDates = formatDateArray(editingEnquiry?.eventDates, defaultEventDate || undefined);

      const defaultValues = {
        enquiryDate: editingEnquiry ? new Date(editingEnquiry.enquiryDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        clientName: editingEnquiry?.clientName || prefilledData?.clientName || "",
        contactNumber: editingEnquiry?.contactNumber || prefilledData?.contactNumber || "+91 ",
        email: editingEnquiry?.email || prefilledData?.email || "",
        city: editingEnquiry?.city || prefilledData?.city || "",
        eventType: editingEnquiry?.eventType || "wedding",
        expectedPax: editingEnquiry?.expectedPax || null,
        numberOfRooms: editingEnquiry?.numberOfRooms ?? null,
        source: editingEnquiry?.source || "Walk-in",
        notes: editingEnquiry?.notes || "",
        eventDate: defaultEventDate,
        eventEndDate: defaultEventEndDate,
        eventDuration: defaultEventDuration,
        eventDates: defaultEventDates,
        tentativeDates: tentativeDatesStrings,
        salespersonId: editingEnquiry?.salespersonId || (isSalespersonOrManager ? ((user as any)?.id || (user as any)?._id) : undefined),
        createdBy: editingEnquiry?.createdBy || (user as any)?.id || (user as any)?._id || '',
        assignmentStatus: editingEnquiry?.assignmentStatus || (isStaffUser ? 'unassigned' : 'assigned'),
        assignedTo: editingEnquiry?.assignedTo || (isSalespersonOrManager ? ((user as any)?.id || (user as any)?._id) : undefined),
      };
      
      form.reset(defaultValues);
      setTentativeDates(tentativeDatesStrings);
      form.setValue('tentativeDates', tentativeDatesStrings);
      setCustomDuration(defaultEventDuration > 3 ? defaultEventDuration : 4);
    }
  }, [open, editingEnquiry, prefilledData, form]);

  // Clear stale local/form state on close for fresh new opens
  useEffect(() => {
    if (!open) {
      setTentativeDates([]);
      setSessions([]);
      form.reset(initialDefaults);
      setHasPrefilled(false);
      setLastSearchedPhone("");
      setCustomDuration(initialCustomDuration);
    }
  }, [open]);

  const watchedEventDate = useWatch({
    control: form.control,
    name: "eventDate",
  });

  const watchedEventDuration = useWatch({
    control: form.control,
    name: "eventDuration",
  });

  const watchedEventDates = useWatch({
    control: form.control,
    name: "eventDates",
  }) as string[] | undefined;

  const watchedEventEndDate = useWatch({
    control: form.control,
    name: "eventEndDate",
  });

  const resolvedEventDuration = useMemo(() => {
    const parsed = Number(watchedEventDuration);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  }, [watchedEventDuration]);

  const eventDatesKey = useMemo(
    () => (Array.isArray(watchedEventDates) ? watchedEventDates.join("|") : ""),
    [watchedEventDates]
  );

  const resolvedEventDates = useMemo(() => {
    if (!Array.isArray(watchedEventDates)) return [];
    return watchedEventDates
      .map((date) => {
        const parsed = new Date(date);
        if (isNaN(parsed.getTime())) {
          return null;
        }
        return parsed.toISOString().split('T')[0];
      })
      .filter((value): value is string => Boolean(value));
  }, [eventDatesKey]);

  useEffect(() => {
    if (resolvedEventDuration > 3) {
      setCustomDuration((prev) => (prev === resolvedEventDuration ? prev : resolvedEventDuration));
    } else {
      const fallback = Math.max(resolvedEventDuration, 4);
      setCustomDuration((prev) => (prev === fallback ? prev : fallback));
    }
  }, [resolvedEventDuration]);

  useEffect(() => {
    const duration = resolvedEventDuration || 1;

    if (!watchedEventDate) {
      const currentEventDates = form.getValues("eventDates") as string[] | undefined;
      if (currentEventDates && currentEventDates.length > 0) {
        form.setValue("eventDates", [], { shouldDirty: false, shouldValidate: false });
      }
      const currentEndDate = form.getValues("eventEndDate") as string | undefined;
      if (currentEndDate) {
        form.setValue("eventEndDate", "", { shouldDirty: false, shouldValidate: false });
      }
      return;
    }

    const startDate = new Date(watchedEventDate);
    if (isNaN(startDate.getTime())) {
      return;
    }

    const dates: string[] = [];
    for (let i = 0; i < duration; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }

    const currentEventDates = form.getValues("eventDates") as string[] | undefined;
    const shouldUpdateDates =
      !currentEventDates ||
      currentEventDates.length !== dates.length ||
      currentEventDates.some((value, index) => value !== dates[index]);

    if (shouldUpdateDates) {
      form.setValue("eventDates", dates, { shouldDirty: false, shouldValidate: false });
    }

    const currentEndDate = form.getValues("eventEndDate") as string | undefined;
    const targetEndDate = duration > 1 ? dates[dates.length - 1] : "";
    if (currentEndDate !== targetEndDate) {
      form.setValue("eventEndDate", targetEndDate, { shouldDirty: false, shouldValidate: false });
    }
  }, [form, resolvedEventDuration, watchedEventDate]);

  useEffect(() => {
    if (!resolvedEventDates.length) return;

    setSessions((prevSessions) => {
      let changed = false;
      const updated = prevSessions.map((session) => {
        if (!(session.sessionDate instanceof Date) || isNaN(session.sessionDate.getTime())) {
          changed = true;
          return { ...session, sessionDate: new Date(resolvedEventDates[0]) };
        }

        const sessionDateStr = session.sessionDate.toISOString().split('T')[0];
        if (!resolvedEventDates.includes(sessionDateStr)) {
          changed = true;
          return { ...session, sessionDate: new Date(resolvedEventDates[0]) };
        }

        return session;
      });

      return changed ? updated : prevSessions;
    });
  }, [resolvedEventDates, setSessions]);

  // Watch contact number for prefilling (only for new enquiries)
  const contactNumber = useWatch({
    control: form.control,
    name: "contactNumber",
  });

  useEffect(() => {
    // Only search for new enquiries, not when editing
    if (editingEnquiry || !open) return;

    // Check if phone number is valid (for India: +91 followed by 10 digits)
    const isValidPhone = (phone: string) => {
      if (!phone || phone === "+91 ") return false;
      const parts = phone.split(' ');
      if (parts.length !== 2) return false;
      const [countryCode, number] = parts;
      const digitsOnly = number.replace(/\D/g, '');
      if (countryCode === '+91') {
        return digitsOnly.length === 10;
      }
      return digitsOnly.length >= 7 && digitsOnly.length <= 15;
    };

    // Skip if phone is invalid or already searched for this number
    if (!isValidPhone(contactNumber) || contactNumber === lastSearchedPhone) return;

    // Debounce the API call
    const timeoutId = setTimeout(async () => {
      setIsSearchingPhone(true);
      try {
        const response = await apiRequest("GET", `/api/enquiries/search-by-phone?phone=${encodeURIComponent(contactNumber)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.found) {
            // Prefill form fields only if they're currently empty
            const currentClientName = form.getValues("clientName");
            const currentEmail = form.getValues("email");
            const currentCity = form.getValues("city");

            if (!currentClientName && data.clientName) {
              form.setValue("clientName", toTitleCase(data.clientName), { shouldValidate: false });
            }
            if (!currentEmail && data.email) {
              form.setValue("email", data.email, { shouldValidate: false });
            }
            if (!currentCity && data.city) {
              form.setValue("city", toTitleCase(data.city), { shouldValidate: false });
            }
            
            setHasPrefilled(true);
            setLastSearchedPhone(contactNumber);
            toast({
              title: "Previous enquiry found",
              description: "Client information has been prefilled from previous enquiry.",
            });
          } else {
            // No match found, but remember we searched this number
            setLastSearchedPhone(contactNumber);
          }
        }
      } catch (error) {
        // Silently fail - don't show error for search
        console.error("Error searching by phone:", error);
      } finally {
        setIsSearchingPhone(false);
      }
    }, 800); // Wait 800ms after user stops typing

    return () => clearTimeout(timeoutId);
  }, [contactNumber, editingEnquiry, open, lastSearchedPhone, form, toast]);

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    // Get user ID (handle both id and _id formats)
    const userId = (user as any)?.id || (user as any)?._id;
    
    // Check if user is available
    if (!user || !userId) {
      toast({
        title: "Authentication Error",
        description: "User information not available. Please refresh the page and try again.",
        variant: "destructive",
      });
      return;
    }

    // Ensure createdBy is always set for new enquiries
    const enquiryData = {
      ...data,
      createdBy: userId, // Always set from current user
      assignmentStatus: isStaffUser ? 'unassigned' : 'assigned',
      assignedTo: isStaffUser ? undefined : (data.salespersonId || userId), // Admin can assign to others, others get themselves
      salespersonId: isStaffUser ? null : data.salespersonId, // Staff users cannot assign salesperson
    };

    saveEnquiryMutation.mutate(enquiryData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto w-[98vw] sm:w-[95vw] md:w-full bg-gradient-to-br from-white to-blue-50/30 border-0 shadow-2xl touch-manipulation">
        <DialogHeader className="space-y-3 pb-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-bold">{editingEnquiry ? "Edit Enquiry" : "New Enquiry Entry"}</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                {editingEnquiry ? "Update the enquiry details below." : "Create a new enquiry to track potential bookings and client requirements."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <FormField
                  control={form.control}
                  name="enquiryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Enquiry Date</FormLabel>
                      <FormControl>
                        <div className="px-3 py-2 bg-muted border border-input rounded-md text-sm text-muted-foreground">
                          {editingEnquiry 
                            ? new Date(editingEnquiry.enquiryDate).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'long', 
                                year: 'numeric',
                                timeZone: 'Asia/Kolkata'
                              })
                            : new Date().toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric',
                                timeZone: 'Asia/Kolkata'
                              })
                          }
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Name *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter client name" 
                          className={editingEnquiry ? "min-h-[44px] touch-manipulation bg-muted cursor-not-allowed" : "min-h-[44px] touch-manipulation"}
                          {...field} 
                          onChange={(e) => {
                            const titleCaseName = toTitleCase(e.target.value);
                            field.onChange(titleCaseName);
                          }}
                          data-testid="input-client-name" 
                          readOnly={!!editingEnquiry}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <FormField
                  control={form.control}
                  name="contactNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Number *</FormLabel>
                      <FormControl>
                        <PhoneInput 
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Enter phone number"
                          data-testid="input-contact-number"
                          disabled={!!editingEnquiry}
                          readOnly={!!editingEnquiry}
                          className={editingEnquiry ? "opacity-50 cursor-not-allowed" : ""}
                        />
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
                        <Input 
                          type="email" 
                          placeholder="client@example.com" 
                          className={editingEnquiry ? "min-h-[44px] touch-manipulation bg-muted cursor-not-allowed" : "min-h-[44px] touch-manipulation"}
                          {...field} 
                          value={field.value || ""} 
                          data-testid="input-email" 
                          readOnly={!!editingEnquiry}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <CityInputAutocomplete
                          value={field.value || ""}
                          onChange={(value) => {
                            const titleCaseCity = toTitleCase(value);
                            field.onChange(titleCaseCity);
                          }}
                          placeholder="Select or type city..."
                          data-testid="input-city"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <FormField
                  control={form.control}
                  name="eventType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-event-type" className="min-h-[44px] touch-manipulation">
                            <SelectValue placeholder="Select event type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="wedding">Wedding</SelectItem>
                          <SelectItem value="birthday">Birthday Party</SelectItem>
                          <SelectItem value="corporate">Corporate Event</SelectItem>
                          <SelectItem value="conference">Conference</SelectItem>
                          <SelectItem value="anniversary">Anniversary</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                          required
                          {...field}
                          data-testid="input-event-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <FormField
                  control={form.control}
                  name="eventDuration"
                  render={({ field }) => {
                    const isMultiDuration = resolvedEventDuration > 3;
                    const selectValue = isMultiDuration ? "multi" : (resolvedEventDuration || 1).toString();
                    return (
                      <FormItem>
                        <FormLabel>Number of Event Days *</FormLabel>
                        <Select
                          value={selectValue}
                          onValueChange={(value) => {
                            if (value === "multi") {
                              const multiValue = Math.max(customDuration || 4, 4);
                              setCustomDuration(multiValue);
                              field.onChange(multiValue);
                            } else {
                              const parsed = parseInt(value, 10);
                              setCustomDuration(Math.max(parsed, 4));
                              field.onChange(parsed);
                            }
                          }}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-event-duration">
                              <SelectValue placeholder="Select duration" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1">Single Day</SelectItem>
                            <SelectItem value="2">2 Days</SelectItem>
                            <SelectItem value="3">3 Days</SelectItem>
                            <SelectItem value="multi">Multiple Days</SelectItem>
                          </SelectContent>
                        </Select>
                        { (resolvedEventDuration > 3 || selectValue === "multi") && (
                          <div className="mt-3 space-y-2">
                            <Label htmlFor="custom-event-duration">Specify total number of days *</Label>
                            <Input
                              id="custom-event-duration"
                              type="number"
                              min={4}
                              max={30}
                              value={customDuration}
                              onChange={(e) => {
                                const raw = parseInt(e.target.value, 10);
                                const sanitized = Number.isFinite(raw) ? Math.min(Math.max(raw, 4), 30) : 4;
                                setCustomDuration(sanitized);
                                field.onChange(sanitized);
                              }}
                            />
                            <p className="text-xs text-muted-foreground">
                              Enter 4 or more days for larger events.
                            </p>
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                {resolvedEventDuration > 1 && (
                  <FormField
                    control={form.control}
                    name="eventEndDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Event End Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            value={field.value || ""}
                            readOnly
                            className="bg-muted cursor-not-allowed"
                            tabIndex={-1}
                            data-testid="input-event-end-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {resolvedEventDuration > 1 && resolvedEventDates.length > 0 && (
                <div className="flex flex-wrap gap-2 bg-muted/40 border border-dashed border-muted rounded-md p-3 text-sm text-muted-foreground">
                  {resolvedEventDates.map((date, index) => (
                    <span key={date} className="px-3 py-1 bg-background rounded-full border border-muted">
                      Day {index + 1}: {new Date(date).toLocaleDateString()}
                    </span>
                  ))}
                </div>
              )}

              {/* Tentative Dates Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Additional Tentative Dates</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setTentativeDates([...tentativeDates, ""])}
                    data-testid="button-add-tentative-date"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Date
                  </Button>
                </div>
                
                {(tentativeDates || []).length > 0 && (tentativeDates || []).map((date, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={date}
                      onChange={(e) => {
                        const newDates = [...tentativeDates];
                        newDates[index] = e.target.value;
                        setTentativeDates(newDates);
                      }}
                      className="flex-1"
                      data-testid={`input-tentative-date-${index}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const newDates = (tentativeDates || []).filter((_, i) => i !== index);
                        setTentativeDates(newDates);
                      }}
                      data-testid={`button-remove-tentative-date-${index}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                
                {(tentativeDates || []).length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Add alternative event dates for flexibility
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <FormField
                  control={form.control}
                  name="expectedPax"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expected PAX</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Number of guests" 
                          min="1"
                          {...field}
                          value={field.value?.toString() || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === "" || value === "0") {
                              field.onChange(null);
                            } else {
                              const num = parseInt(value);
                              field.onChange(num > 0 ? num : null);
                            }
                          }}
                          data-testid="input-expected-pax"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="numberOfRooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Rooms</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Number of rooms" 
                          min="0"
                          {...field}
                          value={field.value?.toString() || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === "") {
                              field.onChange(null);
                            } else {
                              const num = parseInt(value);
                              field.onChange(num >= 0 ? num : 0);
                            }
                          }}
                          data-testid="input-number-of-rooms"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-source">
                            <SelectValue placeholder="Select source" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Walk-in">Walk-in</SelectItem>
                          <SelectItem value="Phone Call">Phone Call</SelectItem>
                          <SelectItem value="Website / Online Form">Website / Online Form</SelectItem>
                          <SelectItem value="WhatsApp / Social Media">WhatsApp / Social Media</SelectItem>
                          <SelectItem value="Travel Agent / Broker">Travel Agent / Broker</SelectItem>
                          <SelectItem value="Corporate">Corporate</SelectItem>
                          <SelectItem value="Event Planner">Event Planner</SelectItem>
                          <SelectItem value="Referral (Past Client / Staff)">Referral (Past Client / Staff)</SelectItem>
                          <SelectItem value="Other">Other (with notes field)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Salesperson field - Hidden for staff users */}
              {!isStaffUser && (
                <FormField
                  control={form.control}
                  name="salespersonId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Salesperson</FormLabel>
                      {userRole === 'admin' ? (
                        // Admin can select from dropdown
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-salesperson">
                              <SelectValue placeholder="Select salesperson" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {salespeople.length === 0 ? (
                              <SelectItem value="no-salesperson" disabled>
                                {users?.length === 0 ? 'Loading users...' : 'No salesperson or manager users available'}
                              </SelectItem>
                            ) : (
                              salespeople.map((salesperson) => {
                                const userRole = salesperson.role?.name || salesperson.role;
                                const roleDisplayName = salesperson.role?.displayName || userRole;
                                return (
                                  <SelectItem key={salesperson.id} value={salesperson.id}>
                                    {salesperson.firstName} {salesperson.lastName} ({roleDisplayName || 'No Role'})
                                  </SelectItem>
                                );
                              })
                            )}
                          </SelectContent>
                        </Select>
                      ) : (
                        // Manager/Salesperson are locked to themselves
                        <FormControl>
                          <div className="flex items-center space-x-2">
                            <Input
                              value={`${(user as any)?.firstName || ''} ${(user as any)?.lastName || ''}`.trim()}
                              readOnly
                              className="bg-muted cursor-not-allowed"
                              data-testid="input-salesperson-display"
                            />
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {userRole === 'manager' ? 'Manager' : 'Salesperson'}
                            </Badge>
                          </div>
                        </FormControl>
                      )}
                      {userRole === 'admin' ? (
                        <p className="text-sm text-muted-foreground">
                          Select a salesperson or manager to assign this enquiry
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Salesperson is auto-assigned to you based on your role
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              {/* Hidden fields for form data */}
              <FormField
                control={form.control}
                name="createdBy"
                render={({ field }) => (
                  <input type="hidden" {...field} />
                )}
              />
              <FormField
                control={form.control}
                name="assignmentStatus"
                render={({ field }) => (
                  <input type="hidden" {...field} />
                )}
              />
              <FormField
                control={form.control}
                name="assignedTo"
                render={({ field }) => (
                  <input type="hidden" {...field} />
                )}
              />

              {/* Staff user message */}
              {isStaffUser && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-blue-600">ℹ️</span>
                    <h3 className="font-semibold text-blue-900">Enquiry Assignment</h3>
                  </div>
                  <p className="text-sm text-blue-800">
                    Staff members can create enquiries but cannot assign them to salespeople. 
                    Salespeople and managers will be able to claim unassigned enquiries from the enquiry list.
                  </p>
                </div>
              )}

              {/* Session Management */}
              <div className="space-y-4">
                <EnquirySessionManagement
                  sessions={sessions}
                  setSessions={setSessions}
                  eventStartDate={watchedEventDate && watchedEventDate.length > 0 ? watchedEventDate : undefined}
                  eventEndDate={
                    resolvedEventDuration > 1 && watchedEventEndDate && watchedEventEndDate.length > 0
                      ? watchedEventEndDate
                      : undefined
                  }
                  eventDuration={resolvedEventDuration}
                  eventDates={resolvedEventDates}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Special requirements, preferences, etc." 
                        rows={3} 
                        {...field}
                        value={field.value || ""} 
                        data-testid="textarea-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            <div className="flex flex-col sm:flex-row justify-end gap-3 sm:space-x-3 pt-4 sm:pt-6 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={saveEnquiryMutation.isPending}
                data-testid="button-save-enquiry"
                className="w-full sm:w-auto"
                onClick={() => {
                  // Manually trigger form submission
                  form.handleSubmit(onSubmit)();
                }}
              >
                {saveEnquiryMutation.isPending ? "Saving..." : editingEnquiry ? "Update Enquiry" : "Save Enquiry"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
      {/* Collision Dialog for Create/Edit */}
      <Dialog open={showCollisionDialog} onOpenChange={setShowCollisionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Collision detected</DialogTitle>
            <DialogDescription>
              {collisionMessage || 'Venue collision with an existing converted/booked record. Your changes were not saved.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setShowCollisionDialog(false)}>OK</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}