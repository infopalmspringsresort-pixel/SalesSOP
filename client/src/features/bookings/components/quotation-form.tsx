import React, { useState, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Trash2, Calculator, Utensils } from "lucide-react";
import { z } from "zod";
import MenuSelectionFlow from "@/features/quotations/components/menu-selection-flow";

// Venue options with their corresponding spaces
const venueOptions = [
  { value: 'Areca I - The Banquet Hall', label: 'Areca I - The Banquet Hall', space: '15000 Sq Ft' },
  { value: 'Areca II Hall', label: 'Areca II Hall', space: '3500 Sq Ft' },
  { value: 'Oasis - The Lawn', label: 'Oasis - The Lawn', space: '23000 Sq Ft' },
  { value: 'Pool-side Lawn', label: 'Pool-side Lawn', space: '7500 Sq Ft' },
  { value: '3rd Floor Lounge', label: '3rd Floor Lounge', space: '1000 Sq Ft' },
  { value: 'Amber Restaurant', label: 'Amber Restaurant', space: '' },
  { value: 'Sway Lounge Bar', label: 'Sway Lounge Bar', space: '' },
  { value: 'Conference Hall', label: 'Conference Hall', space: '' },
];

// Room categories with groups and default occupancy
const roomCategories = [
  { value: 'Standard Room', label: 'Standard Room', group: 'A', defaultOccupancy: 'Double', availableRooms: 9 },
  { value: 'Deluxe Room', label: 'Deluxe Room', group: 'A', defaultOccupancy: 'Double', availableRooms: 22 },
  { value: 'Executive Room', label: 'Executive Room', group: 'A', defaultOccupancy: 'Double', availableRooms: 35 },
  { value: 'Junior Suite', label: 'Junior Suite', group: 'B', defaultOccupancy: 'Double', availableRooms: 2 },
  { value: 'Executive Suite', label: 'Executive Suite', group: 'B', defaultOccupancy: 'Double', availableRooms: 2 },
  { value: 'Family Room', label: 'Family Room', group: 'F', defaultOccupancy: 'Quadruple', availableRooms: 2 },
  { value: 'Extra Person', label: 'Extra Person', group: 'C', defaultOccupancy: 'Single', availableRooms: null },
  { value: 'Mix Rooms', label: 'Mix Rooms', group: 'D', defaultOccupancy: 'Double', availableRooms: 64 },
  { value: 'Mix Suite Rooms', label: 'Mix Suite Rooms', group: 'E', defaultOccupancy: 'Double', availableRooms: 4 },
];

// Venue session schema with detailed validation
const venueSessionSchema = z.object({
  eventDate: z.string().min(1, "Event date is required").refine(
    (date) => {
      const eventDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return eventDate >= today;
    },
    { message: "Event date cannot be in the past" }
  ),
  venue: z.string().min(1, "Venue name is required"),
  venueSpace: z.string().min(1, "Venue space is required"),
  session: z.string().min(1, "Session name is required"),
  sessionRate: z.union([z.number(), z.string()]).refine(
    (value) => {
      const num = typeof value === 'string' ? parseFloat(value) : value;
      return !isNaN(num) && num >= 0;
    },
    { message: "Session rate must be a valid number (0 or greater)" }
  ),
});

// Room package schema with detailed validation
const roomPackageSchema = z.object({
  category: z.string().min(1, "Room category is required"),
  occupancyType: z.string().default('Single'),
  rate: z.union([z.number(), z.string()]).refine(
    (value) => {
      const num = typeof value === 'string' ? parseFloat(value) : value;
      return !isNaN(num) && num >= 0;
    },
    { message: "Room rate must be a valid number (0 or greater)" }
  ),
  requestedRooms: z.union([z.number(), z.string()]).refine(
    (value) => {
      const num = typeof value === 'string' ? parseInt(value) : value;
      return !isNaN(num) && num >= 1;
    },
    { message: "Requested rooms must be at least 1" }
  ),
  totalOccupancy: z.union([z.number(), z.string()]).refine(
    (value) => {
      const num = typeof value === 'string' ? parseInt(value) : value;
      return !isNaN(num) && num >= 1;
    },
    { message: "Total occupancy must be at least 1" }
  ),
  amount: z.number().min(0, "Amount must be 0 or greater"),
});

