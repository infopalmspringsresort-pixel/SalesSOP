import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertVenueSchema } from "@shared/schema-client";
import { z } from "zod";
import type { Venue } from "@shared/schema-client";

const formSchema = insertVenueSchema;

interface VenueFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingVenue?: Venue | null;
}


export default function VenueForm({ open, onOpenChange, editingVenue }: VenueFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      area: 0,
      minGuests: 0,
      maxGuests: undefined,
      hiringCharges: 0,
      currency: "INR",
      description: "",
    },
  });

  // Reset form when editingVenue changes
  useEffect(() => {
    if (editingVenue) {
      const formData = {
        name: editingVenue.name,
        area: editingVenue.area,
        minGuests: editingVenue.minGuests,
        maxGuests: editingVenue.maxGuests,
        hiringCharges: editingVenue.hiringCharges,
        currency: editingVenue.currency,
        description: editingVenue.description || "",
      };
      form.reset(formData);
    } else {
      form.reset({
        name: "",
        area: 0,
        minGuests: 0,
        maxGuests: undefined,
        hiringCharges: 0,
        currency: "INR",
        description: "",
      });
    }
  }, [editingVenue, form]);

  const createVenueMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const response = await apiRequest("POST", "/api/rooms/venues", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create venue");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms/venues"] });
      toast({ title: "Success", description: "Venue created successfully" });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create venue", 
        variant: "destructive" 
      });
    },
  });

  const updateVenueMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const response = await apiRequest("PATCH", `/api/rooms/venues/${editingVenue!.id}`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update venue");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms/venues"] });
      toast({ title: "Success", description: "Venue updated successfully" });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update venue", 
        variant: "destructive" 
      });
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const formData = {
        ...data,
      };
      
      if (editingVenue) {
        await updateVenueMutation.mutateAsync(formData);
      } else {
        await createVenueMutation.mutateAsync(formData);
      }
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingVenue ? "Edit Venue" : "Create Venue"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Venue Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Venue Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Oasis The Lawns, Areca The Banquet" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Area */}
              <FormField
                control={form.control}
                name="area"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Area (sq ft) *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Min Guests */}
              <FormField
                control={form.control}
                name="minGuests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Guests *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Max Guests */}
              <FormField
                control={form.control}
                name="maxGuests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maximum Guests</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Optional" 
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Hiring Charges */}
              <FormField
                control={form.control}
                name="hiringCharges"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hiring Charges (₹) *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </div>


            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Optional description of the venue..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : editingVenue ? "Update Venue" : "Create Venue"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

