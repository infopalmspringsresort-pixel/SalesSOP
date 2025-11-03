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
import { insertMenuItemSchema } from "@shared/schema-client";
import { z } from "zod";
import type { MenuItem, MenuPackage } from "@shared/schema-client";

const formSchema = insertMenuItemSchema;

interface MenuItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem?: MenuItem | null;
  packages: MenuPackage[];
}

export default function MenuItemForm({ open, onOpenChange, editingItem, packages }: MenuItemFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedPackageType, setSelectedPackageType] = useState<'veg' | 'non-veg' | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      packageId: "",
      name: "",
      description: "",
      quantity: undefined,
      isVeg: true,
    },
  });

  // Reset form when editingItem changes
  useEffect(() => {
    if (editingItem) {
      form.reset({
        packageId: editingItem.packageId,
        name: editingItem.name,
        description: editingItem.description || "",
        quantity: editingItem.quantity,
        isVeg: editingItem.isVeg !== undefined ? editingItem.isVeg : true,
      });
    } else {
      form.reset({
        packageId: "",
        name: "",
        description: "",
        quantity: undefined,
        isVeg: true,
      });
    }
  }, [editingItem, form]);

  const createItemMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const response = await apiRequest("POST", "/api/menus/items", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create item");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menus/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/menus/packages"] });
      toast({ title: "Success", description: "Package item created successfully" });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create menu item", 
        variant: "destructive" 
      });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const response = await apiRequest("PATCH", `/api/menus/items/${editingItem!.id}`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update item");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menus/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/menus/packages"] });
      toast({ title: "Success", description: "Package item updated successfully" });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update menu item", 
        variant: "destructive" 
      });
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      if (editingItem) {
        await updateItemMutation.mutateAsync(data);
      } else {
        await createItemMutation.mutateAsync(data);
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
            {editingItem ? "Edit Package Item" : "Create Package Item"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Package Selection */}
              <FormField
                control={form.control}
                name="packageId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Package *</FormLabel>
                    <Select onValueChange={(val) => {
                      field.onChange(val);
                      const pkg = packages.find(p => p.id === val);
                      const type = (pkg?.type as 'veg' | 'non-veg') || null;
                      setSelectedPackageType(type);
                      if (type === 'veg') {
                        // Enforce veg-only when veg package selected
                        form.setValue('isVeg', true, { shouldValidate: true });
                      }
                    }} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a package" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {packages.map((pkg) => (
                          <SelectItem key={pkg.id} value={pkg.id!}>
                            {pkg.name} ({pkg.type === 'veg' ? 'Veg' : 'Non-Veg'})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Package Item Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Package Item Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Soup, Floating Starters, Welcome Drinks" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Quantity */}
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="1" 
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value === "" ? undefined : Number(value));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </div>

            {/* Veg/Non-Veg */}
            <FormField
              control={form.control}
              name="isVeg"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(val) => {
                          // If veg package selected, always force true
                          if (selectedPackageType === 'veg') {
                            form.setValue('isVeg', true, { shouldValidate: true });
                            return;
                          }
                          field.onChange(val);
                        }}
                        disabled={selectedPackageType === 'veg'}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Vegetarian Item
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        {selectedPackageType === 'veg' ? 'Veg package selected: item must be vegetarian' : 'Check if this is a vegetarian item'}
                      </p>
                    </div>
                  </FormItem>
                )}
              />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Optional description of the item..."
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
                {isSubmitting ? "Saving..." : editingItem ? "Update Package Item" : "Create Package Item"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

