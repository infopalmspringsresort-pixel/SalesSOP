import { useState, useEffect, useMemo } from "react";
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
import { Plus, Trash2, Calculator, FileText, Building, Users, Calendar, Clock, Utensils, Edit, MapPin, Package, Save } from "lucide-react";
import type { Enquiry, Venue, Quotation, MenuPackage, QuotationPackage } from "@shared/schema-client";
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
  const [showSavePackageDialog, setShowSavePackageDialog] = useState(false);
  const [packageName, setPackageName] = useState("");
  const [packageDescription, setPackageDescription] = useState("");
  const [gstBreakdown, setGstBreakdown] = useState<{
    venueGST: number;
    roomGST: number;
    menuGST: number;
    totalGST: number;
    baseTotal: number;
    venueDiscount?: number;
    roomDiscount?: number;
    menuDiscount?: number;
    venueBaseAfterDiscount?: number;
    roomBaseAfterDiscount?: number;
    menuBaseAfterDiscount?: number;
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

  // Fetch quotation packages
  const { data: quotationPackages = [] } = useQuery<any[]>({
    queryKey: ["/api/quotations/packages"],
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


  // Helper function to convert date to DD/MM/YYYY format
  const convertToDDMMYYYY = (dateString: string | undefined | null): string => {
    if (!dateString) return "";
    
    // If already in DD/MM/YYYY format (has slashes), return as-is
    if (dateString.includes('/') && dateString.split('/').length === 3) {
      return dateString;
    }
    
    // If in DD MM YYYY format (with spaces), convert to slashes
    if (dateString.includes(' ') && dateString.split(' ').length === 3) {
      return dateString.replace(/\s+/g, '/');
    }
    
    // Try to parse as ISO date (YYYY-MM-DD) or other standard formats
    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      }
    } catch {
      // If parsing fails, return as-is
    }
    
    return dateString;
  };

  // Reset form when editingQuotation changes
  useEffect(() => {
    if (editingQuotation) {
      // Convert venue rental item dates to DD MM YYYY format
      const convertedQuotation = {
        ...editingQuotation,
        venueRentalItems: editingQuotation.venueRentalItems?.map(item => ({
          ...item,
          eventDate: convertToDDMMYYYY(item.eventDate),
          // Ensure all required fields are strings/numbers, not objects
          venue: typeof item.venue === 'string' ? item.venue : (item.venue?.name || item.venue || ''),
          venueSpace: typeof item.venueSpace === 'string' ? item.venueSpace : (item.venueSpace || ''),
          session: typeof item.session === 'string' ? item.session : (item.session || ''),
          sessionRate: typeof item.sessionRate === 'number' ? item.sessionRate : (parseFloat(item.sessionRate) || 0),
        })) || [],
        roomPackages: editingQuotation.roomPackages?.map(room => ({
          ...room,
          // Ensure all required fields are properly typed
          category: typeof room.category === 'string' ? room.category : (room.category?.name || room.category || ''),
          rate: typeof room.rate === 'number' ? room.rate : (parseFloat(room.rate) || 0),
          numberOfRooms: typeof room.numberOfRooms === 'number' ? room.numberOfRooms : (parseInt(room.numberOfRooms) || null),
          totalOccupancy: typeof room.totalOccupancy === 'number' ? room.totalOccupancy : (parseInt(room.totalOccupancy) || null),
        })) || [],
        // Ensure parentQuotationId is undefined, not null
        parentQuotationId: editingQuotation.parentQuotationId || undefined,
      };
      
      form.reset(convertedQuotation);
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
  const discountValue = useWatch({ control: form.control, name: 'discountValue' }) || 0;
  const discountType = useWatch({ control: form.control, name: 'discountType' });
  
  // Calculate base total (before discount and GST) for discount section
  const baseTotalBeforeDiscount = useMemo(() => {
    const venueBase = venueRentalItems?.reduce((sum, item) => {
      return sum + (item.sessionRate || 0);
    }, 0) || 0;
    
    const roomBase = roomPackages?.reduce((sum, item) => {
      const rate = item.rate || 0;
      const numberOfRooms = item.numberOfRooms || 1;
      const baseRoomAmount = rate * numberOfRooms;
      
      // Calculate extra person charges
      const defaultOccupancy = item.defaultOccupancy || 2; // Default to 2 if not set
      const totalOccupancy = item.totalOccupancy || (defaultOccupancy * numberOfRooms);
      const defaultTotalOccupancy = defaultOccupancy * numberOfRooms;
      const extraPersons = Math.max(0, totalOccupancy - defaultTotalOccupancy);
      const extraPersonRate = item.extraPersonRate || 0;
      const extraPersonCharges = extraPersons * extraPersonRate;
      
      return sum + baseRoomAmount + extraPersonCharges;
    }, 0) || 0;
    
    const menuBase = selectedMenuPackages.reduce((sum, packageId) => {
      const selectedPackage = menuPackages.find(pkg => pkg.id === packageId);
      if (selectedPackage) {
        const customData = customMenuItems[packageId];
        const packagePrice = selectedPackage.price;
        const additionalItemsTotal = customData?.selectedItems?.reduce((itemSum: number, item: any) => {
          return itemSum + (!item.isPackageItem ? (item.additionalPrice || 0) : 0);
        }, 0) || 0;
        return sum + packagePrice + additionalItemsTotal;
      }
      return sum;
    }, 0);
    
    return venueBase + roomBase + menuBase;
  }, [venueRentalItems, roomPackages, selectedMenuPackages, menuPackages, customMenuItems]);
  
  useEffect(() => {
    // Step 1: Calculate base totals (before discount and GST)
    const venueBaseTotal = venueRentalItems?.reduce((sum, item) => {
      return sum + (item.sessionRate || 0);
    }, 0) || 0;
    
    const roomBaseTotal = roomPackages?.reduce((sum, item) => {
      const rate = item.rate || 0;
      const numberOfRooms = item.numberOfRooms || 1;
      const baseRoomAmount = rate * numberOfRooms;
      
      // Calculate extra person charges
      const defaultOccupancy = item.defaultOccupancy || 2; // Default to 2 if not set
      const totalOccupancy = item.totalOccupancy || (defaultOccupancy * numberOfRooms);
      const defaultTotalOccupancy = defaultOccupancy * numberOfRooms;
      const extraPersons = Math.max(0, totalOccupancy - defaultTotalOccupancy);
      const extraPersonRate = item.extraPersonRate || 0;
      const extraPersonCharges = extraPersons * extraPersonRate;
      
      return sum + baseRoomAmount + extraPersonCharges;
    }, 0) || 0;
    
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
    
    const totalBaseAmount = venueBaseTotal + roomBaseTotal + menuBaseTotal;
    
    // Step 2: Calculate discount for each category separately (before GST)
    let venueDiscountAmount = 0;
    let roomDiscountAmount = 0;
    let menuDiscountAmount = 0;
    let totalDiscountAmount = 0;
    
    if (discountValue > 0 && discountType === 'percentage' && totalBaseAmount > 0) {
      // Calculate discount on each category individually
      venueDiscountAmount = (venueBaseTotal * discountValue) / 100;
      roomDiscountAmount = (roomBaseTotal * discountValue) / 100;
      menuDiscountAmount = (menuBaseTotal * discountValue) / 100;
      totalDiscountAmount = venueDiscountAmount + roomDiscountAmount + menuDiscountAmount;
    } else if (discountValue > 0 && discountType === 'fixed') {
      // For fixed discount, apply proportionally to each category
      const discountRatio = totalBaseAmount > 0 ? Math.min(discountValue, totalBaseAmount) / totalBaseAmount : 0;
      venueDiscountAmount = venueBaseTotal * discountRatio;
      roomDiscountAmount = roomBaseTotal * discountRatio;
      menuDiscountAmount = menuBaseTotal * discountRatio;
      totalDiscountAmount = venueDiscountAmount + roomDiscountAmount + menuDiscountAmount;
    }
    
    // Apply discount to each category
    const venueBaseAfterDiscount = venueBaseTotal - venueDiscountAmount;
    const roomBaseAfterDiscount = roomBaseTotal - roomDiscountAmount;
    const menuBaseAfterDiscount = menuBaseTotal - menuDiscountAmount;
    
    // Step 3: Calculate GST on discounted amounts
    const venueGST = includeGST ? calculateGST(venueBaseAfterDiscount, 'venue') : 0;
    const venueTotal = venueBaseAfterDiscount + venueGST;
    
    // Calculate room GST item by item (as each room can have different GST rates)
    // Apply discount proportionally to each room item
    const roomDiscountRatio = roomBaseTotal > 0 ? roomDiscountAmount / roomBaseTotal : 0;
    const roomGST = includeGST ? roomPackages?.reduce((sum, item) => {
      const rate = item.rate || 0;
      const numberOfRooms = item.numberOfRooms || 1;
      const baseRoomAmount = rate * numberOfRooms;
      
      // Calculate extra person charges
      const defaultOccupancy = item.defaultOccupancy || 2;
      const totalOccupancy = item.totalOccupancy || (defaultOccupancy * numberOfRooms);
      const defaultTotalOccupancy = defaultOccupancy * numberOfRooms;
      const extraPersons = Math.max(0, totalOccupancy - defaultTotalOccupancy);
      const extraPersonRate = item.extraPersonRate || 0;
      const extraPersonCharges = extraPersons * extraPersonRate;
      
      const itemBaseTotal = baseRoomAmount + extraPersonCharges;
      // Apply discount proportionally to this item
      const itemDiscount = itemBaseTotal * roomDiscountRatio;
      const itemBaseAfterDiscount = itemBaseTotal - itemDiscount;
      return sum + calculateGST(itemBaseAfterDiscount, 'room', rate);
    }, 0) || 0 : 0;
    const roomQuotationTotal = roomBaseAfterDiscount + roomGST;
    
    const menuGST = includeGST ? calculateGST(menuBaseAfterDiscount, 'menu') : 0;
    const menuTotal = menuBaseAfterDiscount + menuGST;
    
    // Step 4: Calculate final totals
    const banquetTotal = venueTotal;
    const roomTotal = roomQuotationTotal;
    const grandTotal = venueTotal + roomQuotationTotal + menuTotal;
    
    // Store individual GST amounts for display
    const totalGST = venueGST + roomGST + menuGST;
    const baseTotalAfterDiscount = venueBaseAfterDiscount + roomBaseAfterDiscount + menuBaseAfterDiscount;
    
    // Update form values
    form.setValue('venueRentalTotal', venueTotal, { shouldValidate: false, shouldDirty: false });
    form.setValue('roomQuotationTotal', roomQuotationTotal, { shouldValidate: false, shouldDirty: false });
    form.setValue('roomTotal', roomTotal, { shouldValidate: false, shouldDirty: false });
    form.setValue('menuTotal', menuTotal, { shouldValidate: false, shouldDirty: false });
    form.setValue('banquetTotal', banquetTotal, { shouldValidate: false, shouldDirty: false });
    form.setValue('grandTotal', grandTotal, { shouldValidate: false, shouldDirty: false });
    
    // Update discount amount if it changed
    const currentDiscountAmount = form.getValues('discountAmount') || 0;
    if (Math.abs(currentDiscountAmount - totalDiscountAmount) > 0.01) {
      form.setValue('discountAmount', totalDiscountAmount, { shouldValidate: false, shouldDirty: false });
    }
    
    // Update final total (same as grand total since discount is already applied to base)
    form.setValue('finalTotal', grandTotal, { shouldValidate: false, shouldDirty: false });
    
    // Store GST and discount breakdown for display
    setGstBreakdown(includeGST ? {
      venueGST,
      roomGST,
      menuGST,
      totalGST,
      baseTotal: baseTotalAfterDiscount, // This is the base total after discount
      venueDiscount: venueDiscountAmount,
      roomDiscount: roomDiscountAmount,
      menuDiscount: menuDiscountAmount,
      venueBaseAfterDiscount,
      roomBaseAfterDiscount,
      menuBaseAfterDiscount,
    } : null);
  }, [venueRentalItems, roomPackages, includeGST, selectedMenuPackages, menuPackages, customMenuItems, discountValue, discountType, form]);

  const createQuotationMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      console.log('🚀 Making POST request to /api/quotations');
      
      // Clean up the data - remove null/undefined values and ensure proper types
      const cleanedData = { ...data };
      
      // Remove parentQuotationId if it's null or undefined
      if (editingQuotation && editingQuotation.id) {
        cleanedData.parentQuotationId = editingQuotation.id;
      } else {
        delete cleanedData.parentQuotationId;
      }
      
      // Ensure venueRentalItems have proper types
      if (cleanedData.venueRentalItems) {
        cleanedData.venueRentalItems = cleanedData.venueRentalItems.map((item: any) => ({
          eventDate: item.eventDate || '',
          venue: typeof item.venue === 'string' ? item.venue : (item.venue?.name || item.venue || ''),
          venueSpace: typeof item.venueSpace === 'string' ? item.venueSpace : (item.venueSpace || ''),
          session: typeof item.session === 'string' ? item.session : (item.session || ''),
          sessionRate: typeof item.sessionRate === 'number' ? item.sessionRate : (parseFloat(item.sessionRate) || 0),
        }));
      }
      
      // Ensure roomPackages have proper types
      if (cleanedData.roomPackages) {
        cleanedData.roomPackages = cleanedData.roomPackages.map((room: any) => ({
          category: typeof room.category === 'string' ? room.category : (room.category?.name || room.category || ''),
          rate: typeof room.rate === 'number' ? room.rate : (parseFloat(room.rate) || 0),
          numberOfRooms: typeof room.numberOfRooms === 'number' ? room.numberOfRooms : (room.numberOfRooms ? parseInt(room.numberOfRooms) : null),
          totalOccupancy: typeof room.totalOccupancy === 'number' ? room.totalOccupancy : (room.totalOccupancy ? parseInt(room.totalOccupancy) : null),
          defaultOccupancy: room.defaultOccupancy || 2,
          maxOccupancy: room.maxOccupancy || 2,
          extraPersonRate: room.extraPersonRate || 0,
        }));
      }
      
      console.log('🚀 Request data:', cleanedData);
      const response = await apiRequest("POST", "/api/quotations", cleanedData);
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
      // Invalidate all quotation-related queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
      queryClient.invalidateQueries({ queryKey: [`/api/quotations/activities/${enquiry.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/quotations?enquiryId=${enquiry.id}`] });
      
      // Force immediate refetch
      queryClient.refetchQueries({ queryKey: ["/api/quotations"] });
      queryClient.refetchQueries({ queryKey: [`/api/quotations/activities/${enquiry.id}`] });
      
      const message = editingQuotation 
        ? `Quotation Version ${response.version} created successfully` 
        : "Quotation created successfully";
      toast({ title: "Success", description: message });
      
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


  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    console.log('🚀 Form onSubmit called');
    setIsSubmitting(true);
    try {
      // Prepare menu packages data
      console.log('🔍 customMenuItems:', customMenuItems);
      console.log('🔍 selectedMenuPackages:', selectedMenuPackages);
      
      const menuPackagesData = await Promise.all(selectedMenuPackages.map(async (packageId) => {
        const selectedPackage = menuPackages.find(pkg => pkg.id === packageId);
        let customData = customMenuItems[packageId];
        
        console.log(`🔍 Package ${packageId} customData:`, customData);
        
        // If customData is missing or selectedItems is empty, fetch and initialize
        if (!customData || !customData.selectedItems || customData.selectedItems.length === 0) {
          console.log(`🔍 Package ${packageId} has no selectedItems, fetching from API...`);
          
          try {
            // Fetch menu items for this package
            const response = await fetch('/api/menus/items');
            if (response.ok) {
              const allItems = await response.json();
              const filteredItems = allItems.filter((item: any) => {
                const itemPackageId = typeof item.packageId === 'string' ? item.packageId : item.packageId?.toString();
                const selectedPackageId = typeof packageId === 'string' ? packageId : packageId.toString();
                return itemPackageId === selectedPackageId;
              });
              
              console.log(`🔍 Found ${filteredItems.length} items for package ${packageId}`);
              
              // Initialize with all package items
              const selectedItemsWithDetails = filteredItems.map((item: any) => {
                const quantity = (item.quantity !== undefined && item.quantity !== null) ? item.quantity : 1;
                return {
                  id: item.id || item._id?.toString(),
                  name: item.name,
                  price: item.price || 0,
                  additionalPrice: item.additionalPrice || 0,
                  isPackageItem: true,
                  quantity: quantity
                };
              });
              
              customData = {
                selectedItems: selectedItemsWithDetails,
                customItems: [],
                totalPackageItems: filteredItems.length,
                excludedItemCount: 0,
                totalDeduction: 0
              };
              
              // Update state for future use
              setCustomMenuItems(prev => ({
                ...prev,
                [packageId]: customData
              }));
            }
          } catch (error) {
            console.error('Error fetching menu items:', error);
          }
        }
        
        console.log(`🔍 selectedItems in customData:`, customData?.selectedItems);
        console.log(`🔍 customItems in customData:`, customData?.customItems);
        
        // Ensure selectedItems and customItems are arrays, not undefined
        let selectedItems = Array.isArray(customData?.selectedItems) ? customData.selectedItems : (customData?.selectedItems ? [customData.selectedItems] : []);
        const customItems = Array.isArray(customData?.customItems) ? customData.customItems : (customData?.customItems ? [customData.customItems] : []);
        
        // Ensure all selectedItems have quantity field - if missing, fetch from API
        if (selectedItems.length > 0) {
          const itemsWithoutQuantity = selectedItems.filter((item: any) => item.quantity === undefined || item.quantity === null);
          if (itemsWithoutQuantity.length > 0) {
            console.log(`🔍 Some items missing quantity, fetching from API...`);
            try {
              const response = await fetch('/api/menus/items');
              if (response.ok) {
                const allItems = await response.json();
                // Update items with quantity from database
                selectedItems = selectedItems.map((item: any) => {
                  const dbItem = allItems.find((db: any) => {
                    const dbId = db.id || db._id?.toString();
                    const itemId = item.id?.toString();
                    return dbId === itemId;
                  });
                  
                  if (dbItem) {
                    const quantity = (dbItem.quantity !== undefined && dbItem.quantity !== null) ? dbItem.quantity : 1;
                    return {
                      ...item,
                      quantity: quantity
                    };
                  }
                  // If not found in DB, default to 1
                  return {
                    ...item,
                    quantity: item.quantity !== undefined && item.quantity !== null ? item.quantity : 1
                  };
                });
              }
            } catch (error) {
              console.error('Error fetching menu items for quantity:', error);
              // If fetch fails, at least ensure quantity defaults to 1
              selectedItems = selectedItems.map((item: any) => ({
                ...item,
                quantity: item.quantity !== undefined && item.quantity !== null ? item.quantity : 1
              }));
            }
          } else {
            // All items have quantity, but ensure it's set (default to 1 if missing)
            selectedItems = selectedItems.map((item: any) => ({
              ...item,
              quantity: item.quantity !== undefined && item.quantity !== null ? item.quantity : 1
            }));
          }
        }
        
        // Final validation - if still empty, show error
        if (selectedItems.length === 0) {
          console.error(`❌ Package ${packageId} has no selectedItems after all attempts!`);
          toast({
            title: "Error",
            description: `No menu items found for ${selectedPackage?.name || 'selected package'}. Please select menu items before saving.`,
            variant: "destructive",
          });
          throw new Error(`No menu items for package ${packageId}`);
        }
        
        console.log(`🔍 Final selectedItems with quantities:`, selectedItems.map((item: any) => ({ name: item.name, quantity: item.quantity })));
        console.log(`🔍 Final customItems:`, customItems);
        
        const result = {
          id: selectedPackage?.id,
          name: selectedPackage?.name,
          type: selectedPackage?.type || 'non-veg',
          price: selectedPackage?.price || 0,
          gst: selectedPackage?.gst || 18,
          selectedItems: selectedItems,
          customItems: customItems,
          totalPackageItems: customData?.totalPackageItems || selectedItems.length || 0,
          excludedItemCount: customData?.excludedItemCount || 0,
          totalDeduction: customData?.totalDeduction || 0
        };
        
        console.log(`🔍 Final result for package ${packageId}:`, JSON.stringify(result, null, 2));
        return result;
      }));
      
      console.log('🔍 menuPackagesData:', JSON.stringify(menuPackagesData, null, 2));

      // Use totals already calculated by useEffect (which includes discount and GST)
      const formData = {
        ...data,
        menuPackages: menuPackagesData,
        venueRentalTotal: data.venueRentalTotal || 0,
        roomQuotationTotal: data.roomQuotationTotal || 0,
        roomTotal: data.roomTotal || 0,
        menuTotal: data.menuTotal || 0,
        grandTotal: data.grandTotal || 0,
        finalTotal: data.finalTotal || data.grandTotal || 0,
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
      
      // Always create new quotation (if editing, it will be a new version)
      await createQuotationMutation.mutateAsync(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addVenueItem = () => {
    // Get event date and convert to DD/MM/YYYY format if it exists
    const formEventDate = form.getValues('eventDate');
    let defaultDate = "";
    if (formEventDate) {
      try {
        const date = new Date(formEventDate);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        defaultDate = `${day}/${month}/${year}`;
      } catch {
        defaultDate = formEventDate; // Use as-is if parsing fails
      }
    } else {
      // Default to today in DD/MM/YYYY format
      const today = new Date();
      const day = String(today.getDate()).padStart(2, '0');
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const year = today.getFullYear();
      defaultDate = `${day}/${month}/${year}`;
    }
    
    appendVenue({
      eventDate: defaultDate,
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
      totalOccupancy: null,
      defaultOccupancy: undefined,
      maxOccupancy: undefined,
      extraPersonRate: undefined,
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

  const handleMenuSelectionSave = (selectedPackage: string, customMenuItemsData: any) => {
    console.log('🔍 handleMenuSelectionSave called with:', { selectedPackage, customMenuItemsData });
    console.log('🔍 customMenuItemsData.selectedItems:', customMenuItemsData?.selectedItems);
    console.log('🔍 selectedItems count:', customMenuItemsData?.selectedItems?.length || 0);
    
    // Ensure selectedItems and customItems are arrays
    const safeData = {
      ...customMenuItemsData,
      selectedItems: Array.isArray(customMenuItemsData?.selectedItems) ? customMenuItemsData.selectedItems : (customMenuItemsData?.selectedItems ? [customMenuItemsData.selectedItems] : []),
      customItems: Array.isArray(customMenuItemsData?.customItems) ? customMenuItemsData.customItems : (customMenuItemsData?.customItems ? [customMenuItemsData.customItems] : []),
    };
    
    console.log('🔍 Safe data being stored:', {
      selectedItemsCount: safeData.selectedItems.length,
      customItemsCount: safeData.customItems.length,
      selectedItems: safeData.selectedItems
    });
    
    setSelectedMenuPackages([selectedPackage]);
    setCustomMenuItems({ [selectedPackage]: safeData });
    setShowMenuSelectionFlow(false);
    
    toast({
      title: "Success",
      description: `Menu package configured with ${safeData.selectedItems.length} items`,
    });
  };

  // Load quotation package into form
  const handleLoadPackage = (packageId: string) => {
    const selectedPackage = quotationPackages.find(p => p.id === packageId);
    if (!selectedPackage) {
      toast({
        title: "Error",
        description: "Package not found",
        variant: "destructive"
      });
      return;
    }

    // Get event date from form or enquiry
    const formEventDate = form.getValues('eventDate');
    let defaultDate = "";
    if (formEventDate) {
      try {
        const date = new Date(formEventDate);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        defaultDate = `${day}/${month}/${year}`;
      } catch {
        defaultDate = formEventDate;
      }
    } else {
      const today = new Date();
      const day = String(today.getDate()).padStart(2, '0');
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const year = today.getFullYear();
      defaultDate = `${day}/${month}/${year}`;
    }

    // Load venue rental items - ensure proper data structure and types
    const venueItems = (selectedPackage.venueRentalItems || []).map(item => {
      // Ensure all fields are properly typed (handle cases where saved data might be objects)
      const venueValue = typeof item.venue === 'string' ? item.venue : (item.venue?.name || item.venue || '');
      const venueSpaceValue = typeof item.venueSpace === 'string' ? item.venueSpace : (item.venueSpace || '');
      const sessionValue = typeof item.session === 'string' ? item.session : (item.session || '');
      const sessionRateValue = typeof item.sessionRate === 'number' ? item.sessionRate : (parseFloat(item.sessionRate) || 0);
      
      return {
        eventDate: item.eventDate || defaultDate,
        venue: venueValue,
        venueSpace: venueSpaceValue,
        session: sessionValue,
        sessionRate: sessionRateValue,
      };
    });
    form.setValue('venueRentalItems', venueItems, { shouldValidate: true, shouldDirty: true });
    
    // Load room packages - ensure proper data structure and types
    const roomPackagesData = (selectedPackage.roomPackages || []).map(room => {
      // Ensure all fields are properly typed (handle cases where saved data might be objects)
      const categoryValue = typeof room.category === 'string' ? room.category : (room.category?.name || room.category || '');
      const rateValue = typeof room.rate === 'number' ? room.rate : (parseFloat(room.rate) || 0);
      const numberOfRoomsValue = typeof room.numberOfRooms === 'number' ? room.numberOfRooms : (room.numberOfRooms ? parseInt(room.numberOfRooms) : null);
      const totalOccupancyValue = typeof room.totalOccupancy === 'number' ? room.totalOccupancy : (room.totalOccupancy ? parseInt(room.totalOccupancy) : null);
      
      return {
        category: categoryValue,
        rate: rateValue,
        numberOfRooms: numberOfRoomsValue,
        totalOccupancy: totalOccupancyValue,
        defaultOccupancy: room.defaultOccupancy || 2,
        maxOccupancy: room.maxOccupancy || 2,
        extraPersonRate: room.extraPersonRate || 0,
      };
    });
    form.setValue('roomPackages', roomPackagesData, { shouldValidate: true, shouldDirty: true });
    
    // Clear parentQuotationId when loading a package (since we're starting fresh)
    form.setValue('parentQuotationId', undefined, { shouldValidate: false });
    
    // Force form to update and trigger recalculation
    // Use setTimeout to ensure React Hook Form processes the changes and useWatch hooks detect them
    setTimeout(() => {
      // Trigger validation to ensure form state is updated
      form.trigger(['venueRentalItems', 'roomPackages']);
      
      // Force recalculation by creating new array references
      // This ensures useWatch hooks detect the change
      const currentVenueItems = form.getValues('venueRentalItems');
      const currentRoomPackages = form.getValues('roomPackages');
      
      if (currentVenueItems && currentVenueItems.length > 0) {
        form.setValue('venueRentalItems', [...currentVenueItems], { shouldValidate: false, shouldDirty: false });
      }
      if (currentRoomPackages && currentRoomPackages.length > 0) {
        form.setValue('roomPackages', [...currentRoomPackages], { shouldValidate: false, shouldDirty: false });
      }
      
      // Also explicitly trigger a form state update to ensure useWatch hooks fire
      form.trigger();
    }, 100); // Small delay to ensure React Hook Form has processed the initial setValue calls
    
    // Load menu packages
    if (selectedPackage.menuPackages && selectedPackage.menuPackages.length > 0) {
      const packageIds = selectedPackage.menuPackages.map(p => p.id).filter(Boolean) as string[];
      setSelectedMenuPackages(packageIds);
      
      // Set custom menu items if any
      const menuItemsMap: Record<string, any> = {};
      selectedPackage.menuPackages.forEach(pkg => {
        if (pkg.id && (pkg.selectedItems || pkg.customItems)) {
          menuItemsMap[pkg.id] = {
            selectedItems: pkg.selectedItems || [],
            customItems: pkg.customItems || [],
          };
        }
      });
      setCustomMenuItems(menuItemsMap);
    } else {
      setSelectedMenuPackages([]);
      setCustomMenuItems({});
    }
    
    // Load settings
    if (selectedPackage.includeGST !== undefined) {
      form.setValue('includeGST', selectedPackage.includeGST);
    }
    if (selectedPackage.checkInTime) {
      form.setValue('checkInTime', selectedPackage.checkInTime);
    }
    if (selectedPackage.checkOutTime) {
      form.setValue('checkOutTime', selectedPackage.checkOutTime);
    }

    toast({ 
      title: "Package Loaded", 
      description: `Loaded quotation package: ${selectedPackage.name}. You can now edit and create the quotation.` 
    });
  };

  // Save current quotation as package
  const savePackageMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const currentFormData = form.getValues();
      
      const packageData = {
        name: data.name,
        description: data.description || "",
        venueRentalItems: currentFormData.venueRentalItems || [],
        roomPackages: currentFormData.roomPackages || [],
        menuPackages: selectedMenuPackages.map(packageId => {
          const selectedPackage = menuPackages.find(pkg => pkg.id === packageId);
          const customData = customMenuItems[packageId];
          
          return {
            id: selectedPackage?.id,
            name: selectedPackage?.name,
            type: selectedPackage?.type || 'non-veg',
            price: selectedPackage?.price || 0,
            gst: selectedPackage?.gst || 18,
            selectedItems: customData?.selectedItems || [],
            customItems: customData?.customItems || [],
          };
        }),
        includeGST: currentFormData.includeGST || false,
        checkInTime: currentFormData.checkInTime || "14:00",
        checkOutTime: currentFormData.checkOutTime || "11:00",
        isActive: true,
      };

      const response = await apiRequest("POST", "/api/quotations/packages", packageData);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save package");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotations/packages"] });
      toast({ title: "Success", description: "Quotation package saved successfully" });
      setShowSavePackageDialog(false);
      setPackageName("");
      setPackageDescription("");
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to save quotation package", 
        variant: "destructive" 
      });
    },
  });

  const handleSaveAsPackage = () => {
    if (!packageName.trim()) {
      toast({ 
        title: "Error", 
        description: "Package name is required", 
        variant: "destructive" 
      });
      return;
    }
    savePackageMutation.mutate({ 
      name: packageName, 
      description: packageDescription 
    });
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
              {editingQuotation ? `Edit Quotation (Version ${editingQuotation.version || 1})` : "Create New Quotation"}
            </DialogTitle>
            <div className="flex gap-2">
              <Select
                value=""
                onValueChange={(value) => {
                  if (value) {
                    handleLoadPackage(value);
                    // Reset the select to show placeholder again
                    setTimeout(() => {
                      const select = document.querySelector('[data-placeholder="Load Package"]') as any;
                      if (select) select.value = "";
                    }, 100);
                  }
                }}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Load Saved Package" />
                </SelectTrigger>
                <SelectContent>
                  {quotationPackages.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      No packages available
                    </div>
                  ) : (
                    quotationPackages.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id!}>
                        <Package className="w-4 h-4 mr-2 inline" />
                        {pkg.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowSavePackageDialog(true)}
              >
                <Save className="w-4 h-4 mr-2" />
                Save as Package
              </Button>
            </div>
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
                          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <FormField
                              control={form.control}
                              name={`venueRentalItems.${index}.eventDate`}
                              render={({ field }) => {
                                // Helper function to format date with slashes
                                const formatDateWithSlashes = (value: string): string => {
                                  // Remove all non-digit characters
                                  const digits = value.replace(/\D/g, '');
                                  
                                  // Limit to 8 digits (DDMMYYYY)
                                  const limited = digits.slice(0, 8);
                                  
                                  // Insert slashes at appropriate positions
                                  let formatted = '';
                                  for (let i = 0; i < limited.length; i++) {
                                    if (i === 2 || i === 4) {
                                      formatted += '/';
                                    }
                                    formatted += limited[i];
                                  }
                                  
                                  return formatted;
                                };

                                // Helper function to handle input changes
                                const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                                  const input = e.target.value;
                                  
                                  // Format the new value (removes non-digits and adds slashes)
                                  const formatted = formatDateWithSlashes(input);
                                  
                                  // Calculate cursor position based on digit count
                                  const digitsBefore = input.slice(0, e.target.selectionStart || 0).replace(/\D/g, '').length;
                                  
                                  // Position cursor: after digits + slashes that should appear before cursor
                                  let newCursorPosition = digitsBefore;
                                  if (digitsBefore > 2) newCursorPosition++; // After first slash
                                  if (digitsBefore > 4) newCursorPosition++; // After second slash
                                  
                                  // Ensure cursor doesn't exceed formatted length
                                  newCursorPosition = Math.min(newCursorPosition, formatted.length);
                                  
                                  field.onChange(formatted);
                                  
                                  // Set cursor position after state update
                                  setTimeout(() => {
                                    e.target.setSelectionRange(newCursorPosition, newCursorPosition);
                                  }, 0);
                                };

                                // Handle key down to prevent deleting/editing slashes
                                const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
                                  const input = e.currentTarget;
                                  const cursorPosition = input.selectionStart || 0;
                                  const value = field.value || '';
                                  
                                  // Prevent typing if cursor is at a slash position
                                  if (e.key.length === 1 && !/\d/.test(e.key)) {
                                    // Non-digit character typed - prevent if at slash position
                                    if (value[cursorPosition] === '/') {
                                      e.preventDefault();
                                      // Move cursor forward past the slash
                                      setTimeout(() => {
                                        input.setSelectionRange(cursorPosition + 1, cursorPosition + 1);
                                      }, 0);
                                      return;
                                    }
                                  }
                                  
                                  // Handle backspace - skip slashes
                                  if (e.key === 'Backspace') {
                                    if (cursorPosition > 0 && value[cursorPosition - 1] === '/') {
                                      e.preventDefault();
                                      // Delete the digit before the slash
                                      const digits = value.replace(/\D/g, '');
                                      const digitPos = value.slice(0, cursorPosition - 1).replace(/\D/g, '').length;
                                      if (digitPos > 0) {
                                        const newDigits = digits.slice(0, digitPos - 1) + digits.slice(digitPos);
                                        const formatted = formatDateWithSlashes(newDigits);
                                        field.onChange(formatted);
                                        setTimeout(() => {
                                          const newPos = cursorPosition - 1;
                                          input.setSelectionRange(Math.max(0, newPos), Math.max(0, newPos));
                                        }, 0);
                                      }
                                    }
                                  }
                                  
                                  // Handle delete - skip slashes
                                  if (e.key === 'Delete') {
                                    if (value[cursorPosition] === '/') {
                                      e.preventDefault();
                                      // Delete the digit after the slash
                                      const digits = value.replace(/\D/g, '');
                                      const digitPos = value.slice(0, cursorPosition).replace(/\D/g, '').length;
                                      if (digitPos < digits.length) {
                                        const newDigits = digits.slice(0, digitPos) + digits.slice(digitPos + 1);
                                        const formatted = formatDateWithSlashes(newDigits);
                                        field.onChange(formatted);
                                        setTimeout(() => {
                                          input.setSelectionRange(cursorPosition, cursorPosition);
                                        }, 0);
                                      }
                                    }
                                  }
                                };

                                return (
                                  <FormItem>
                                    <FormLabel>Date *</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="text"
                                        placeholder="DD/MM/YYYY"
                                        maxLength={10}
                                        value={field.value || ""}
                                        onChange={handleDateChange}
                                        onKeyDown={handleKeyDown}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                );
                              }}
                            />
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
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <FormField
                              control={form.control}
                              name={`roomPackages.${index}.category`}
                              render={({ field }) => (
                                <FormItem className="flex flex-col">
                                  <FormLabel className="mb-2">Room Category *</FormLabel>
                                  <Select 
                                    onValueChange={(value) => {
                                      field.onChange(value);
                                      // Auto-fill room rate and occupancy data when category is selected
                                      const selectedRoom = roomTypes.find(rt => rt.name === value);
                                      if (selectedRoom) {
                                        const defaultOccupancy = selectedRoom.defaultOccupancy || 2;
                                        const maxOccupancy = selectedRoom.maxOccupancy || 2;
                                        const extraPersonRate = selectedRoom.extraPersonRate || 0;
                                        const numberOfRooms = form.getValues(`roomPackages.${index}.numberOfRooms`) || 1;
                                        const totalOccupancy = defaultOccupancy * numberOfRooms;
                                        
                                        form.setValue(`roomPackages.${index}.rate`, selectedRoom.baseRate || 0, { shouldValidate: false, shouldDirty: false });
                                        form.setValue(`roomPackages.${index}.defaultOccupancy`, defaultOccupancy, { shouldValidate: false, shouldDirty: false });
                                        form.setValue(`roomPackages.${index}.maxOccupancy`, maxOccupancy, { shouldValidate: false, shouldDirty: false });
                                        form.setValue(`roomPackages.${index}.extraPersonRate`, extraPersonRate, { shouldValidate: false, shouldDirty: false });
                                        form.setValue(`roomPackages.${index}.totalOccupancy`, totalOccupancy, { shouldValidate: false, shouldDirty: false });
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
                                          
                                          // Update totalOccupancy when numberOfRooms changes
                                          const defaultOccupancy = form.getValues(`roomPackages.${index}.defaultOccupancy`) || 2;
                                          const maxOccupancy = form.getValues(`roomPackages.${index}.maxOccupancy`) || 2;
                                          const currentTotalOccupancy = form.getValues(`roomPackages.${index}.totalOccupancy`);
                                          
                                          if (!isNaN(numValue) && numValue > 0) {
                                            const newDefaultTotal = defaultOccupancy * numValue;
                                            // If current occupancy is not set or is based on old room count, update it
                                            if (!currentTotalOccupancy || currentTotalOccupancy < newDefaultTotal) {
                                              form.setValue(`roomPackages.${index}.totalOccupancy`, newDefaultTotal, { shouldValidate: false, shouldDirty: false });
                                            } else {
                                              // Ensure totalOccupancy doesn't exceed maxOccupancy * numberOfRooms
                                              const maxTotalOccupancy = maxOccupancy * numValue;
                                              if (currentTotalOccupancy > maxTotalOccupancy) {
                                                form.setValue(`roomPackages.${index}.totalOccupancy`, maxTotalOccupancy, { shouldValidate: false, shouldDirty: false });
                                              }
                                            }
                                          }
                                        }
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`roomPackages.${index}.totalOccupancy`}
                              render={({ field }) => {
                                const numberOfRooms = form.watch(`roomPackages.${index}.numberOfRooms`) || 1;
                                const maxOccupancy = form.watch(`roomPackages.${index}.maxOccupancy`) || 2;
                                const defaultOccupancy = form.watch(`roomPackages.${index}.defaultOccupancy`) || 2;
                                const maxTotalOccupancy = maxOccupancy * numberOfRooms;
                                const defaultTotalOccupancy = defaultOccupancy * numberOfRooms;
                                
                                return (
                                  <FormItem className="flex flex-col">
                                    <FormLabel className="mb-2">Total Occupancy *</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        min={numberOfRooms}
                                        max={maxTotalOccupancy}
                                        className="h-10"
                                        value={field.value?.toString() || ""}
                                        onChange={(e) => {
                                          const value = e.target.value;
                                          // Allow empty string or any number while typing
                                          if (value === "") {
                                            field.onChange(null);
                                          } else {
                                            const numValue = Number(value);
                                            if (!isNaN(numValue)) {
                                              field.onChange(numValue);
                                            }
                                          }
                                        }}
                                        onBlur={(e) => {
                                          // Validate and clamp value on blur
                                          const value = e.target.value.trim();
                                          if (value === "") {
                                            // If empty, set to default
                                            field.onChange(defaultTotalOccupancy);
                                            form.setValue(`roomPackages.${index}.totalOccupancy`, defaultTotalOccupancy, { shouldValidate: false, shouldDirty: false });
                                          } else {
                                            const numValue = Number(value);
                                            if (!isNaN(numValue)) {
                                              // Clamp to valid range
                                              if (numValue < numberOfRooms) {
                                                field.onChange(numberOfRooms);
                                                form.setValue(`roomPackages.${index}.totalOccupancy`, numberOfRooms, { shouldValidate: false, shouldDirty: false });
                                              } else if (numValue > maxTotalOccupancy) {
                                                field.onChange(maxTotalOccupancy);
                                                form.setValue(`roomPackages.${index}.totalOccupancy`, maxTotalOccupancy, { shouldValidate: false, shouldDirty: false });
                                              } else {
                                                field.onChange(numValue);
                                              }
                                            }
                                          }
                                        }}
                                        placeholder={`Default: ${defaultTotalOccupancy}`}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                    {defaultOccupancy && maxOccupancy && (
                                      <p className="text-xs text-muted-foreground">
                                        Default: {defaultTotalOccupancy} (Range: {numberOfRooms} - {maxTotalOccupancy})
                                      </p>
                                    )}
                                  </FormItem>
                                );
                              }}
                            />
                          </div>
                          {/* Display extra person charges breakdown if applicable */}
                          {(() => {
                            const room = form.watch(`roomPackages.${index}`);
                            if (!room || !room.category || !room.numberOfRooms || !room.totalOccupancy) return null;
                            
                            const defaultOccupancy = room.defaultOccupancy || 2;
                            const numberOfRooms = room.numberOfRooms || 1;
                            const totalOccupancy = room.totalOccupancy || (defaultOccupancy * numberOfRooms);
                            const defaultTotalOccupancy = defaultOccupancy * numberOfRooms;
                            const extraPersons = Math.max(0, totalOccupancy - defaultTotalOccupancy);
                            const extraPersonRate = room.extraPersonRate || 0;
                            const extraPersonCharges = extraPersons * extraPersonRate;
                            
                            if (extraPersons > 0 && extraPersonRate > 0) {
                              return (
                                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                  <div className="text-sm space-y-1">
                                    <div className="flex justify-between">
                                      <span className="text-blue-700">Base Occupancy:</span>
                                      <span className="font-medium text-blue-800">{defaultTotalOccupancy} persons</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-blue-700">Total Occupancy:</span>
                                      <span className="font-medium text-blue-800">{totalOccupancy} persons</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-blue-700">Extra Persons:</span>
                                      <span className="font-medium text-blue-800">{extraPersons} persons</span>
                                    </div>
                                    <div className="flex justify-between border-t border-blue-300 pt-1 mt-1">
                                      <span className="font-semibold text-blue-900">Extra Person Charges:</span>
                                      <span className="font-bold text-blue-900">₹{extraPersonCharges.toLocaleString()}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })()}
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
                  {(discountValue > 0 || (includeGST && gstBreakdown)) && (
                    <div className="text-xs text-muted-foreground pl-4 space-y-1">
                      {discountValue > 0 && gstBreakdown?.venueDiscount !== undefined && (
                        <div className="flex justify-between">
                          <span>Base: ₹{((gstBreakdown.venueBaseAfterDiscount || 0) + (gstBreakdown.venueDiscount || 0)).toLocaleString()}</span>
                          <span className="text-red-600">Discount: -₹{(gstBreakdown.venueDiscount || 0).toLocaleString()}</span>
                        </div>
                      )}
                      {gstBreakdown && (
                        <div className="flex justify-between">
                          <span>Base (after discount): ₹{(gstBreakdown.venueBaseAfterDiscount || ((form.watch('venueRentalTotal') || 0) - gstBreakdown.venueGST)).toLocaleString()}</span>
                          <span>GST (18%): ₹{gstBreakdown.venueGST.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Room Quotation:</span>
                    <span className="font-medium">₹{form.watch('roomQuotationTotal')?.toLocaleString() || '0'}</span>
                  </div>
                  {(discountValue > 0 || (includeGST && gstBreakdown)) && (
                    <div className="text-xs text-muted-foreground pl-4 space-y-1">
                      {discountValue > 0 && gstBreakdown?.roomDiscount !== undefined && (
                        <div className="flex justify-between">
                          <span>Base: ₹{((gstBreakdown.roomBaseAfterDiscount || 0) + (gstBreakdown.roomDiscount || 0)).toLocaleString()}</span>
                          <span className="text-red-600">Discount: -₹{(gstBreakdown.roomDiscount || 0).toLocaleString()}</span>
                        </div>
                      )}
                      {gstBreakdown && (
                        <div className="flex justify-between">
                          <span>Base (after discount): ₹{(gstBreakdown.roomBaseAfterDiscount || ((form.watch('roomQuotationTotal') || 0) - gstBreakdown.roomGST)).toLocaleString()}</span>
                          <span>GST: ₹{gstBreakdown.roomGST.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Menu Total:</span>
                    <span className="font-medium">₹{form.watch('menuTotal')?.toLocaleString() || '0'}</span>
                  </div>
                  {(discountValue > 0 || (includeGST && gstBreakdown)) && (
                    <div className="text-xs text-muted-foreground pl-4 space-y-1">
                      {discountValue > 0 && gstBreakdown?.menuDiscount !== undefined && (
                        <div className="flex justify-between">
                          <span>Base: ₹{((gstBreakdown.menuBaseAfterDiscount || 0) + (gstBreakdown.menuDiscount || 0)).toLocaleString()}</span>
                          <span className="text-red-600">Discount: -₹{(gstBreakdown.menuDiscount || 0).toLocaleString()}</span>
                        </div>
                      )}
                      {gstBreakdown && (
                        <div className="flex justify-between">
                          <span>Base (after discount): ₹{(gstBreakdown.menuBaseAfterDiscount || ((form.watch('menuTotal') || 0) - gstBreakdown.menuGST)).toLocaleString()}</span>
                          <span>GST (18%): ₹{gstBreakdown.menuGST.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {includeGST && gstBreakdown && (
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal (After Discount, Before GST):</span>
                        <span className="font-medium">₹{gstBreakdown.baseTotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total GST:</span>
                        <span className="font-medium text-green-600">₹{gstBreakdown.totalGST.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                  {discountValue > 0 && (
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Subtotal (Before Discount):</span>
                        <span>₹{baseTotalBeforeDiscount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Discount ({discountValue}%):</span>
                        <span className="text-red-600">-₹{(form.watch('discountAmount') || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Subtotal (After Discount):</span>
                        <span>₹{(baseTotalBeforeDiscount - (form.watch('discountAmount') || 0)).toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                  <div className="border-t pt-3">
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Grand Total:</span>
                      <span className="text-blue-600">₹{form.watch('grandTotal')?.toLocaleString() || '0'}</span>
                    </div>
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
              grandTotal={baseTotalBeforeDiscount}
              onDiscountApplied={(discountData) => {
                form.setValue('discountType', discountData.discountType);
                form.setValue('discountValue', discountData.discountValue);
                form.setValue('discountAmount', discountData.discountAmount);
                form.setValue('discountReason', discountData.discountReason);
                form.setValue('discountExceedsLimit', discountData.discountExceedsLimit);
                // finalTotal will be calculated in the useEffect
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
                {isSubmitting ? "Saving..." : editingQuotation ? "Create New Version" : "Create Quotation"}
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

      {/* Save Package Dialog */}
      <Dialog open={showSavePackageDialog} onOpenChange={setShowSavePackageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Quotation as Package</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="package-name">Package Name *</Label>
              <Input
                id="package-name"
                placeholder="e.g., Wedding Package - Standard"
                value={packageName}
                onChange={(e) => setPackageName(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="package-description">Description (Optional)</Label>
              <Textarea
                id="package-description"
                placeholder="Optional description for this package"
                value={packageDescription}
                onChange={(e) => setPackageDescription(e.target.value)}
                className="mt-2"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowSavePackageDialog(false);
                  setPackageName("");
                  setPackageDescription("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveAsPackage}
                disabled={savePackageMutation.isPending || !packageName.trim()}
              >
                {savePackageMutation.isPending ? "Saving..." : "Save Package"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
