import { useState, useEffect } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { insertQuotationSchema } from "@shared/schema-client";
import { z } from "zod";
import { Plus, Trash2, Calculator, FileText, Building, Users, Calendar, Clock, Utensils, Edit, MapPin } from "lucide-react";
import type { Enquiry, Venue, Quotation, MenuPackage } from "@shared/schema-client";
import MenuItemEditor from "./menu-item-editor";
import MenuSelectionFlow from "./menu-selection-flow";
import QuotationPreviewDialog from "./quotation-preview-dialog";
import { DiscountSection } from "./discount-section";
import { sendQuotationEmail } from "@/lib/email-service";
import { type WorkingQuotationPDFData } from "@/lib/working-pdf-generator";

const formSchema = insertQuotationSchema;


interface QuotationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enquiry: Enquiry;
  editingQuotation?: Quotation | null;
}

export default function QuotationForm({ open, onOpenChange, enquiry, editingQuotation }: QuotationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMenuPackages, setSelectedMenuPackages] = useState<string[]>([]);
  const [showMenuItemEditor, setShowMenuItemEditor] = useState(false);
  const [editingMenuPackage, setEditingMenuPackage] = useState<MenuPackage | null>(null);
  const [customMenuItems, setCustomMenuItems] = useState<Record<string, any>>({});
  const [showMenuSelectionFlow, setShowMenuSelectionFlow] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [createdQuotation, setCreatedQuotation] = useState<Quotation | null>(null);
  const [gstBreakdown, setGstBreakdown] = useState<{
    venueGST: number;
    roomGST: number;
    menuGST: number;
    totalGST: number;
    baseTotal: number;
  } | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch venues, room types, and menu packages
  const { data: venues = [] } = useQuery<Venue[]>({
    queryKey: ["/api/rooms/venues"],
  });

  const { data: roomTypes = [] } = useQuery<any[]>({
    queryKey: ["/api/rooms/types"],
  });



  const { data: menuPackages = [] } = useQuery<any[]>({
    queryKey: ["/api/menus/packages"],
  });

  const { data: menuItems = [] } = useQuery<any[]>({
    queryKey: ["/api/menus/items"],
  });

  const initialDefaults = {
    enquiryId: enquiry.id!,
    quotationNumber: "",
    clientName: enquiry.clientName,
    clientEmail: enquiry.email,
    clientPhone: enquiry.contactNumber,
    eventType: enquiry.eventType || "wedding",
    eventDate: enquiry.eventDate ? new Date(enquiry.eventDate).toISOString().split('T')[0] : "",
    venueRentalItems: [] as any[],
    venueRentalTotal: 0,
    roomPackages: [] as any[],
    roomQuotationTotal: 0,
    banquetTotal: 0,
    roomTotal: 0,
    grandTotal: 0,
    discountType: undefined as any,
    discountValue: 0,
    discountAmount: 0,
    discountExceedsLimit: false,
    finalTotal: 0,
    includeGST: false,
    createdBy: "",
    status: 'draft' as const,
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialDefaults,
    shouldUnregister: true,
  });

  const { fields: venueFields, append: appendVenue, remove: removeVenue } = useFieldArray({
    control: form.control,
    name: "venueRentalItems",
  });

  const { fields: roomFields, append: appendRoom, remove: removeRoom } = useFieldArray({
    control: form.control,
    name: "roomPackages",
  });

  // Helper function to calculate GST based on item type and amount
  const calculateGST = (amount: number, itemType: 'venue' | 'room' | 'menu', roomRate?: number) => {
    if (!form.watch('includeGST')) return 0;
    
    switch (itemType) {
      case 'venue':
        return amount * 0.18; // 18% GST for venue
      case 'room':
        // 5% GST if room rate <= ₹7,500, else 18% GST
        const gstRate = (roomRate && roomRate > 7500) ? 0.18 : 0.05;
        return amount * gstRate;
      case 'menu':
        return amount * 0.18; // 18% GST for menu
      default:
        return 0;
    }
  };


  // Reset form when editingQuotation changes
  useEffect(() => {
    if (editingQuotation) {
      form.reset({
        ...editingQuotation,
      });
    } else {
      // Start with empty form - details will show only when items are selected
      form.reset({
        enquiryId: enquiry.id!,
        quotationNumber: "",
        clientName: enquiry.clientName,
        clientEmail: enquiry.email,
        clientPhone: enquiry.contactNumber,
        eventType: enquiry.eventType || "wedding",
        eventDate: enquiry.eventDate ? new Date(enquiry.eventDate).toISOString().split('T')[0] : "",
        venueRentalItems: [],
        venueRentalTotal: 0,
        roomPackages: [],
        roomQuotationTotal: 0,
        banquetTotal: 0,
        roomTotal: 0,
        grandTotal: 0,
        createdBy: "",
        status: 'draft',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      });
    }
  }, [editingQuotation, enquiry, form, venues]);

  // Reset stale state when dialog closes; reinitialize on open for new flow
  useEffect(() => {
    if (!open) {
      // Clear local UI state to avoid leakage across opens
      setSelectedMenuPackages([]);
      setCustomMenuItems({});
      setEditingMenuPackage(null);
      setShowMenuItemEditor(false);
      setShowMenuSelectionFlow(false);
      setShowPreviewDialog(false);
      setCreatedQuotation(null);
      // Reset form to fresh defaults for next open (unless editing)
      if (!editingQuotation) {
        form.reset({ ...initialDefaults, enquiryId: enquiry.id!, clientName: enquiry.clientName, clientEmail: enquiry.email, clientPhone: enquiry.contactNumber, eventType: enquiry.eventType || 'wedding', eventDate: enquiry.eventDate ? new Date(enquiry.eventDate).toISOString().split('T')[0] : '' });
      }
    }
  }, [open]);

  // Calculate totals whenever form values change - use useWatch for reactive updates
  const venueRentalItems = useWatch({ control: form.control, name: 'venueRentalItems' });
  const roomPackages = useWatch({ control: form.control, name: 'roomPackages' });
  const includeGST = useWatch({ control: form.control, name: 'includeGST' });
  
  useEffect(() => {
    // Calculate venue total with GST
    const venueBaseTotal = venueRentalItems?.reduce((sum, item) => {
      return sum + (item.sessionRate || 0);
    }, 0) || 0;
    const venueGST = calculateGST(venueBaseTotal, 'venue');
    const venueTotal = venueBaseTotal + venueGST;
    
    // Calculate room total with GST
    const roomBaseTotal = roomPackages?.reduce((sum, item) => {
      const rate = item.rate || 0;
      const numberOfRooms = item.numberOfRooms || 1;
      return sum + (rate * numberOfRooms);
    }, 0) || 0;
    const roomGST = roomPackages?.reduce((sum, item) => {
      const rate = item.rate || 0;
      const numberOfRooms = item.numberOfRooms || 1;
      const itemTotal = rate * numberOfRooms;
      return sum + calculateGST(itemTotal, 'room', rate);
    }, 0) || 0;
    const roomQuotationTotal = roomBaseTotal + roomGST;
    // Calculate menu total from selected packages including additional items
    const menuBaseTotal = selectedMenuPackages.reduce((sum, packageId) => {
      const selectedPackage = menuPackages.find(pkg => pkg.id === packageId);
      if (selectedPackage) {
        const customData = customMenuItems[packageId];
        
        // Use package price as base (not sum of individual items)
        const packagePrice = selectedPackage.price;
        
        // Calculate additional prices from custom items (additional items only, not package items)
        const additionalItemsTotal = customData?.selectedItems?.reduce((itemSum: number, item: any) => {
          // Only add price for additional items (not package items)
          return itemSum + (!item.isPackageItem ? (item.additionalPrice || 0) : 0);
        }, 0) || 0;
        
        // Package price + additional items
        const totalBeforeGst = packagePrice + additionalItemsTotal;
        return sum + totalBeforeGst;
      }
      return sum;
    }, 0);
    const menuGST = calculateGST(menuBaseTotal, 'menu');
    const menuTotal = menuBaseTotal + menuGST;
    const banquetTotal = venueTotal; // Use venue total for banquet total
    const roomTotal = roomQuotationTotal; // Same as room quotation total
    const grandTotal = venueTotal + roomQuotationTotal + menuTotal; // Don't double-count venue total
    
    // Store individual GST amounts for display
    const totalGST = venueGST + roomGST + menuGST;
    const baseTotal = venueBaseTotal + roomBaseTotal + menuBaseTotal;
    
    form.setValue('venueRentalTotal', venueTotal, { shouldValidate: false, shouldDirty: false });
    form.setValue('roomQuotationTotal', roomQuotationTotal, { shouldValidate: false, shouldDirty: false });
    form.setValue('roomTotal', roomTotal, { shouldValidate: false, shouldDirty: false });
    form.setValue('menuTotal', menuTotal, { shouldValidate: false, shouldDirty: false });
    form.setValue('banquetTotal', banquetTotal, { shouldValidate: false, shouldDirty: false });
    form.setValue('grandTotal', grandTotal, { shouldValidate: false, shouldDirty: false });
    
    // Store GST breakdown for display
    setGstBreakdown(includeGST ? {
      venueGST,
      roomGST,
      menuGST,
      totalGST,
      baseTotal,
    } : null);
  }, [venueRentalItems, roomPackages, includeGST, selectedMenuPackages, menuPackages, customMenuItems, form]);

  const createQuotationMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      console.log('🚀 Making POST request to /api/quotations');
      console.log('🚀 Request data:', data);
      const response = await apiRequest("POST", "/api/quotations", data);
      console.log('🚀 Response status:', response.status);
      if (!response.ok) {
        const error = await response.json();
        console.log('❌ Error response:', error);
        throw new Error(error.message || "Failed to create quotation");
      }
      const result = await response.json();
      console.log('✅ Success response:', result);
      return result;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
      toast({ title: "Success", description: "Quotation created successfully" });
      
      // Store the created quotation and show preview
      setCreatedQuotation(response);
      setShowPreviewDialog(true);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create quotation", 
        variant: "destructive" 
      });
    },
  });

  const updateQuotationMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const response = await apiRequest("PATCH", `/api/quotations/${editingQuotation!.id}`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update quotation");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
      toast({ title: "Success", description: "Quotation updated successfully" });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update quotation", 
        variant: "destructive" 
      });
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    console.log('🚀 Form onSubmit called');
    setIsSubmitting(true);
    try {
      // Prepare menu packages data
      console.log('🔍 customMenuItems:', customMenuItems);
      console.log('🔍 selectedMenuPackages:', selectedMenuPackages);
      
      const menuPackagesData = selectedMenuPackages.map(packageId => {
        const selectedPackage = menuPackages.find(pkg => pkg.id === packageId);
        const customData = customMenuItems[packageId];
        
        console.log(`🔍 Package ${packageId} customData:`, customData);
        
        const result = {
          id: selectedPackage?.id,
          name: selectedPackage?.name,
          type: selectedPackage?.type || 'non-veg',
          price: selectedPackage?.price || 0,
          gst: selectedPackage?.gst || 18,
          selectedItems: customData?.selectedItems || [],
          customItems: customData?.customItems || [],
          totalPackageItems: customData?.totalPackageItems || 0,
          excludedItemCount: customData?.excludedItemCount || 0,
          totalDeduction: customData?.totalDeduction || 0
        };
        
        return result;
      });
      
      console.log('🔍 menuPackagesData:', menuPackagesData);

      // Recalculate totals to ensure they're correct
      const venueTotal = data.venueRentalItems?.reduce((sum, item) => {
        return sum + (item.sessionRate || 0);
      }, 0) || 0;
      
      const roomQuotationTotal = data.roomPackages?.reduce((sum, item) => {
        const rate = item.rate || 0;
        const numberOfRooms = item.numberOfRooms || 1;
        return sum + (rate * numberOfRooms);
      }, 0) || 0;
      
      const menuTotal = menuPackagesData.reduce((sum, pkg) => {
        // Calculate selected package items price (using actual item prices)
        const selectedPackageItemsPrice = pkg.selectedItems?.reduce((itemSum: number, item: any) => {
          return itemSum + (item.isPackageItem ? (item.price || 0) : 0);
        }, 0) || pkg.price;
        
        // Calculate additional prices from selected items (additional items only, not package items)
        const additionalItemsTotal = pkg.selectedItems?.reduce((itemSum: number, item: any) => {
          // Only add price for additional items (not package items)
          return itemSum + (!item.isPackageItem ? (item.additionalPrice || 0) : 0);
        }, 0) || 0;
        
        // Selected items price + additional items (without GST - GST will be added later in final quote)
        const totalPrice = selectedPackageItemsPrice + additionalItemsTotal;
        return sum + totalPrice;
      }, 0);
      
      const grandTotal = venueTotal + roomQuotationTotal + menuTotal;

      const formData = {
        ...data,
        menuPackages: menuPackagesData,
        venueRentalTotal: venueTotal,
        roomQuotationTotal: roomQuotationTotal,
        roomTotal: roomQuotationTotal,
        menuTotal: menuTotal,
        grandTotal: grandTotal,
        createdBy: (user as any)?.id || (user as any)?._id || '',
      };
      
      console.log('🔍 Form data being submitted:', JSON.stringify(formData, null, 2));
      console.log('🔍 Discount fields in form data:', {
        discountType: formData.discountType,
        discountValue: formData.discountValue,
        discountAmount: formData.discountAmount,
        discountReason: formData.discountReason,
        discountExceedsLimit: formData.discountExceedsLimit,
        finalTotal: formData.finalTotal
      });
      
      if (editingQuotation) {
        await updateQuotationMutation.mutateAsync(formData);
      } else {
        await createQuotationMutation.mutateAsync(formData);
      }
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addVenueItem = () => {
    appendVenue({
      eventDate: form.getValues('eventDate') || new Date().toISOString().split('T')[0],
      venue: "",
      venueSpace: "",
      session: "All",
      sessionRate: 0,
    });
  };

  const addRoomItem = () => {
    appendRoom({
      category: "",
      rate: 0,
      numberOfRooms: null,
    });
  };

  // Menu package selection handlers
  const handleMenuPackageSelect = (packageId: string) => {
    setSelectedMenuPackages(prev => 
      prev.includes(packageId) 
        ? prev.filter(id => id !== packageId)
        : [...prev, packageId]
    );
  };

  const handleEditMenuItems = (menuPackage: MenuPackage) => {
    setEditingMenuPackage(menuPackage);
    setShowMenuItemEditor(true);
  };

  const handleMenuItemsSave = (selectedItems: any[]) => {
    console.log('🔍 handleMenuItemsSave called with:', { selectedItems, editingMenuPackage });
    if (editingMenuPackage) {
      // Store the custom menu items for this package
      const newCustomMenuItems = {
        ...customMenuItems,
        [editingMenuPackage.id!]: {
          selectedItems,
          packageId: editingMenuPackage.id
        }
      };
      setCustomMenuItems(newCustomMenuItems);
    }
    setShowMenuItemEditor(false);
    setEditingMenuPackage(null);
  };

  const handleMenuSelectionSave = (selectedPackage: string, customMenuItems: any) => {
    console.log('🔍 handleMenuSelectionSave called with:', { selectedPackage, customMenuItems });
    setSelectedMenuPackages([selectedPackage]);
    setCustomMenuItems({ [selectedPackage]: customMenuItems });
    setShowMenuSelectionFlow(false);
  };

  const handleSendEmail = async (quotation: Quotation) => {
    try {
      // Convert quotation to PDF data format
      const pdfData: WorkingQuotationPDFData = {
        quotationNumber: quotation.quotationNumber,
        quotationDate: new Date(quotation.createdAt).toLocaleDateString(),
        clientName: quotation.clientName,
        clientEmail: quotation.clientEmail,
        clientPhone: quotation.clientPhone,
        expectedGuests: quotation.expectedGuests || 0,
        
        venueRentalItems: (quotation.venueRentalItems || []) as any[],
        roomPackages: (quotation.roomPackages || []) as any[],
        menuPackages: (quotation.menuPackages || []) as any[],
        
        venueRentalTotal: quotation.venueRentalTotal || 0,
        roomTotal: quotation.roomTotal || 0,
        menuTotal: quotation.menuTotal || 0,
        banquetTotal: quotation.banquetTotal || 0,
        grandTotal: quotation.grandTotal || 0,
        
        // GST and discount information
        includeGST: quotation.includeGST || false,
        discountType: quotation.discountType,
        discountValue: quotation.discountValue,
        discountAmount: quotation.discountAmount,
        finalTotal: quotation.finalTotal,
        
        termsAndConditions: quotation.termsAndConditions || [],
      };

      const result = await sendQuotationEmail({
        quotationId: quotation.id!,
        recipientEmail: quotation.clientEmail,
        subject: `Quotation ${quotation.quotationNumber}`,
        pdfData,
      });

      if (result.success) {
        toast({
          title: "Email Sent",
          description: "Quotation has been sent to the customer's email.",
        });
        
        // Update quotation status to 'sent'
        await apiRequest(`/api/quotations/${quotation.id}/send`, 'POST');
        
        queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
        setShowPreviewDialog(false);
        onOpenChange(false);
      } else {
        throw new Error(result.error || 'Failed to send email');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send email. Please try again.",
        variant: "destructive",
      });
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {editingQuotation ? "Edit Quotation" : "Create New Quotation"}
            </DialogTitle>
          </div>
        </DialogHeader>

        <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
          console.log('❌ Form validation errors:', errors);
        })} className="space-y-6">
            {/* Client Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Client Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="clientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Name *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="clientEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="clientPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Phone</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                      <FormLabel>Event Type *</FormLabel>
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
              </CardContent>
            </Card>

            {/* Menu Package Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Utensils className="w-4 h-4" />
                  Menu Package Selection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Utensils className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium mb-2">Configure Menu Package</h3>
                  <p className="text-muted-foreground mb-4">
                    Select a menu package and customize items for this quotation
                  </p>
                  <Button
                    type="button"
                    onClick={() => setShowMenuSelectionFlow(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Utensils className="w-4 h-4 mr-2" />
                    Configure Menu Package
                  </Button>
                </div>
                
                {/* Selected Menu Package Summary */}
                {selectedMenuPackages.length > 0 && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-300">
                    <h4 className="font-medium text-green-800 mb-3">
                      📋 Menu Package Configuration (Locked)
                    </h4>
                    {selectedMenuPackages.map(packageId => {
                      const selectedPackage = menuPackages.find(pkg => pkg.id === packageId);
                      const customData = customMenuItems[packageId];
                      
                      if (!selectedPackage) return null;
                      
                      // Calculate deduction for excluded items (using actual item prices)
                      const totalPackageItems = customData?.totalPackageItems || 0;
                      const excludedItemCount = customData?.excludedItemCount || 0;
                      const totalDeduction = customData?.totalDeduction || 0; // Actual price of excluded items
                      
                      // Calculate selected package items price
                      const selectedPackageItemsPrice = customData?.selectedItems?.reduce((sum: number, item: any) => {
                        return sum + (item.isPackageItem ? (item.price || 0) : 0);
                      }, 0) || selectedPackage.price;
                      
                      // Calculate additional price from custom items (additional items only)
                      const additionalPrice = customData?.selectedItems?.reduce((sum: number, item: any) => {
                        // Only add price for additional items (not package items)
                        return sum + (!item.isPackageItem ? (item.additionalPrice || 0) : 0);
                      }, 0) || 0;
                      
                      // Selected items price + additional items (without GST - GST will be added in final quote)
                      const totalPrice = selectedPackageItemsPrice + additionalPrice;
                      
                      const packageItemsCount = customData?.selectedItems?.filter((item: any) => item.isPackageItem).length || 0;
                      const additionalItemsCount = customData?.selectedItems?.filter((item: any) => !item.isPackageItem).length || 0;
                      
                      return (
                        <div key={packageId} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-green-800">{selectedPackage.name}</span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${selectedPackage.type === 'veg' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                              <span className={`inline-flex items-center justify-center w-3.5 h-3.5 ${selectedPackage.type === 'veg' ? 'border-green-700' : 'border-red-700'} border rounded-sm`}>
                                <span className={`${selectedPackage.type === 'veg' ? 'bg-green-700' : 'bg-red-700'} w-1.5 h-1.5 rounded-full`} />
                              </span>
                              {selectedPackage.type === 'veg' ? 'Veg' : 'Non-Veg'}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-green-700">Base Price:</span>
                              <span className="ml-2 font-medium">₹{selectedPackage.price}</span>
                            </div>
                            {totalDeduction > 0 && (
                              <div>
                                <span className="text-red-700">Excluded Items:</span>
                                <span className="ml-2 font-medium text-red-600">-₹{Math.round(totalDeduction)} ({excludedItemCount})</span>
                              </div>
                            )}
                            {additionalPrice > 0 && (
                              <div>
                                <span className="text-green-700">Additional Items:</span>
                                <span className="ml-2 font-medium text-green-600">+₹{additionalPrice} ({additionalItemsCount})</span>
                              </div>
                            )}
                            <div>
                              <span className="text-green-700">Package Items:</span>
                              <span className="ml-2 font-medium">{packageItemsCount} items</span>
                            </div>
                            <div>
                              <span className="text-green-700">Total:</span>
                              <span className="ml-2 font-bold text-green-800">₹{totalPrice}</span>
                            </div>
                          </div>
                          
                          {customData && (
                            <div className="mt-2 p-2 bg-white rounded border border-green-200">
                              <p className="text-xs text-green-700">
                                ✓ Configuration locked for this quotation
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                * Customizations are specific to this quotation
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Venue Rental Package */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    Venue Rental Package
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button type="button" onClick={addVenueItem} size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Venue
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {venueFields.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p>No venues added yet. Click "Add Venue" to start.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {venueFields.map((field, index) => (
                      <Card key={field.id} className="border-dashed">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-medium">Venue {index + 1}</h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeVenue(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <FormField
                              control={form.control}
                              name={`venueRentalItems.${index}.venue`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Venue *</FormLabel>
                                  <Select 
                                    onValueChange={(value) => {
                                      field.onChange(value);
                                      // Auto-fill venue space and rate when venue is selected
                                      const selectedVenue = venues.find(v => v.name === value);
                                      if (selectedVenue) {
                                        form.setValue(`venueRentalItems.${index}.venueSpace`, `${selectedVenue.area.toLocaleString()} Sq. ft.`);
                                        form.setValue(`venueRentalItems.${index}.sessionRate`, selectedVenue.hiringCharges);
                                      }
                                    }} 
                                    value={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select venue" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {venues.length === 0 ? (
                                        <div className="p-2 text-sm text-muted-foreground">
                                          No venues available. Please add venues first.
                                        </div>
                                      ) : (
                                        venues
                                          .filter((venue) => !!venue?.name)
                                          .map((venue) => (
                                            <SelectItem key={venue.id} value={venue.name}>
                                              {venue.name} - ₹{venue.hiringCharges.toLocaleString()} 
                                              ({venue.area.toLocaleString()} sq ft)
                                            </SelectItem>
                                          ))
                                      )}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`venueRentalItems.${index}.venueSpace`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Venue Space</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g., 15000 Sq. ft." {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`venueRentalItems.${index}.session`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Session</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="All">All</SelectItem>
                                      <SelectItem value="Morning">Morning</SelectItem>
                                      <SelectItem value="Evening">Evening</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`venueRentalItems.${index}.sessionRate`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Session Rate (₹) *</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      value={field.value || ""}
                                      onChange={(e) => {
                                        const value = e.target.value ? Number(e.target.value) : 0;
                                        field.onChange(value);
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          {/* Venue Details Info */}
                          {form.watch(`venueRentalItems.${index}.venue`) && (
                            <div className="mt-3 p-3 bg-green-50 rounded-lg">
                              {(() => {
                                const selectedVenue = venues.find(v => v.name === form.watch(`venueRentalItems.${index}.venue`));
                                return selectedVenue ? (
                                  <div className="text-sm">
                                    <div className="flex items-center gap-2 mb-2">
                                      <MapPin className="w-4 h-4 text-green-600" />
                                      <span className="font-medium text-green-800">{selectedVenue.name} Details</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-green-700">
                                      <div>Area: {selectedVenue.area.toLocaleString()} sq ft</div>
                                      {selectedVenue.minGuests && (
                                        <div>Min Guests: {selectedVenue.minGuests}</div>
                                      )}
                                      {selectedVenue.maxGuests && (
                                        <div>Max Guests: {selectedVenue.maxGuests}</div>
                                      )}
                                    </div>
                                  </div>
                                ) : null;
                              })()}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                <div className="flex justify-end">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Venue Rental Total:</p>
                    <p className="text-lg font-semibold">₹{form.watch('venueRentalTotal')?.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Room Quotation */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    Room Quotation
                  </CardTitle>
                  <Button type="button" onClick={addRoomItem} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Room Package
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {roomFields.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p>No room packages added yet. Click "Add Room Package" to start.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {roomFields.map((field, index) => (
                      <Card key={field.id} className="border-dashed">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-medium">Room Package {index + 1}</h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeRoom(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField
                              control={form.control}
                              name={`roomPackages.${index}.category`}
                              render={({ field }) => (
                                <FormItem className="flex flex-col">
                                  <FormLabel className="mb-2">Room Category *</FormLabel>
                                  <Select 
                                    onValueChange={(value) => {
                                      field.onChange(value);
                                      // Auto-fill room rate when category is selected
                                      const selectedRoom = roomTypes.find(rt => rt.name === value);
                                      if (selectedRoom) {
                                        form.setValue(`roomPackages.${index}.rate`, selectedRoom.baseRate || 0, { shouldValidate: false, shouldDirty: false });
                                      }
                                    }} 
                                    value={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger className="h-10">
                                        <SelectValue placeholder="Select room type" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {roomTypes
                                        .filter((roomType) => !!roomType?.name)
                                        .map((roomType) => (
                                          <SelectItem key={roomType.id} value={roomType.name}>
                                            {roomType.name} - ₹{roomType.baseRate?.toLocaleString() || 0}
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`roomPackages.${index}.rate`}
                              render={({ field }) => (
                                <FormItem className="flex flex-col">
                                  <FormLabel className="mb-2">Room Rate (₹) *</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      className="h-10"
                                      value={field.value || ""}
                                      onChange={(e) => {
                                        const value = e.target.value ? Number(e.target.value) : 0;
                                        field.onChange(value);
                                        // Force form to re-render and recalculate
                                        form.trigger();
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`roomPackages.${index}.numberOfRooms`}
                              render={({ field }) => (
                                <FormItem className="flex flex-col">
                                  <FormLabel className="mb-2">Number of Rooms *</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      min="1"
                                      className="h-10"
                                      value={field.value?.toString() || ""}
                                      onChange={(e) => {
                                        const value = e.target.value.trim();
                                        if (value === "") {
                                          field.onChange(null);
                                        } else {
                                          const numValue = Number(value);
                                          field.onChange(isNaN(numValue) ? null : numValue);
                                        }
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                <div className="flex justify-end">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Room Quotation Total:</p>
                    <p className="text-lg font-semibold">₹{form.watch('roomQuotationTotal')?.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quotation Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Quotation Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {form.watch('includeGST') && (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 text-blue-700 font-medium mb-2">
                        <Calculator className="h-4 w-4" />
                        GST Included
                      </div>
                      <div className="text-sm text-blue-600">
                        <p>• Venue: 18% GST</p>
                        <p>• Rooms above ₹7,500: 18% GST | Up to ₹7,500: 5% GST</p>
                        <p>• Food/Menu: 18% GST</p>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Venue Rental:</span>
                    <span className="font-medium">₹{form.watch('venueRentalTotal')?.toLocaleString() || '0'}</span>
                  </div>
                  {includeGST && gstBreakdown && (
                    <div className="flex justify-between text-xs text-muted-foreground pl-4">
                      <span>Base: ₹{((form.watch('venueRentalTotal') || 0) - gstBreakdown.venueGST).toLocaleString()}</span>
                      <span>GST (18%): ₹{gstBreakdown.venueGST.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Room Quotation:</span>
                    <span className="font-medium">₹{form.watch('roomQuotationTotal')?.toLocaleString() || '0'}</span>
                  </div>
                  {includeGST && gstBreakdown && (
                    <div className="flex justify-between text-xs text-muted-foreground pl-4">
                      <span>Base: ₹{((form.watch('roomQuotationTotal') || 0) - gstBreakdown.roomGST).toLocaleString()}</span>
                      <span>GST: ₹{gstBreakdown.roomGST.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Menu Total:</span>
                    <span className="font-medium">₹{form.watch('menuTotal')?.toLocaleString() || '0'}</span>
                  </div>
                  {includeGST && gstBreakdown && (
                    <div className="flex justify-between text-xs text-muted-foreground pl-4">
                      <span>Base: ₹{((form.watch('menuTotal') || 0) - gstBreakdown.menuGST).toLocaleString()}</span>
                      <span>GST (18%): ₹{gstBreakdown.menuGST.toLocaleString()}</span>
                    </div>
                  )}
                  {includeGST && gstBreakdown && (
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal (Before GST):</span>
                        <span className="font-medium">₹{gstBreakdown.baseTotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total GST:</span>
                        <span className="font-medium text-green-600">₹{gstBreakdown.totalGST.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                  <div className="border-t pt-3">
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Grand Total:</span>
                      <span className="text-blue-600">₹{form.watch('grandTotal')?.toLocaleString() || '0'}</span>
                    </div>
                    {form.watch('finalTotal') && form.watch('finalTotal') !== form.watch('grandTotal') && (
                      <div className="flex justify-between text-xl font-bold text-green-600 mt-2">
                        <span>Final Total (After Discount):</span>
                        <span>₹{form.watch('finalTotal')?.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* GST Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  GST Configuration
                </CardTitle>
                <CardDescription>
                  Choose whether to include GST in the quotation rates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="includeGST"
                      checked={form.watch('includeGST')}
                      onChange={(e) => form.setValue('includeGST', e.target.checked)}
                      className="h-4 w-4 text-primary"
                    />
                    <label htmlFor="includeGST" className="text-sm font-medium">
                      Include GST in quotation rates
                    </label>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p><strong>GST Rates:</strong></p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Rooms above ₹7,500: 18% GST</li>
                      <li>Rooms up to ₹7,500: 5% GST</li>
                      <li>Venue rental: 18% GST</li>
                      <li>Food/Menu: 18% GST</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Discount Section */}
            <DiscountSection 
              grandTotal={form.watch('grandTotal') || 0}
              onDiscountApplied={(discountData) => {
                form.setValue('discountType', discountData.discountType);
                form.setValue('discountValue', discountData.discountValue);
                form.setValue('discountAmount', discountData.discountAmount);
                form.setValue('discountReason', discountData.discountReason);
                form.setValue('discountExceedsLimit', discountData.discountExceedsLimit);
                form.setValue('finalTotal', discountData.finalTotal);
              }}
            />

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              
              <Button 
                type="submit" 
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : editingQuotation ? "Update Quotation" : "Create Quotation"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>

      {/* Menu Item Editor Dialog */}
      {editingMenuPackage && (
        <MenuItemEditor
          open={showMenuItemEditor}
          onOpenChange={setShowMenuItemEditor}
          menuPackage={editingMenuPackage}
          onSave={handleMenuItemsSave}
        />
      )}

      {/* Menu Selection Flow Dialog */}
      <MenuSelectionFlow
        open={showMenuSelectionFlow}
        onOpenChange={setShowMenuSelectionFlow}
        onSave={handleMenuSelectionSave}
      />

      {/* Quotation Preview Dialog */}
      {createdQuotation && (
        <QuotationPreviewDialog
          open={showPreviewDialog}
          onOpenChange={setShowPreviewDialog}
          quotation={createdQuotation}
          onSendEmail={handleSendEmail}
        />
      )}
    </Dialog>
  );
}
