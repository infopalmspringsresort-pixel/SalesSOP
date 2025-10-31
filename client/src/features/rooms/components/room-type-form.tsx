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
import { insertRoomTypeSchema } from "@shared/schema-client";
import { z } from "zod";
import type { RoomType } from "@shared/schema-client";

const formSchema = insertRoomTypeSchema;

interface RoomTypeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRoomType?: RoomType | null;
}



export default function RoomTypeForm({ open, onOpenChange, editingRoomType }: RoomTypeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      baseRate: 0,
      extraPersonRate: 0,
      currency: "INR",
      maxOccupancy: 2,
      defaultOccupancy: 2,
      description: "",
    },
  });

  // Reset form when editingRoomType changes
  useEffect(() => {
    if (editingRoomType) {
      const formData = {
        name: editingRoomType.name,
        baseRate: editingRoomType.baseRate,
        extraPersonRate: editingRoomType.extraPersonRate,
        currency: editingRoomType.currency,
        maxOccupancy: editingRoomType.maxOccupancy,
        defaultOccupancy: editingRoomType.defaultOccupancy,
        description: editingRoomType.description || "",
      };
      form.reset(formData);
    } else {
      form.reset({
        name: "",
        baseRate: 0,
        extraPersonRate: 0,
        currency: "INR",
        maxOccupancy: 2,
        defaultOccupancy: 2,
        description: "",
      });
    }
  }, [editingRoomType, form]);

  const createRoomTypeMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const response = await apiRequest("POST", "/api/rooms/types", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create room type");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms/types"] });
      toast({ title: "Success", description: "Room type created successfully" });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create room type", 
        variant: "destructive" 
      });
    },
  });

  const updateRoomTypeMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const response = await apiRequest("PATCH", `/api/rooms/types/${editingRoomType!.id}`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update room type");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms/types"] });
      toast({ title: "Success", description: "Room type updated successfully" });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update room type", 
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
      
      if (editingRoomType) {
        await updateRoomTypeMutation.mutateAsync(formData);
      } else {
        await createRoomTypeMutation.mutateAsync(formData);
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
            {editingRoomType ? "Edit Room Type" : "Create Room Type"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Room Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Room Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Deluxe Room, Executive Suite" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />


              {/* Base Rate */}
              <FormField
                control={form.control}
                name="baseRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Rate (₹) *</FormLabel>
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

              {/* Extra Person Rate */}
              <FormField
                control={form.control}
                name="extraPersonRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Extra Person Rate (₹) *</FormLabel>
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

              {/* Max Occupancy */}
              <FormField
                control={form.control}
                name="maxOccupancy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Occupancy *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="2" 
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Default Occupancy */}
              <FormField
                control={form.control}
                name="defaultOccupancy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Occupancy *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="2" 
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
                      placeholder="Optional description of the room type..."
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
                {isSubmitting ? "Saving..." : editingRoomType ? "Update Room Type" : "Create Room Type"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

