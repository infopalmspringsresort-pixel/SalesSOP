import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertQuotationPackageSchema } from "@shared/schema-client";
import { z } from "zod";
import type { QuotationPackage, Venue, MenuPackage } from "@shared/schema-client";
import { Plus, Trash2, X, Building, Utensils, MapPin, Calculator } from "lucide-react";
import MenuItemEditor from "./menu-item-editor";
import MenuSelectionFlow from "./menu-selection-flow";
import { useMemo } from "react";

const formSchema = insertQuotationPackageSchema;

interface QuotationPackageFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPackage?: QuotationPackage | null;
}

export default function QuotationPackageForm({ 
  open, 
  onOpenChange, 
  editingPackage 
}: QuotationPackageFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMenuPackages, setSelectedMenuPackages] = useState<string[]>([]);
  const [showMenuItemEditor, setShowMenuItemEditor] = useState(false);
  const [editingMenuPackage, setEditingMenuPackage] = useState<MenuPackage | null>(null);
  const [customMenuItems, setCustomMenuItems] = useState<Record<string, any>>({});
  const [showMenuSelectionFlow, setShowMenuSelectionFlow] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch venues, room types, and menu packages
  const { data: venues = [] } = useQuery<Venue[]>({
    queryKey: ["/api/rooms/venues"],
  });

  const { data: roomTypes = [] } = useQuery<any[]>({
    queryKey: ["/api/rooms/types"],
  });

  const { data: menuPackages = [] } = useQuery<MenuPackage[]>({
    queryKey: ["/api/menus/packages"],
  });

  const { data: menuItems = [] } = useQuery<any[]>({
    queryKey: ["/api/menus/items"],
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      venueRentalItems: [],
      roomPackages: [],
      menuPackages: [],
      includeGST: false,
      defaultDiscountType: undefined,
      defaultDiscountValue: 0,
      checkInTime: "14:00",
      checkOutTime: "11:00",
      isActive: true,
    },
  });

  const { fields: venueFields, append: appendVenue, remove: removeVenue } = useFieldArray({
    control: form.control,
    name: "venueRentalItems",
  });

  const { fields: roomFields, append: appendRoom, remove: removeRoom } = useFieldArray({
    control: form.control,
    name: "roomPackages",
  });

  // Reset form when editingPackage changes
  useEffect(() => {
    if (editingPackage) {
      form.reset({
        name: editingPackage.name || "",
        description: editingPackage.description || "",
        venueRentalItems: editingPackage.venueRentalItems || [],
        roomPackages: editingPackage.roomPackages || [],
        menuPackages: editingPackage.menuPackages || [],
        includeGST: editingPackage.includeGST ?? false,
        defaultDiscountType: editingPackage.defaultDiscountType,
        defaultDiscountValue: editingPackage.defaultDiscountValue || 0,
        checkInTime: editingPackage.checkInTime || "14:00",
        checkOutTime: editingPackage.checkOutTime || "11:00",
        isActive: editingPackage.isActive ?? true,
      });

      // Load menu packages
      if (editingPackage.menuPackages && editingPackage.menuPackages.length > 0) {
        const packageIds = editingPackage.menuPackages.map(p => p.id).filter(Boolean) as string[];
        setSelectedMenuPackages(packageIds);
        
        // Set custom menu items if any
        const menuItemsMap: Record<string, any> = {};
        editingPackage.menuPackages.forEach(pkg => {
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
    } else {
      form.reset({
        name: "",
        description: "",
        venueRentalItems: [],
        roomPackages: [],
        menuPackages: [],
        includeGST: false,
        defaultDiscountType: undefined,
        defaultDiscountValue: 0,
        checkInTime: "14:00",
        checkOutTime: "11:00",
        isActive: true,
      });
      setSelectedMenuPackages([]);
      setCustomMenuItems({});
      setShowMenuItemEditor(false);
      setShowMenuSelectionFlow(false);
    }
  }, [editingPackage, form, open]);

  const createPackageMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      // Prepare menu packages data
      const menuPackagesData = selectedMenuPackages.map(packageId => {
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
      });

      const packageData = {
        ...data,
        menuPackages: menuPackagesData,
      };

      const response = await apiRequest("POST", "/api/quotations/packages", packageData);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create package");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotations/packages"] });
      toast({ title: "Success", description: "Quotation package created successfully" });
      onOpenChange(false);
      form.reset();
      setSelectedMenuPackages([]);
      setCustomMenuItems({});
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create quotation package", 
        variant: "destructive" 
      });
    },
  });

  const updatePackageMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      // Prepare menu packages data
      const menuPackagesData = selectedMenuPackages.map(packageId => {
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
      });

      const packageData = {
        ...data,
        menuPackages: menuPackagesData,
      };

      const response = await apiRequest("PATCH", `/api/quotations/packages/${editingPackage!.id}`, packageData);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update package");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotations/packages"] });
      toast({ title: "Success", description: "Quotation package updated successfully" });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update quotation package", 
        variant: "destructive" 
      });
    },
  });

  // Calculate totals (without GST for packages)
  const venueRentalItems = form.watch("venueRentalItems");
  const roomPackages = form.watch("roomPackages");

  const totals = useMemo(() => {
    const venues = venueRentalItems || [];
    const rooms = roomPackages || [];

    // Calculate venue subtotal
    let venueSubtotal = 0;
    venues.forEach(item => {
      const rate = Number(item.sessionRate) || 0;
      venueSubtotal += rate;
    });
    
    // Calculate room subtotal
    let roomSubtotal = 0;
    rooms.forEach(room => {
      const rate = Number(room.rate) || 0;
      const roomCount = Number(room.numberOfRooms) || 1;
      roomSubtotal += (rate * roomCount);
    });
    
    // Calculate menu subtotal
    let menuSubtotal = 0;
    selectedMenuPackages.forEach(packageId => {
      const selectedPackage = menuPackages.find(pkg => pkg.id === packageId);
      const customData = customMenuItems[packageId];
      
      if (selectedPackage) {
        const selectedPackageItemsPrice = customData?.selectedItems?.reduce((sum: number, item: any) => {
          return sum + (item.isPackageItem ? (item.price || 0) : 0);
        }, 0) || selectedPackage.price;
        
        const additionalPrice = customData?.selectedItems?.reduce((sum: number, item: any) => {
          return sum + (!item.isPackageItem ? (item.additionalPrice || 0) : 0);
        }, 0) || 0;
        
        menuSubtotal += (selectedPackageItemsPrice + additionalPrice);
      }
    });

    const grandTotal = venueSubtotal + roomSubtotal + menuSubtotal;

    return {
      venueSubtotal: Math.round(venueSubtotal * 100) / 100,
      roomSubtotal: Math.round(roomSubtotal * 100) / 100,
      menuSubtotal: Math.round(menuSubtotal * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
    };
  }, [venueRentalItems, roomPackages, selectedMenuPackages, menuPackages, customMenuItems]);

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    console.log('🚀 Form submission - data:', data);
    console.log('🚀 Form errors:', form.formState.errors);
    
    // Check for validation errors
    const isValid = await form.trigger();
    if (!isValid) {
      console.log('❌ Form validation failed:', form.formState.errors);
      
      // Get first error message for display
      const errors = form.formState.errors;
      let errorMessage = "Please fill in all required fields";
      
      if (errors.name) {
        errorMessage = errors.name.message || "Package name is required";
      } else if (errors.venueRentalItems) {
        errorMessage = "Please complete all venue rental fields";
      } else if (errors.roomPackages) {
        errorMessage = "Please complete all room package fields";
      }
      
      toast({
        title: "Validation Error",
        description: errorMessage,
        variant: "destructive"
      });
      setIsSubmitting(false);
      return;
    }
    
    setIsSubmitting(true);
    try {
      if (editingPackage) {
        await updatePackageMutation.mutateAsync(data);
      } else {
        await createPackageMutation.mutateAsync(data);
      }
    } catch (error: any) {
      console.error('❌ Submission error:', error);
      // Error handling is done in mutation, but also log here
      if (error.message) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const addVenueItem = () => {
    appendVenue({
      eventDate: "", // Optional for packages - will be filled when package is used
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
    if (editingMenuPackage) {
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
    setSelectedMenuPackages([selectedPackage]);
    setCustomMenuItems({ [selectedPackage]: customMenuItems });
    setShowMenuSelectionFlow(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingPackage ? "Edit Quotation Package" : "Create Quotation Package"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Package Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Package Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Package Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Wedding Package - Standard" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Optional description for this package" 
                          {...field} 
                          rows={2}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Package is active</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Menu Package Selection - Same as quotation form */}
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
                    Select a menu package and customize items for this quotation package
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
                      📋 Menu Package Configuration
                    </h4>
                    {selectedMenuPackages.map(packageId => {
                      const selectedPackage = menuPackages.find(pkg => pkg.id === packageId);
                      const customData = customMenuItems[packageId];
                      
                      if (!selectedPackage) return null;
                      
                      const selectedPackageItemsPrice = customData?.selectedItems?.reduce((sum: number, item: any) => {
                        return sum + (item.isPackageItem ? (item.price || 0) : 0);
                      }, 0) || selectedPackage.price;
                      
                      const additionalPrice = customData?.selectedItems?.reduce((sum: number, item: any) => {
                        return sum + (!item.isPackageItem ? (item.additionalPrice || 0) : 0);
                      }, 0) || 0;
                      
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
                          <div className="flex items-center gap-4 text-sm text-green-700">
                            <span className="ml-2 font-medium">₹{selectedPackage.price}</span>
                            {packageItemsCount > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {packageItemsCount} package items
                              </Badge>
                            )}
                            {additionalItemsCount > 0 && (
                              <Badge variant="outline" className="text-xs">
                                +{additionalItemsCount} additional items
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Venue Rental Package - Same structure as quotation form */}
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
              </CardContent>
            </Card>

            {/* Room Quotation - Same structure as quotation form */}
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
                                          
                                          const defaultOccupancy = form.getValues(`roomPackages.${index}.defaultOccupancy`) || 2;
                                          const maxOccupancy = form.getValues(`roomPackages.${index}.maxOccupancy`) || 2;
                                          const currentTotalOccupancy = form.getValues(`roomPackages.${index}.totalOccupancy`);
                                          
                                          if (!isNaN(numValue) && numValue > 0) {
                                            const newDefaultTotal = defaultOccupancy * numValue;
                                            if (!currentTotalOccupancy || currentTotalOccupancy < newDefaultTotal) {
                                              form.setValue(`roomPackages.${index}.totalOccupancy`, newDefaultTotal, { shouldValidate: false, shouldDirty: false });
                                            } else {
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
                                
                                return (
                                  <FormItem className="flex flex-col">
                                    <FormLabel className="mb-2">Total Occupancy *</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        min={defaultOccupancy * numberOfRooms}
                                        max={maxTotalOccupancy}
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
                                    <div className="text-xs text-muted-foreground mt-1">
                                      Default: {defaultOccupancy * numberOfRooms} | Max: {maxTotalOccupancy}
                                    </div>
                                  </FormItem>
                                );
                              }}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pricing Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Pricing Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Venue Rental:</span>
                    <span className="font-medium">₹{totals.venueSubtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Room Quotation:</span>
                    <span className="font-medium">₹{totals.roomSubtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Menu Total:</span>
                    <span className="font-medium">₹{totals.menuSubtotal.toLocaleString()}</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Grand Total:</span>
                      <span className="text-blue-600">₹{(totals.venueSubtotal + totals.roomSubtotal + totals.menuSubtotal).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Saving..."
                  : editingPackage
                  ? "Update Package"
                  : "Create Package"}
              </Button>
            </div>
          </form>
        </Form>

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
      </DialogContent>
    </Dialog>
  );
}
