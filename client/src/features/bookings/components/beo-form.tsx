import { useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertBeoSchema } from "@shared/schema-client";
import { z } from "zod";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Plus, Minus } from "lucide-react";

const formSchema = insertBeoSchema.extend({
  menuItems: z.string().optional(),
  bookingId: z.string().min(1, "Please select a booking"),
  eventName: z.string().min(1, "Event name is required"),
  eventDate: z.string().min(1, "Event date is required").refine(
    (date) => {
      const eventDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return eventDate >= today;
    },
    { message: "Event date cannot be in the past" }
  ),
  eventStartTime: z.string().min(1, "Event start time is required").refine(
    (time) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time),
    { message: "Start time must be in HH:MM format (24-hour)" }
  ),
  eventEndTime: z.string().min(1, "Event end time is required").refine(
    (time) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time),
    { message: "End time must be in HH:MM format (24-hour)" }
  ),
  guestCount: z.number().min(1, "Guest count must be at least 1"),
  specialInstructions: z.string().optional(),
}).refine(
  (data) => {
    if (data.eventStartTime && data.eventEndTime) {
      const startTime = new Date(`2000-01-01T${data.eventStartTime}`);
      const endTime = new Date(`2000-01-01T${data.eventEndTime}`);
      return endTime > startTime;
    }
    return true;
  },
  {
    message: "Event end time must be after start time",
    path: ["eventEndTime"]
  }
);

interface BeoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId?: string;
}

interface MenuItem {
  category: string;
  item: string;
  quantity: number;
  notes?: string;
}

