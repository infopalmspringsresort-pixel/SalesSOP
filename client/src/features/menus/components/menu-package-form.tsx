import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
import { insertMenuPackageSchema } from "@shared/schema-client";
import { z } from "zod";
import type { MenuPackage, MenuItem } from "@shared/schema-client";

const formSchema = insertMenuPackageSchema;

interface MenuPackageFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPackage?: MenuPackage | null;
}

export default function MenuPackageForm({ open, onOpenChange, editingPackage }: MenuPackageFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch menu items for price calculation
  const { data: menuItems = [] } = useQuery<MenuItem[]>({
    queryKey: ["/api/menus/items"],
    enabled: open,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "veg",
      description: "",
    },
  });

  // Reset form when editingPackage changes
  useEffect(() => {
    if (editingPackage) {
      form.reset({
        name: editingPackage.name,
        type: editingPackage.type,
        description: editingPackage.description || "",
      });
    } else {
      form.reset({
        name: "",
        type: "veg",
        description: "",
      });
    }
  }, [editingPackage, form]);

  // Calculate price based on menu items for this package
  const calculatePackagePrice = (packageId: string) => {
    const packageItems = menuItems.filter(item => item.packageId === packageId);
    const totalPrice = packageItems.reduce((sum, item) => {
      return sum + (item.price || 0); // Use item.price instead of additionalPrice
    }, 0);
    return totalPrice;
  };

  // Auto-calculate and update price when editing a package or when menu items change
  useEffect(() => {
    if (editingPackage && menuItems.length > 0) {
      const calculatedPrice = calculatePackagePrice(editingPackage.id!);
      form.setValue('price', calculatedPrice, { shouldValidate: true });
    }
  }, [editingPackage, menuItems, form]);

  const createPackageMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const response = await apiRequest("POST", "/api/menus/packages", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create package");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menus/packages"] });
      toast({ title: "Success", description: "Menu package created successfully" });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create menu package", 
        variant: "destructive" 
      });
    },
  });

  const updatePackageMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const response = await apiRequest("PATCH", `/api/menus/packages/${editingPackage!.id}`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update package");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menus/packages"] });
      toast({ title: "Success", description: "Menu package updated successfully" });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update menu package", 
        variant: "destructive" 
      });
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      // Calculate price from menu items for this package
      let calculatedPrice = 0;
      if (editingPackage) {
        calculatedPrice = calculatePackagePrice(editingPackage.id!);
      }
      
      const formData = {
        ...data,
        price: calculatedPrice, // Set calculated price
      };
      
      if (editingPackage) {
        await updatePackageMutation.mutateAsync(formData);
      } else {
        await createPackageMutation.mutateAsync(formData);
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
            {editingPackage ? "Edit Menu Package" : "Create Menu Package"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              {/* Package Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Package Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Royal, Platinum, Diamond" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Package Type */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Package Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select package type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="veg">Vegetarian</SelectItem>
                        <SelectItem value="non-veg">Non-Vegetarian</SelectItem>
                      </SelectContent>
                    </Select>
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
                      placeholder="Optional description of the package..."
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
                {isSubmitting ? "Saving..." : editingPackage ? "Update Package" : "Create Package"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


