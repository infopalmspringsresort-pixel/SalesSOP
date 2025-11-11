import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Check, Utensils, Edit, ArrowRight, ArrowLeft } from "lucide-react";
import type { MenuPackage, MenuItem } from "@shared/schema-client";
import MenuItemEditor from "./menu-item-editor";

interface MenuSelectionFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (selectedPackages: string[], customMenuItems: Record<string, any>) => void;
  initialSelectedPackages?: string[];
  initialCustomMenuItems?: Record<string, any>;
}

type FlowStep = 'selection' | 'editing' | 'review';

export default function MenuSelectionFlow({ 
  open, 
  onOpenChange, 
  onSave,
  initialSelectedPackages = [],
  initialCustomMenuItems = {}
}: MenuSelectionFlowProps) {
  const [currentStep, setCurrentStep] = useState<FlowStep>('selection');
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [editingPackage, setEditingPackage] = useState<MenuPackage | null>(null);
  const [customMenuItems, setCustomMenuItems] = useState<any>({});
  const [showMenuItemEditor, setShowMenuItemEditor] = useState(false);
  
  // Fetch menu items to auto-initialize when package is selected
  const { data: packageItems = [] } = useQuery<MenuItem[]>({
    queryKey: ["/api/menus/items"],
    enabled: open,
  });
  const { toast } = useToast();

  // Fetch menu packages
  const { data: menuPackages = [], isLoading } = useQuery<MenuPackage[]>({
    queryKey: ["/api/menus/packages"],
    enabled: open,
  });

  // Reset state when dialog opens and sync with provided initial data
  useEffect(() => {
    if (!open) {
      return;
    }

    setCurrentStep('selection');
    setEditingPackage(null);
    setShowMenuItemEditor(false);

    if (initialSelectedPackages.length > 0) {
      setSelectedPackages(initialSelectedPackages);
    } else if (Object.keys(initialCustomMenuItems).length > 0) {
      setSelectedPackages(Object.keys(initialCustomMenuItems));
    } else {
      setSelectedPackages([]);
    }

    if (Object.keys(initialCustomMenuItems).length > 0) {
      setCustomMenuItems({ ...initialCustomMenuItems });
    } else {
      setCustomMenuItems({});
    }
  }, [open, initialSelectedPackages, initialCustomMenuItems]);

  const createDefaultPackageData = (packageId: string) => {
    const menuPackage = menuPackages.find(pkg => pkg.id === packageId);
    if (!menuPackage) {
      return null;
    }

    const filteredItems = packageItems.filter((item: any) => {
      const itemPackageId = typeof item.packageId === 'string' ? item.packageId : item.packageId?.toString();
      return itemPackageId === packageId;
    });

    const selectedItemsWithDetails = filteredItems.map((item: any) => {
      const quantity = (item.quantity !== undefined && item.quantity !== null) ? item.quantity : 1;
      return {
        id: item.id || item._id?.toString(),
        name: item.name,
        price: item.price || 0,
        additionalPrice: item.additionalPrice || 0,
        isPackageItem: true,
        quantity,
      };
    });

    return {
      selectedItems: selectedItemsWithDetails,
      customItems: [],
      totalPackageItems: filteredItems.length,
      excludedItemCount: 0,
      totalDeduction: 0,
      packageId,
      customPackagePrice: menuPackage.price || 0,
    };
  };

  // Auto-initialize package items when packageItems are loaded
  useEffect(() => {
    if (!open || packageItems.length === 0 || selectedPackages.length === 0) {
      return;
    }

    setCustomMenuItems(prev => {
      const updates: Record<string, any> = {};

      selectedPackages.forEach(packageId => {
        if (!prev[packageId]) {
          const defaultData = createDefaultPackageData(packageId);
          if (defaultData) {
            updates[packageId] = defaultData;
          }
        }
      });

      if (Object.keys(updates).length === 0) {
        return prev;
      }

      return {
        ...prev,
        ...updates,
      };
    });
  }, [open, selectedPackages, packageItems, menuPackages]);

  const handlePackageSelect = (packageId: string) => {
    setSelectedPackages(prev => {
      if (prev.includes(packageId)) {
        setCustomMenuItems(prevItems => {
          if (!prevItems[packageId]) {
            return prevItems;
          }
          const updatedItems = { ...prevItems };
          delete updatedItems[packageId];
          return updatedItems;
        });
        return prev.filter(id => id !== packageId);
      }

      return [...prev, packageId];
    });
  };

  const handleEditPackage = (menuPackage: MenuPackage) => {
    setEditingPackage(menuPackage);
    setShowMenuItemEditor(true);
  };

  const handleMenuItemsSave = (data: any) => {
    if (editingPackage) {
      setCustomMenuItems(prev => ({
        ...prev,
        [editingPackage.id!]: {
          selectedItems: data.selectedItems,
          customItems: data.customItems || [],
          totalPackageItems: data.totalPackageItems,
          excludedItemCount: data.excludedItemCount,
          totalDeduction: data.totalDeduction, // Total price of excluded items
          packageId: editingPackage.id,
          customPackagePrice: prev[editingPackage.id!]?.customPackagePrice ?? editingPackage.price ?? 0,
        }
      }));
    }
    setShowMenuItemEditor(false);
    setEditingPackage(null);
  };

  const handleNext = () => {
    if (currentStep === 'selection') {
      if (selectedPackages.length === 0) {
        toast({
          title: "No package selected",
          description: "Please select at least one menu package to continue.",
          variant: "destructive",
        });
        return;
      }

      if (packageItems.length > 0) {
        setCustomMenuItems(prev => {
          const updates: Record<string, any> = {};
          selectedPackages.forEach(packageId => {
            if (!prev[packageId]) {
              const defaultData = createDefaultPackageData(packageId);
              if (defaultData) {
                updates[packageId] = defaultData;
              }
            }
          });

          if (Object.keys(updates).length === 0) {
            return prev;
          }

          return {
            ...prev,
            ...updates,
          };
        });
      }

      setCurrentStep('editing');
    } else if (currentStep === 'editing') {
      setCurrentStep('review');
    }
  };

  const handlePrevious = () => {
    if (currentStep === 'editing') {
      setCurrentStep('selection');
    } else if (currentStep === 'review') {
      setCurrentStep('editing');
    }
  };

  const handlePackagePriceChange = (packageId: string, value: string) => {
    const parsedValue = parseFloat(value);
    const sanitizedValue = Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : 0;

    setCustomMenuItems(prev => ({
      ...prev,
      [packageId]: {
        ...prev[packageId],
        customPackagePrice: sanitizedValue,
      },
    }));
  };

  const handleSave = async () => {
    if (selectedPackages.length === 0) {
      toast({
        title: "No package selected",
        description: "Please select at least one menu package to save.",
        variant: "destructive",
      });
      return;
    }

    const preparedCustomMenuItems: Record<string, any> = {};

    for (const packageId of selectedPackages) {
      let packageData = customMenuItems[packageId];

      const sanitizeArrayField = (value: any) => {
        if (Array.isArray(value)) {
          return value;
        }
        if (value === undefined || value === null) {
          return [];
        }
        return [value];
      };

      if (!packageData || !Array.isArray(packageData.selectedItems) || packageData.selectedItems.length === 0) {
        const menuPackage = menuPackages.find(pkg => pkg.id === packageId);

        if (!menuPackage) {
          toast({
            title: "Error",
            description: "Menu package not found",
            variant: "destructive",
          });
          return;
        }

        const targetPackageId = typeof packageId === 'string' ? packageId : packageId?.toString();

        let filteredItems = packageItems.filter((item: any) => {
          const itemPackageId = typeof item.packageId === 'string' ? item.packageId : item.packageId?.toString();
          return itemPackageId === targetPackageId;
        });

        if (filteredItems.length === 0 && packageItems.length === 0) {
          try {
            const response = await fetch('/api/menus/items');
            if (response.ok) {
              const allItems = await response.json();
              filteredItems = allItems.filter((item: any) => {
                const itemPackageId = typeof item.packageId === 'string' ? item.packageId : item.packageId?.toString();
                return itemPackageId === targetPackageId;
              });
            }
          } catch (error) {
            console.error('Error fetching menu items:', error);
          }
        }

        if (filteredItems.length === 0) {
          toast({
            title: "Error",
            description: "No menu items found for the selected package. Please try again.",
            variant: "destructive",
          });
          return;
        }

        const selectedItemsWithDetails = filteredItems.map((item: any) => {
          const quantity = (item.quantity !== undefined && item.quantity !== null) ? item.quantity : 1;
          return {
            id: item.id || item._id?.toString(),
            name: item.name,
            price: item.price || 0,
            additionalPrice: item.additionalPrice || 0,
            isPackageItem: true,
            quantity,
          };
        });

        packageData = {
          selectedItems: selectedItemsWithDetails,
          customItems: [],
          totalPackageItems: filteredItems.length,
          excludedItemCount: 0,
          totalDeduction: 0,
          packageId,
          customPackagePrice: menuPackage?.price || 0,
        };
      }

      const menuPackage = menuPackages.find(pkg => pkg.id === packageId);
      const fallbackPrice = menuPackage?.price || 0;
      const currentPrice = packageData?.customPackagePrice;
      const sanitizedPrice = typeof currentPrice === 'number' && Number.isFinite(currentPrice)
        ? currentPrice
        : typeof currentPrice === 'string'
          ? parseFloat(currentPrice)
          : NaN;

      preparedCustomMenuItems[packageId] = {
        ...packageData,
        selectedItems: sanitizeArrayField(packageData.selectedItems),
        customItems: sanitizeArrayField(packageData.customItems),
        packageId,
        customPackagePrice: Number.isFinite(sanitizedPrice) && sanitizedPrice >= 0
          ? sanitizedPrice
          : fallbackPrice,
      };
    }

    setCustomMenuItems(preparedCustomMenuItems);
    onSave(selectedPackages, preparedCustomMenuItems);
    onOpenChange(false);
    toast({
      title: "Success",
      description: `Saved ${selectedPackages.length} menu package${selectedPackages.length > 1 ? "s" : ""} successfully`,
    });
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'selection':
        return 'Select Menu Packages';
      case 'editing':
        return 'Customize Menu Items';
      case 'review':
        return 'Review Menu Configuration';
      default:
        return 'Menu Selection';
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 'selection':
        return 'Choose the menu packages you want to include in this quotation.';
      case 'editing':
        return 'Customize the menu items for each selected package.';
      case 'review':
        return 'Review your menu configurations before saving.';
      default:
        return '';
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Utensils className="w-5 h-5" />
              {getStepTitle()}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {getStepDescription()}
            </p>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex items-center justify-center space-x-4 mb-6">
            <div className={`flex items-center space-x-2 ${currentStep === 'selection' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'selection' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                1
              </div>
              <span className="text-sm font-medium">Select Packages</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <div className={`flex items-center space-x-2 ${currentStep === 'editing' ? 'text-blue-600' : currentStep === 'review' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'editing' ? 'bg-blue-600 text-white' : currentStep === 'review' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
                2
              </div>
              <span className="text-sm font-medium">Customize</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <div className={`flex items-center space-x-2 ${currentStep === 'review' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'review' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
                3
              </div>
              <span className="text-sm font-medium">Review</span>
            </div>
          </div>

          {/* Step 1: Package Selection */}
          {currentStep === 'selection' && (
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading menu packages...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {menuPackages.map((menuPackage) => (
                    <Card
                      key={menuPackage.id}
                      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                        selectedPackages.includes(menuPackage.id!)
                          ? 'ring-2 ring-blue-500 bg-blue-50'
                          : 'hover:border-blue-300'
                      }`}
                      onClick={() => handlePackageSelect(menuPackage.id!)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <CardTitle className="text-lg">{menuPackage.name}</CardTitle>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${menuPackage.type === 'veg' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                                <span className={`inline-flex items-center justify-center w-3.5 h-3.5 ${menuPackage.type === 'veg' ? 'border-green-700' : 'border-red-700'} border rounded-sm`}>
                                  <span className={`${menuPackage.type === 'veg' ? 'bg-green-700' : 'bg-red-700'} w-1.5 h-1.5 rounded-full`} />
                                </span>
                                {menuPackage.type === 'veg' ? 'Veg' : 'Non-Veg'}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {menuPackage.description}
                            </p>
                          </div>
                          {selectedPackages.includes(menuPackage.id!) && (
                            <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Price:</span>
                            <span className="text-lg font-bold text-green-600">
                              ₹{menuPackage.price}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Category:</span>
                            <Badge variant="outline">{menuPackage.category || 'N/A'}</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

            </div>
          )}

          {/* Step 2: Menu Customization */}
          {currentStep === 'editing' && (
            <div className="space-y-4">
              {selectedPackages.length === 0 ? (
                <div className="p-4 bg-blue-50 rounded-lg border text-blue-700 text-sm">
                  No menu packages selected. Go back to the previous step to add one or more packages.
                </div>
              ) : (
                selectedPackages.map(packageId => {
                  const menuPackage = menuPackages.find(pkg => pkg.id === packageId);
                  if (!menuPackage) return null;

                  const packageCustomData = customMenuItems[packageId];
                  const packageItemsCount = packageCustomData?.selectedItems?.filter((item: any) => item.isPackageItem).length || 0;
                  const additionalItemsCount = packageCustomData?.selectedItems?.filter((item: any) => !item.isPackageItem).length || 0;
                  const additionalPrice = packageCustomData?.selectedItems?.reduce((sum: number, item: any) => {
                    return sum + (!item.isPackageItem ? (item.additionalPrice || 0) : 0);
                  }, 0) || 0;
                  const totalPackageItems = packageCustomData?.totalPackageItems || menuPackage.menuItems?.length || 0;
                  const excludedItemCount = packageCustomData?.excludedItemCount || 0;
                  const totalDeduction = packageCustomData?.totalDeduction || 0;
                  const basePackagePrice = packageCustomData?.customPackagePrice ?? menuPackage.price;
                  const totalPrice = basePackagePrice + additionalPrice;

                  return (
                    <Card key={packageId} className="relative">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{menuPackage.name}</CardTitle>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <span>Base Package Price: ₹{basePackagePrice} • {menuPackage.category}</span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${menuPackage.type === 'veg' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                              <span className={`inline-flex items-center justify-center w-3.5 h-3.5 ${menuPackage.type === 'veg' ? 'border-green-700' : 'border-red-700'} border rounded-sm`}>
                                <span className={`${menuPackage.type === 'veg' ? 'bg-green-700' : 'bg-red-700'} w-1.5 h-1.5 rounded-full`} />
                              </span>
                              {menuPackage.type === 'veg' ? 'Veg' : 'Non-Veg'}
                            </span>
                          </p>
                          {additionalPrice > 0 && (
                            <div className="space-y-1 mt-2">
                              <p className="text-sm font-medium text-green-600">
                                Additional Items: +₹{additionalPrice}
                              </p>
                              <p className="text-sm font-bold text-blue-600">
                                Total Price: ₹{totalPrice}
                              </p>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Base Package:</span>
                            <span className="text-sm text-muted-foreground">
                              {totalPackageItems} items
                            </span>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Custom Package Rate (₹)
                            </label>
                            <Input
                              type="number"
                              min={0}
                              value={(packageCustomData?.customPackagePrice ?? menuPackage.price ?? 0).toString()}
                              onChange={(event) => handlePackagePriceChange(packageId, event.target.value)}
                            />
                          </div>

                          {packageCustomData && (
                            <div className="p-3 bg-blue-50 rounded-lg border">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-blue-800">Customized for Quotation:</span>
                                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                  {packageCustomData.selectedItems?.length || 0} items
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="text-green-700">
                                  ✓ {packageItemsCount} package items
                                </div>
                                {excludedItemCount > 0 && (
                                  <div className="text-red-700">
                                    ✗ {excludedItemCount} excluded items
                                  </div>
                                )}
                                {additionalItemsCount > 0 && (
                                  <div className="text-blue-700">
                                    + {additionalItemsCount} additional items
                                  </div>
                                )}
                                {totalDeduction > 0 && (
                                  <div className="text-red-700">
                                    - ₹{Math.round(totalDeduction)} deduction
                                  </div>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground mt-2">
                                * Changes are quotation-specific and don't affect original menu data
                              </div>
                            </div>
                          )}

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditPackage(menuPackage)}
                            className="w-full"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            {packageCustomData ? 'Edit Customization' : 'Customize Menu'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}

            </div>
          )}

          {/* Step 3: Review */}
          {currentStep === 'review' && (
            <div className="space-y-4">
              {selectedPackages.length === 0 ? (
                <div className="p-4 bg-blue-50 rounded-lg border text-blue-700 text-sm">
                  No menu packages selected. Go back to the previous step to add one or more packages.
                </div>
              ) : (
                selectedPackages.map(packageId => {
                  const menuPackage = menuPackages.find(pkg => pkg.id === packageId);
                  const customData = customMenuItems[packageId];
                  if (!menuPackage) return null;

                  const totalPackageItems = customData?.totalPackageItems || menuPackage.menuItems?.length || 0;
                  const excludedItemCount = customData?.excludedItemCount || 0;
                  const totalDeduction = customData?.totalDeduction || 0;
                  const basePackagePrice = customData?.customPackagePrice ?? menuPackage.price;
                  const additionalPrice = customData?.selectedItems?.reduce((sum: number, item: any) => {
                    return sum + (!item.isPackageItem ? (item.additionalPrice || 0) : 0);
                  }, 0) || 0;
                  const totalPrice = basePackagePrice + additionalPrice;
                  const packageItemsCount = customData?.selectedItems?.filter((item: any) => item.isPackageItem).length || 0;
                  const additionalItemsCount = customData?.selectedItems?.filter((item: any) => !item.isPackageItem).length || 0;

                  return (
                    <Card key={packageId}>
                      <CardHeader>
                        <CardTitle className="text-lg">{menuPackage.name}</CardTitle>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">
                            Package Price: ₹{basePackagePrice} • {menuPackage.category}
                          </p>
                          {additionalPrice > 0 && (
                            <div className="space-y-1 mt-2">
                              <p className="text-sm font-medium text-green-600">
                                Additional Items: +₹{additionalPrice}
                              </p>
                              <p className="text-sm font-bold text-blue-600">
                                Total Price: ₹{totalPrice}
                              </p>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {customData ? (
                          <div className="p-3 bg-green-50 rounded-lg border">
                            <h5 className="font-medium text-green-800 mb-2">✓ Customized for Quotation</h5>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-medium">Package Items:</span>
                                <span className="ml-2 text-green-600">{packageItemsCount}</span>
                              </div>
                              {excludedItemCount > 0 && (
                                <div>
                                  <span className="font-medium">Excluded Items:</span>
                                  <span className="ml-2 text-red-600">{excludedItemCount}</span>
                                </div>
                              )}
                              {additionalItemsCount > 0 && (
                                <>
                                  <div>
                                    <span className="font-medium">Additional Items:</span>
                                    <span className="ml-2 text-blue-600">{additionalItemsCount}</span>
                                  </div>
                                  <div>
                                    <span className="font-medium">Additional Cost:</span>
                                    <span className="ml-2 text-green-600">+₹{additionalPrice}</span>
                                  </div>
                                </>
                              )}
                              {totalDeduction > 0 && (
                                <div>
                                  <span className="font-medium">Deduction:</span>
                                  <span className="ml-2 text-red-600">-₹{Math.round(totalDeduction)}</span>
                                </div>
                              )}
                              <div>
                                <span className="font-medium">Total Items:</span>
                                <span className="ml-2 text-green-600">{totalPackageItems}</span>
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground mt-2">
                              * All changes are quotation-specific and don't affect original menu data
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            <p className="text-sm text-gray-600">
                              Using default package items ({menuPackage.menuItems?.length || 0} items)
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 'selection'}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              
              {currentStep === 'review' ? (
                <Button
                  type="button"
                  onClick={handleSave}
                >
                  Save Configuration
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleNext}
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Menu Item Editor Dialog */}
      {editingPackage && (
        <MenuItemEditor
          open={showMenuItemEditor}
          onOpenChange={setShowMenuItemEditor}
          menuPackage={editingPackage}
          onSave={handleMenuItemsSave}
          previouslySelectedItems={customMenuItems[editingPackage.id!]?.selectedItems?.map((item: any) => item.id) || []}
        />
      )}
    </>
  );
}