export default function BeoForm({ open, onOpenChange, bookingId }: BeoFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([
    { category: "appetizers", item: "", quantity: 1, notes: "" }
  ]);

  // Validate menu items
  const validateMenuItems = (items: MenuItem[]): string[] => {
    const errors: string[] = [];
    
    if (items.length === 0) {
      errors.push("At least one menu item is required");
      return errors;
    }

    items.forEach((item, index) => {
      if (!item.category.trim()) {
        errors.push(`Menu item ${index + 1}: Category is required`);
      }
      if (!item.item.trim()) {
        errors.push(`Menu item ${index + 1}: Item name is required`);
      }
      if (item.quantity < 1) {
        errors.push(`Menu item ${index + 1}: Quantity must be at least 1`);
      }
    });

    return errors;
  };

  const { data: bookings = [] } = useQuery<any[]>({
    queryKey: ["/api/bookings"],
    enabled: open,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bookingId: bookingId || "",
      eventName: "",
      eventDate: "",
      eventStartTime: "",
      eventEndTime: "",
      guestCount: 1,
      specialInstructions: "",
      menuItems: "",
    },
  });

  const createBeoMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      // Validate menu items before submission
      const menuErrors = validateMenuItems(menuItems);
      if (menuErrors.length > 0) {
        throw new Error(menuErrors.join(', '));
      }

      const response = await apiRequest("POST", "/api/beos", {
        ...data,
        menuItems: JSON.stringify(menuItems),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "BEO created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      form.reset();
      setMenuItems([{ category: "appetizers", item: "", quantity: 1, notes: "" }]);
      onOpenChange(false);
    },
    onError: (error) => {
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
      toast({
        title: "Error",
        description: "Failed to create BEO",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createBeoMutation.mutate(data);
  };

  const addMenuItem = () => {
    setMenuItems([...menuItems, { category: "appetizers", item: "", quantity: 1, notes: "" }]);
  };

  const removeMenuItem = (index: number) => {
    if (menuItems.length > 1) {
      setMenuItems(menuItems.filter((_, i) => i !== index));
    }
  };

  const updateMenuItem = (index: number, field: keyof MenuItem, value: string | number) => {
    const updated = [...menuItems];
    updated[index] = { ...updated[index], [field]: value };
    setMenuItems(updated);
  };

  const selectedBooking = bookings.find((b: any) => b.id === form.watch("bookingId"));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Banquet Event Order (BEO)</DialogTitle>
          <DialogDescription>
            Detailed instructions for executing the event exactly as planned
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Booking Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Booking Information</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="bookingId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Booking *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger data-testid="select-booking">
                            <SelectValue placeholder="Choose confirmed booking" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {bookings
                            .filter((b: any) => b.status === 'confirmed' && b.contractSigned)
                            .map((booking: any) => (
                            <SelectItem key={booking.id} value={booking.id}>
                              {booking.bookingNumber} - {booking.clientName} ({new Date(booking.eventDate).toLocaleDateString()})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedBooking && (
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Booking Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Client:</span>
                        <div className="font-medium">{selectedBooking.clientName}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Event Date:</span>
                        <div className="font-medium">{new Date(selectedBooking.eventDate).toLocaleDateString()}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Pax:</span>
                        <div className="font-medium">{selectedBooking.confirmedPax}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Event Type:</span>
                        <div className="font-medium capitalize">{selectedBooking.eventType}</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Menu Planning */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Menu Planning</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addMenuItem} data-testid="button-add-menu-item">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {menuItems.map((item, index) => (
                    <div key={index} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">Item {index + 1}</Badge>
                        {menuItems.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMenuItem(index)}
                            data-testid={`button-remove-menu-item-${index}`}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                          <Label htmlFor={`category-${index}`}>Category</Label>
                          <Select
                            value={item.category}
                            onValueChange={(value) => updateMenuItem(index, 'category', value)}
                          >
                            <SelectTrigger data-testid={`select-category-${index}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="appetizers">Appetizers</SelectItem>
                              <SelectItem value="main_course">Main Course</SelectItem>
                              <SelectItem value="desserts">Desserts</SelectItem>
                              <SelectItem value="beverages">Beverages</SelectItem>
                              <SelectItem value="snacks">Snacks</SelectItem>
                              <SelectItem value="breakfast">Breakfast</SelectItem>
                              <SelectItem value="lunch">Lunch</SelectItem>
                              <SelectItem value="dinner">Dinner</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor={`item-${index}`}>Item Name</Label>
                          <Input
                            id={`item-${index}`}
                            placeholder="Menu item name"
                            value={item.item}
                            onChange={(e) => updateMenuItem(index, 'item', e.target.value)}
                            data-testid={`input-menu-item-${index}`}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`quantity-${index}`}>Quantity</Label>
                          <Input
                            id={`quantity-${index}`}
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateMenuItem(index, 'quantity', e.target.value ? parseInt(e.target.value) : "")}
                            data-testid={`input-quantity-${index}`}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`notes-${index}`}>Special Notes</Label>
                          <Input
                            id={`notes-${index}`}
                            placeholder="Dietary restrictions, etc."
                            value={item.notes}
                            onChange={(e) => updateMenuItem(index, 'notes', e.target.value)}
                            data-testid={`input-notes-${index}`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Service Requirements */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Service Requirements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="serviceRequirements"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Staff & Requirements</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Number of waiters, service style, timing requirements, etc."
                          rows={4}
                          {...field}
                          value={field.value || ""}
                          data-testid="textarea-service-requirements"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="avRequirements"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Audio/Visual Requirements</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Microphones, speakers, projectors, lighting, music requirements, etc."
                          rows={3}
                          {...field}
                          value={field.value || ""}
                          data-testid="textarea-av-requirements"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Setup Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Setup Instructions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="setupInstructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hall Setup & Decoration</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Table arrangements, seating layout, decorations, stage setup, etc."
                          rows={4}
                          {...field}
                          value={field.value || ""}
                          data-testid="textarea-setup-instructions"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="specialInstructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Special Instructions & Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any special requests, allergies, cultural requirements, timeline specifics, etc."
                          rows={4}
                          {...field}
                          value={field.value || ""}
                          data-testid="textarea-special-instructions"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Actions */}
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
                type="submit" 
                disabled={createBeoMutation.isPending}
                data-testid="button-save-beo"
              >
                {createBeoMutation.isPending ? "Creating..." : "Create BEO"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