// Main quotation form schema with comprehensive validation
const quotationFormSchema = z.object({
  quotationType: z.enum(['with_food', 'without_food']),
  venueSessions: z.array(venueSessionSchema).min(1, "At least one venue session is required"),
  roomPackages: z.array(roomPackageSchema).min(1, "At least one room package is required"),
  specialInstructions: z.string().optional(),
  checkInTime: z.string().refine(
    (time) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time),
    { message: "Check-in time must be in HH:MM format (24-hour)" }
  ),
  checkOutTime: z.string().refine(
    (time) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time),
    { message: "Check-out time must be in HH:MM format (24-hour)" }
  ),
  gstPercent: z.number().min(0, "GST percentage must be 0 or greater").max(100, "GST percentage cannot exceed 100%"),
  terms: z.string().optional(),
  validUntil: z.string().optional().refine(
    (date) => {
      if (!date) return true; // Optional field
      const validDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return validDate >= today;
    },
    { message: "Valid until date cannot be in the past" }
  ),
});

interface QuotationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enquiryId: string;
  quotationType: 'with_food' | 'without_food';
  clientName: string;
}

export default function QuotationForm({ 
  open, 
  onOpenChange, 
  enquiryId, 
  quotationType, 
  clientName 
}: QuotationFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showMenuSelection, setShowMenuSelection] = useState(false);
  const [selectedMenuPackage, setSelectedMenuPackage] = useState<string>('');
  const [customMenuItems, setCustomMenuItems] = useState<any>({});

  // Fetch enquiry details to get eventDate and eventType
  const { data: enquiry } = useQuery<any>({
    queryKey: [`/api/enquiries/${enquiryId}`],
    enabled: open && !!enquiryId,
  });

  const form = useForm<z.infer<typeof quotationFormSchema>>({
    resolver: zodResolver(quotationFormSchema),
    defaultValues: {
      quotationType,
      venueSessions: [{ eventDate: '', venue: '', venueSpace: '', session: '', sessionRate: '' }],
      roomPackages: [{ category: '', occupancyType: 'Single', rate: '', requestedRooms: '', totalOccupancy: '', amount: 0 }],
      specialInstructions: '',
      checkInTime: '14:00',
      checkOutTime: '11:00',
      gstPercent: 18,
      terms: `Terms & Conditions
🔸Taxes extra As per Govt Norms
🔸Payment 100% Advance: 25% at the time of booking confirmation & 75% fifteen days prior to the function date.
🔸Music is allowed till 10:00 PM. However, the sound limit should be confined to Government Regulations
🔸Mandatory Permissions/Licenses to be obtained by guests like PPL / Music / Liquor licenses should be submitted prior to the event.
🔸Provide GSTIN prior to the event only.
🔸Choices of banquet halls are subject to availability. Management reserves the right to change the banquet hall.
🔸Any other space required such as a store/venue for any function will be extra chargeable
🔸The hotel will only provide electricity supply for rooms, for the banquet supporting basic lighting, AC in the banquet & for basic lighting on the lawn. If any additional power supply is required, the power supply needs to be procured by the guest from our vendor at an additional cost.
🔸Décor is not a part of the above package. For décor requirements, we have impaneled vendor whom you can reach out to for your requirements.
🔸Basic banquet chairs with covers will be provided by the hotel. Any specially decorated chairs/tables/covers need to be procured from our décorator.
🔸Fire Crackers/ Paper Blasts are not allowed within the premises of the hotel
🔸Any damage due to non-adherence to the hotel surface, hotel décor, hotel rooms, and linen will be billed by the hotel as deemed fit to compensate for the loss or damage to the property
🔸No external vendor in case of an event/hospitality team from the guest side will be allowed to display their branding in any form. Any damage by external vendors would be the responsibility of the main guest.`,
      validUntil: '',
    },
  });

  const { fields: venueFields, append: appendVenue, remove: removeVenue } = useFieldArray({
    control: form.control,
    name: "venueSessions",
  });

  const { fields: roomFields, append: appendRoom, remove: removeRoom } = useFieldArray({
    control: form.control,
    name: "roomPackages",
  });

  // Ensure at least one venue and room exists
  React.useEffect(() => {
    if (venueFields.length === 0) {
      appendVenue({ eventDate: '', venue: '', venueSpace: '', session: '', sessionRate: '' });
    }
    if (roomFields.length === 0) {
      appendRoom({ category: '', occupancyType: 'Double', rate: '', requestedRooms: '', totalOccupancy: '', amount: 0 });
    }
  }, [venueFields.length, roomFields.length, appendVenue, appendRoom]);

  // Calculate room amount when inputs change (base amount without GST)
  const calculateRoomAmount = (index: number, rate?: number, rooms?: number) => {
    const rateValue = rate || 0;
    const roomsValue = rooms || 0;
    const baseAmount = rateValue * roomsValue;
    form.setValue(`roomPackages.${index}.amount`, baseAmount);
    return baseAmount;
  };

  // Handle venue selection and auto-fill venue space
  const handleVenueChange = (venueIndex: number, selectedVenue: string) => {
    const venueOption = venueOptions.find(option => option.value === selectedVenue);
    if (venueOption) {
      form.setValue(`venueSessions.${venueIndex}.venue`, selectedVenue);
      form.setValue(`venueSessions.${venueIndex}.venueSpace`, venueOption.space);
    }
  };

  // Get available room categories based on selection rules
  const getAvailableRoomCategories = (currentIndex: number) => {
    const roomPackages = form.watch('roomPackages') || [];
    
    // Safety check - if no rooms exist, return all categories
    if (!roomPackages || roomPackages.length === 0) {
      return roomCategories;
    }
    
    const selectedCategories = roomPackages
      .map((room, index) => index !== currentIndex ? room?.category : null)
      .filter(Boolean)
      .filter(cat => cat && cat.trim() !== '');

    return roomCategories.filter(category => {
      // If this category is already selected elsewhere, hide it
      if (selectedCategories.includes(category.value)) {
        return false;
      }

      // Check group conflicts only if we have selected categories
      if (selectedCategories.length === 0) {
        return true;
      }

      const hasGroupA = selectedCategories.some(selected => 
        roomCategories.find(cat => cat.value === selected)?.group === 'A'
      );
      const hasGroupB = selectedCategories.some(selected => 
        roomCategories.find(cat => cat.value === selected)?.group === 'B'
      );
      const hasGroupD = selectedCategories.some(selected => 
        roomCategories.find(cat => cat.value === selected)?.group === 'D'
      );
      const hasGroupE = selectedCategories.some(selected => 
        roomCategories.find(cat => cat.value === selected)?.group === 'E'
      );

      // Group A and D conflict (hide each other)
      if (category.group === 'A' && hasGroupD) return false;
      if (category.group === 'D' && hasGroupA) return false;

      // Group B and E conflict (hide each other)
      if (category.group === 'B' && hasGroupE) return false;
      if (category.group === 'E' && hasGroupB) return false;

      return true;
    });
  };

  // Handle room category selection with defaults
  const handleRoomCategoryChange = (roomIndex: number, selectedCategory: string) => {
    const categoryData = roomCategories.find(cat => cat.value === selectedCategory);
    if (categoryData) {
      // Set default occupancy
      form.setValue(`roomPackages.${roomIndex}.occupancyType`, categoryData.defaultOccupancy);
      
      // Set default requested rooms to available rooms (if available)
      if (categoryData.availableRooms !== null) {
        form.setValue(`roomPackages.${roomIndex}.requestedRooms`, String(categoryData.availableRooms));
      }
      
      // Calculate occupancy
      calculateOccupancy(roomIndex, categoryData.defaultOccupancy);
    }
  };

  // Calculate total occupancy based on occupancy type
  const calculateOccupancy = (roomIndex: number, occupancyType: string) => {
    const requestedRooms = parseFloat(String(form.getValues(`roomPackages.${roomIndex}.requestedRooms`) || 0));
    const selectedCategory = form.getValues(`roomPackages.${roomIndex}.category`);
    let multiplier = 1;
    
    // Special calculation for Extra Person - always 1x requested rooms
    if (selectedCategory === 'Extra Person') {
      multiplier = 1;
    } else {
      // Standard calculation for all other room types including Family Room
      switch (occupancyType) {
        case 'Single':
          multiplier = 1;
          break;
        case 'Double':
          multiplier = 2;
          break;
        case 'Triple':
          multiplier = 3;
          break;
        case 'Quadruple':
          multiplier = 4;
          break;
      }
    }
    
    const totalOccupancy = requestedRooms * multiplier;
    form.setValue(`roomPackages.${roomIndex}.totalOccupancy`, String(totalOccupancy));
    form.setValue(`roomPackages.${roomIndex}.occupancyType`, occupancyType);
  };

  // Optimize calculations with useMemo to prevent unnecessary re-renders
  const venueSessions = form.watch('venueSessions');
  const roomPackages = form.watch('roomPackages');
  
  const totals = useMemo(() => {
    const venues = venueSessions || [];
    const rooms = roomPackages || [];

    // Calculate venue subtotal (no GST)
    let venueSubtotal = 0;
    venues.forEach(session => {
      const rate = Number(session.sessionRate) || 0;
      venueSubtotal += rate;
    });
    
    // Calculate room subtotal (no GST) 
    let roomSubtotal = 0;
    rooms.forEach(room => {
      const rate = Number(room.rate) || 0;
      const roomCount = Number(room.requestedRooms) || 0;
      roomSubtotal += (rate * roomCount);
    });
    
    // Apply GST
    const venueGstAmount = Math.round((venueSubtotal * 18) / 100 * 100) / 100;
    const roomGstAmount = Math.round((roomSubtotal * 12) / 100 * 100) / 100;
    const totalGstAmount = venueGstAmount + roomGstAmount;
    
    // Calculate final totals
    const venueTotal = venueSubtotal + venueGstAmount;
    const roomTotal = roomSubtotal + roomGstAmount;
    const finalAmount = venueTotal + roomTotal;

    return { 
      venueSubtotal: Math.round(venueSubtotal * 100) / 100, 
      roomSubtotal: Math.round(roomSubtotal * 100) / 100, 
      venueGstAmount, 
      roomGstAmount, 
      totalGstAmount,
      venueTotal: Math.round(venueTotal * 100) / 100, 
      roomTotal: Math.round(roomTotal * 100) / 100, 
      finalAmount: Math.round(finalAmount * 100) / 100
    };
  }, [venueSessions, roomPackages]);

  const createQuotationMutation = useMutation({
    mutationFn: async (data: z.infer<typeof quotationFormSchema>) => {
      // Validate that we have valid totals before proceeding
      if (!totals || isNaN(totals.finalAmount) || totals.finalAmount < 0) {
        throw new Error("Invalid quotation totals. Please check all rates and quantities.");
      }

      // Get user ID for createdBy
      const userId = user ? (String((user as any)?.id || (user as any)?._id || '')) : '';
      if (!userId) {
        throw new Error("User authentication required. Please log in again.");
      }

      // Extract eventDate from first venue session
      const firstEventDate = data.venueSessions && data.venueSessions.length > 0 && data.venueSessions[0].eventDate
        ? data.venueSessions[0].eventDate
        : (enquiry?.eventDate ? new Date(enquiry.eventDate).toISOString().split('T')[0] : '');

      if (!firstEventDate) {
        throw new Error("Event date is required. Please add at least one venue session with an event date.");
      }

      // Handle validUntil - provide default (30 days from now) if not provided
      let validUntilDate: string | null = null;
      if (data.validUntil && data.validUntil.trim() !== '') {
        validUntilDate = new Date(data.validUntil).toISOString();
      } else {
        // Default to 30 days from now if not provided
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 30);
        validUntilDate = defaultDate.toISOString();
      }

      const { venueSubtotal, roomSubtotal, venueGstAmount, roomGstAmount, venueTotal, roomTotal, finalAmount } = totals;
      
      // Create quotation data that matches the current database schema exactly
      const quotationData = {
        enquiryId,
        eventDate: firstEventDate,
        eventType: enquiry?.eventType || 'wedding',
        clientName: clientName || enquiry?.clientName || '',
        clientEmail: enquiry?.email || '',
        clientPhone: enquiry?.contactNumber || '',
        createdBy: userId,
        totalAmount: finalAmount.toString(),
        discountPercent: '0',
        discountAmount: '0',
        finalAmount: finalAmount.toString(),
        validUntil: validUntilDate,
        terms: `BANQUET PROPOSAL - ${data.quotationType.replace('_', ' ').toUpperCase()}

CLIENT: ${clientName}

VENUE RENTAL PACKAGE:
${data.venueSessions.map(session => 
  `${session.eventDate || 'TBD'} - ${session.venue} (${session.venueSpace}) - ${session.session}: ₹${session.sessionRate?.toLocaleString() || 0}`
).join('\n')}
Venue Total: ₹${venueTotal.toLocaleString()}

ROOM QUOTATION:
${data.roomPackages.map(room => 
  `${room.category}: ₹${room.rate?.toLocaleString() || 0} x ${room.requestedRooms || 0} rooms (${room.totalOccupancy || 0} occupancy) = ₹${room.amount?.toLocaleString() || 0}`
).join('\n')}
Room Subtotal: ₹${totals.roomSubtotal.toLocaleString()}
Room GST (12%): ₹${totals.roomGstAmount.toLocaleString()}
Room Total: ₹${totals.roomTotal.toLocaleString()}

${quotationType === 'with_food' && selectedMenuPackage ? `
FOOD PACKAGE:
${Object.entries(customMenuItems).map(([packageId, customData]: [string, any]) => {
  const selectedItems = customData?.selectedItems || [];
      return `Selected Package: ${packageId}
Included Items: ${selectedItems.length}
Total Food Items: ${selectedItems.length}`;
}).join('\n')}
` : ''}

SUMMARY:
Venue Total (incl. 18% GST): ₹${totals.venueTotal.toLocaleString()}
Room Total (incl. 12% GST): ₹${totals.roomTotal.toLocaleString()}
${quotationType === 'with_food' && selectedMenuPackage ? 'Food Package: Included' : ''}
Grand Total: ₹${totals.finalAmount.toLocaleString()}

SPECIAL INSTRUCTIONS:
${data.specialInstructions || 'None'}

CHECK-IN/OUT:
Check-in: ${data.checkInTime}
Check-out: ${data.checkOutTime}

${data.terms}`,
      };

      return await apiRequest('POST', '/api/quotations', quotationData);
    },
    onSuccess: () => {
      toast({
        title: "Quotation Created",
        description: `${quotationType.replace('_', ' ')} quotation has been created successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/quotations'] });
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create quotation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof quotationFormSchema>) => {
    createQuotationMutation.mutate(data);
  };

  const { venueSubtotal, roomSubtotal, venueGstAmount, roomGstAmount, venueTotal, roomTotal, finalAmount } = totals;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Banquet Proposal - {quotationType.replace('_', ' ').toUpperCase()}
            </DialogTitle>
            <DialogDescription>
              Create detailed quotation for {clientName}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Venue Rental Package */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Venue Rental Package
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendVenue({ eventDate: '', venue: '', venueSpace: '', session: '', sessionRate: '' })}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Session
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-6 gap-2 text-sm font-medium text-muted-foreground">
                    <div>Event Date</div>
                    <div>Venue</div>
                    <div>Venue Space</div>
                    <div>Session</div>
                    <div>Session Rate</div>
                    <div>Actions</div>
                  </div>
                  
                  {venueFields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-6 gap-2 items-end">
                      <FormField
                        control={form.control}
                        name={`venueSessions.${index}.eventDate`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input type="date" min={new Date().toISOString().split('T')[0]} {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`venueSessions.${index}.venue`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Select onValueChange={(value) => handleVenueChange(index, value)} value={field.value || ""} key={`venue-${index}-${field.value || 'empty'}`}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select venue" />
                                </SelectTrigger>
                                <SelectContent>
                                  {venueOptions.map((venue) => (
                                    <SelectItem key={venue.value} value={venue.value}>
                                      {venue.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`venueSessions.${index}.venueSpace`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input placeholder="15000 Sq. ft." {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`venueSessions.${index}.session`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Select onValueChange={field.onChange} value={field.value || ""} key={`session-${index}-${field.value || 'empty'}`}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select session" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Morning">Morning</SelectItem>
                                  <SelectItem value="Lunch">Lunch</SelectItem>
                                  <SelectItem value="Hi-Tea">Hi-Tea</SelectItem>
                                  <SelectItem value="Evening">Evening</SelectItem>
                                  <SelectItem value="Dinner">Dinner</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`venueSessions.${index}.sessionRate`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="₹200,000" 
                                {...field}
                                value={field.value || ""}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : "")}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (venueFields.length > 1) {
                            removeVenue(index);
                          }
                        }}
                        disabled={venueFields.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  
                  <div className="text-right font-semibold">
                    Grand Total: ₹{venueTotal.toLocaleString()}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Room Quotation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Room Quotation
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendRoom({ category: '', occupancyType: 'Double', rate: '', requestedRooms: '', totalOccupancy: '', amount: 0 })}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Room
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-7 gap-2 text-sm font-medium text-muted-foreground">
                    <div>Room Category</div>
                    <div>Occupancy</div>
                    <div>Room Rate</div>
                    <div>Requested Rooms</div>
                    <div>Total Occupancy</div>
                    <div>Amount</div>
                    <div>Actions</div>
                  </div>
                  
                  {roomFields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-7 gap-2 items-end">
                      <FormField
                        control={form.control}
                        name={`roomPackages.${index}.category`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Select onValueChange={(value) => {
                                field.onChange(value);
                                handleRoomCategoryChange(index, value);
                              }} value={field.value || ""} key={`room-${index}-${field.value || 'empty'}`}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                  {getAvailableRoomCategories(index).map((category) => (
                                    <SelectItem key={category.value} value={category.value}>
                                      {category.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`roomPackages.${index}.occupancyType`}
                        render={({ field }) => {
                          const selectedCategory = form.watch(`roomPackages.${index}.category`);
                          const categoryData = roomCategories.find(cat => cat.value === selectedCategory);
                          const isExtraPerson = selectedCategory === 'Extra Person';
                          const isFamilyRoom = selectedCategory === 'Family Room';
                          
                          return (
                            <FormItem>
                              <FormControl>
                                <Select 
                                  onValueChange={(value) => {
                                    field.onChange(value);
                                    calculateOccupancy(index, value);
                                  }} 
                                  value={field.value || categoryData?.defaultOccupancy || 'Double'}
                                  disabled={isExtraPerson}
                                  key={`occupancy-${index}-${selectedCategory || 'empty'}-${field.value || 'empty'}`}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select occupancy" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Single">Single</SelectItem>
                                    <SelectItem value="Double">Double</SelectItem>
                                    <SelectItem value="Triple">Triple</SelectItem>
                                    {isFamilyRoom && <SelectItem value="Quadruple">Quadruple</SelectItem>}
                                  </SelectContent>
                                </Select>
                              </FormControl>
                            </FormItem>
                          );
                        }}
                      />
                      <FormField
                        control={form.control}
                        name={`roomPackages.${index}.rate`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="₹4,500" 
                                value={field.value || ""}
                                onChange={(e) => {
                                  const rateValue = e.target.value ? parseFloat(e.target.value) : 0;
                                  field.onChange(rateValue || "");
                                  const roomsValue = parseFloat(String(form.getValues(`roomPackages.${index}.requestedRooms`) || 0));
                                  calculateRoomAmount(index, rateValue, roomsValue);
                                }}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`roomPackages.${index}.requestedRooms`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="18" 
                                {...field}
                                value={field.value || ""}
                                onChange={(e) => {
                                  const roomsValue = e.target.value ? parseInt(e.target.value) : 0;
                                  field.onChange(roomsValue || "");
                                  const rateValue = parseFloat(String(form.getValues(`roomPackages.${index}.rate`) || 0));
                                  calculateRoomAmount(index, rateValue, roomsValue);
                                  // Recalculate occupancy when requested rooms change
                                  const occupancyType = form.getValues(`roomPackages.${index}.occupancyType`) || 'Double';
                                  calculateOccupancy(index, occupancyType);
                                }}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`roomPackages.${index}.totalOccupancy`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="36" 
                                {...field}
                                value={field.value || ""}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : "")}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`roomPackages.${index}.amount`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field}
                                readOnly
                                className="bg-muted"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (roomFields.length > 1) {
                            removeRoom(index);
                          }
                        }}
                        disabled={roomFields.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  
                  <div className="text-right space-y-1">
                    <div className="text-sm">Tax 12%: ₹{roomGstAmount.toLocaleString()}</div>
                    <div className="font-semibold">Total: ₹{roomTotal.toLocaleString()}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Food Package Selection (for with_food quotations) */}
            {quotationType === 'with_food' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Utensils className="w-5 h-5" />
                    Food Package Selection
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedMenuPackage ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-green-50 rounded-lg border">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-green-800">Selected Package:</span>
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            {selectedMenuPackage}
                          </Badge>
                        </div>
                        {Object.entries(customMenuItems).map(([packageId, customData]: [string, any]) => {
                          const selectedItems = customData?.selectedItems || [];
                          return (
                            <div key={packageId} className="text-sm text-green-700">
                              <div>Included Items: {selectedItems.length}</div>
                              <div className="font-medium">Total Food Items: {selectedItems.length}</div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowMenuSelection(true)}
                        >
                          <Utensils className="w-4 h-4 mr-2" />
                          Edit Menu Selection
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setSelectedMenuPackage('');
                            setCustomMenuItems({});
                          }}
                        >
                          Clear Selection
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Utensils className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p className="text-muted-foreground mb-4">No food package selected</p>
                      <Button
                        type="button"
                        onClick={() => setShowMenuSelection(true)}
                      >
                        <Utensils className="w-4 h-4 mr-2" />
                        Select Food Package
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Special Instructions & Check-in/out Times */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Special Instructions</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="specialInstructions"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea 
                            placeholder="No Onion, Garlic, Ginger, Potato..." 
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Check-in/Check-out</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="checkInTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Check In</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="checkOutTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Check Out</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="validUntil"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valid Until</FormLabel>
                        <FormControl>
                          <Input type="date" min={new Date().toISOString().split('T')[0]} {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-right">
                  <div className="flex justify-between">
                    <span>Venue Subtotal:</span>
                    <span>₹{venueSubtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Venue GST (18%):</span>
                    <span>₹{venueGstAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Venue Total:</span>
                    <span>₹{venueTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Room Subtotal:</span>
                    <span>₹{roomSubtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Room GST (12%):</span>
                    <span>₹{roomGstAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Room Total:</span>
                    <span>₹{roomTotal.toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Grand Total:</span>
                    <span>₹{finalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Terms & Conditions */}
            <Card>
              <CardHeader>
                <CardTitle>Terms & Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="terms"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea 
                          className="min-h-[200px] font-mono text-sm"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createQuotationMutation.isPending}
                className="min-w-[120px]"
              >
                {createQuotationMutation.isPending ? "Creating..." : "Create Quotation"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    {/* Menu Selection Flow Dialog */}
    <MenuSelectionFlow
      open={showMenuSelection}
      onOpenChange={setShowMenuSelection}
      onSave={(selectedPackage, customMenuItems) => {
        setSelectedMenuPackage(selectedPackage);
        setCustomMenuItems(customMenuItems);
        setShowMenuSelection(false);
      }}
    />
    </>
  );
}