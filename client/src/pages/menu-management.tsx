import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Package, Utensils, PlusCircle, Menu, ChartLine, Mail, FileText, Calendar, BarChart3, Building, Calculator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import MenuPackageForm from "@/features/menus/components/menu-package-form";
import MenuItemForm from "@/features/menus/components/menu-item-form";
import AdditionalItemForm from "@/features/menus/components/additional-item-form";
import Sidebar from "@/components/sidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Link } from "wouter";
import type { MenuPackage, MenuItem, AdditionalItem } from "@shared/schema-client";

export default function MenuManagement() {
  const [activeTab, setActiveTab] = useState("packages");
  const [showPackageForm, setShowPackageForm] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [showAdditionalItemForm, setShowAdditionalItemForm] = useState(false);
  const [editingPackage, setEditingPackage] = useState<MenuPackage | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editingAdditionalItem, setEditingAdditionalItem] = useState<AdditionalItem | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch menu packages
  const { data: packages = [], isLoading: packagesLoading } = useQuery<MenuPackage[]>({
    queryKey: ["/api/menus/packages"],
  });

  // Fetch menu items
  const { data: items = [], isLoading: itemsLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menus/items"],
  });

  // Fetch additional items
  const { data: additionalItems = [], isLoading: additionalItemsLoading } = useQuery<AdditionalItem[]>({
    queryKey: ["/api/menus/additional-items"],
  });

  // Delete package mutation
  const deletePackageMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/menus/packages/${id}`);
      if (!response.ok) throw new Error("Failed to delete package");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menus/packages"] });
      toast({ title: "Success", description: "Menu package deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete menu package", variant: "destructive" });
    },
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/menus/items/${id}`);
      if (!response.ok) throw new Error("Failed to delete item");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menus/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/menus/packages"] }); // Refresh packages to show updated prices
      toast({ title: "Success", description: "Menu item deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete menu item", variant: "destructive" });
    },
  });

  // Delete additional item mutation
  const deleteAdditionalItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/menus/additional-items/${id}`);
      if (!response.ok) throw new Error("Failed to delete additional item");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menus/additional-items"] });
      toast({ title: "Success", description: "Additional item deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete additional item", variant: "destructive" });
    },
  });


  const handleEditPackage = (pkg: MenuPackage) => {
    setEditingPackage(pkg);
    setShowPackageForm(true);
  };

  const handleEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setShowItemForm(true);
  };

  const handleEditAdditionalItem = (item: AdditionalItem) => {
    setEditingAdditionalItem(item);
    setShowAdditionalItemForm(true);
  };

  const handleCloseForms = () => {
    setShowPackageForm(false);
    setShowItemForm(false);
    setShowAdditionalItemForm(false);
    setEditingPackage(null);
    setEditingItem(null);
    setEditingAdditionalItem(null);
  };

  // Group items by package
  const itemsByPackage = items.reduce((acc, item) => {
    if (!acc[item.packageId]) {
      acc[item.packageId] = [];
    }
    acc[item.packageId].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto lg:ml-0 ml-0 h-screen touch-pan-y" style={{ paddingTop: '0' }}>
        <header className="bg-card border-b border-border px-4 lg:px-6 py-3 lg:py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <Sheet>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="lg:hidden min-h-[44px] min-w-[44px] touch-manipulation"
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <div className="flex flex-col h-full">
                  <div className="p-4 border-b border-border">
                    <h1 className="text-xl font-bold text-foreground">SOP Manager</h1>
                  </div>
                  <nav className="flex-1 p-4">
                    <div className="space-y-2">
                      <Link href="/">
                        <Button variant="ghost" className="w-full justify-start">
                          <ChartLine className="mr-2 h-4 w-4" />
                          Dashboard
                        </Button>
                      </Link>
                      <Link href="/enquiries">
                        <Button variant="ghost" className="w-full justify-start">
                          <Mail className="mr-2 h-4 w-4" />
                          Enquiries
                        </Button>
                      </Link>
                      <Link href="/bookings">
                        <Button variant="ghost" className="w-full justify-start">
                          <FileText className="mr-2 h-4 w-4" />
                          Bookings
                        </Button>
                      </Link>
                      <Link href="/calendar">
                        <Button variant="ghost" className="w-full justify-start">
                          <Calendar className="mr-2 h-4 w-4" />
                          Calendar
                        </Button>
                      </Link>
                      <Link href="/reports">
                        <Button variant="ghost" className="w-full justify-start">
                          <BarChart3 className="mr-2 h-4 w-4" />
                          Reports
                        </Button>
                      </Link>
                      <Link href="/menu-management">
                        <Button variant="default" className="w-full justify-start">
                          <Utensils className="mr-2 h-4 w-4" />
                          Menu Management
                        </Button>
                      </Link>
                      <Link href="/room-management">
                        <Button variant="ghost" className="w-full justify-start">
                          <Building className="mr-2 h-4 w-4" />
                          Room Management
                        </Button>
                      </Link>
                    </div>
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
            
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-foreground">Menu Management</h1>
                <p className="text-sm text-muted-foreground hidden lg:block">Manage menu packages, items, and additional options</p>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto p-6 space-y-6">

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="packages" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Menu Packages
          </TabsTrigger>
          <TabsTrigger value="items" className="flex items-center gap-2">
            <Utensils className="w-4 h-4" />
            Menu Items
          </TabsTrigger>
          <TabsTrigger value="additional" className="flex items-center gap-2">
            <PlusCircle className="w-4 h-4" />
            Additional Items
          </TabsTrigger>
        </TabsList>

        {/* Menu Packages Tab */}
        <TabsContent value="packages" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Menu Packages</h2>
            <Button onClick={() => setShowPackageForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Package
            </Button>
          </div>

          {packagesLoading ? (
            <div className="text-center py-8">Loading packages...</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {packages.map((pkg) => (
                <Card key={pkg.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{pkg.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          {/* Veg/Non-Veg symbol (FSSAI-style) */}
                          <span className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs ${pkg.type === 'veg' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                            <span className={`inline-flex items-center justify-center w-4 h-4 ${pkg.type === 'veg' ? 'border-green-700' : 'border-red-700'} border rounded-sm`}>
                              <span className={`${pkg.type === 'veg' ? 'bg-green-700' : 'bg-red-700'} w-2 h-2 rounded-full`} />
                            </span>
                            {pkg.type === 'veg' ? 'Vegetarian' : 'Non-Vegetarian'}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditPackage(pkg)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deletePackageMutation.mutate(pkg.id!)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Package Price:</span>
                        <span className="font-semibold">₹{pkg.price}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total Items:</span>
                        <span className="text-sm">{itemsByPackage[pkg.id!]?.length || 0}</span>
                      </div>
                      {itemsByPackage[pkg.id!]?.length > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Sum of Items:</span>
                          <span className="text-sm font-medium text-green-600">
                            ₹{itemsByPackage[pkg.id!].reduce((sum, item) => sum + (item.price || 0), 0)}
                          </span>
                        </div>
                      )}
                      {pkg.gstIncluded && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">GST ({pkg.gstRate}%):</span>
                          <span className="text-sm">Included</span>
                        </div>
                      )}
                      {pkg.description && (
                        <p className="text-sm text-muted-foreground mt-2">{pkg.description}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Menu Items Tab */}
        <TabsContent value="items" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Menu Items</h2>
            <Button onClick={() => setShowItemForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>

          {itemsLoading ? (
            <div className="text-center py-8">Loading items...</div>
          ) : (
            <div className="space-y-4">
              {packages.map((pkg) => {
                const packageItems = itemsByPackage[pkg.id!] || [];
                if (packageItems.length === 0) return null;

                return (
                  <Card key={pkg.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        {pkg.name} Package
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${pkg.type === 'veg' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                          <span className={`inline-flex items-center justify-center w-3.5 h-3.5 ${pkg.type === 'veg' ? 'border-green-700' : 'border-red-700'} border rounded-sm`}>
                            <span className={`${pkg.type === 'veg' ? 'bg-green-700' : 'bg-red-700'} w-1.5 h-1.5 rounded-full`} />
                          </span>
                          {pkg.type === 'veg' ? 'Veg' : 'Non-Veg'}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {packageItems.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{item.name}</h4>
                                {item.isVeg !== undefined && (
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${item.isVeg ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                                    <span className={`inline-flex items-center justify-center w-3.5 h-3.5 ${item.isVeg ? 'border-green-700' : 'border-red-700'} border rounded-sm`}>
                                      <span className={`${item.isVeg ? 'bg-green-700' : 'bg-red-700'} w-1.5 h-1.5 rounded-full`} />
                                    </span>
                                    {item.isVeg ? 'Veg' : 'Non-Veg'}
                                  </span>
                                )}
                                <Badge variant="outline" className="text-xs">
                                  {item.category}
                                </Badge>
                                {item.quantity > 1 && (
                                  <Badge variant="secondary" className="text-xs">
                                    Qty: {item.quantity}
                                  </Badge>
                                )}
                                <Badge variant="default" className="text-xs bg-green-600">
                                  ₹{item.price || 0}
                                </Badge>
                              </div>
                              {item.description && (
                                <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditItem(item)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteItemMutation.mutate(item.id!)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Additional Items Tab */}
        <TabsContent value="additional" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Additional Items</h2>
            <Button onClick={() => setShowAdditionalItemForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>

          {additionalItemsLoading ? (
            <div className="text-center py-8">Loading additional items...</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {additionalItems.map((item) => (
                <Card key={item.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{item.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {item.category}
                          </Badge>
                          {item.isVeg !== undefined && (
                            <span className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs ${item.isVeg ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                              <span className={`inline-flex items-center justify-center w-4 h-4 ${item.isVeg ? 'border-green-700' : 'border-red-700'} border rounded-sm`}>
                                <span className={`${item.isVeg ? 'bg-green-700' : 'bg-red-700'} w-2 h-2 rounded-full`} />
                              </span>
                              {item.isVeg ? 'Veg' : 'Non-Veg'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditAdditionalItem(item)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteAdditionalItemMutation.mutate(item.id!)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Price per person:</span>
                        <span className="font-semibold">₹{item.price}</span>
                      </div>
                      {item.description && (
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Forms */}
      <MenuPackageForm
        open={showPackageForm}
        onOpenChange={handleCloseForms}
        editingPackage={editingPackage}
      />

      <MenuItemForm
        open={showItemForm}
        onOpenChange={handleCloseForms}
        editingItem={editingItem}
        packages={packages}
      />

      <AdditionalItemForm
        open={showAdditionalItemForm}
        onOpenChange={handleCloseForms}
        editingItem={editingAdditionalItem}
      />
        </div>
      </main>
    </div>
  );
}
