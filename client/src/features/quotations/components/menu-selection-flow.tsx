import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Check, Utensils, Edit, ArrowRight, ArrowLeft } from "lucide-react";
import type { MenuPackage } from "@shared/schema-client";
import MenuItemEditor from "./menu-item-editor";

interface MenuSelectionFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (selectedPackage: string, customMenuItems: any) => void;
}

type FlowStep = 'selection' | 'editing' | 'review';

export default function MenuSelectionFlow({ open, onOpenChange, onSave }: MenuSelectionFlowProps) {
  const [currentStep, setCurrentStep] = useState<FlowStep>('selection');
  const [selectedPackage, setSelectedPackage] = useState<string>('');
  const [editingPackage, setEditingPackage] = useState<MenuPackage | null>(null);
  const [customMenuItems, setCustomMenuItems] = useState<any>({});
  const [showMenuItemEditor, setShowMenuItemEditor] = useState(false);
  const { toast } = useToast();

  // Fetch menu packages
  const { data: menuPackages = [], isLoading } = useQuery<MenuPackage[]>({
    queryKey: ["/api/menus/packages"],
    enabled: open,
  });

  // Reset state when dialog opens (but preserve customMenuItems)
  useEffect(() => {
    if (open) {
      setCurrentStep('selection');
      setEditingPackage(null);
      setShowMenuItemEditor(false);
      // Restore previously selected package if it exists
      const existingPackageId = Object.keys(customMenuItems)[0];
      if (existingPackageId) {
        setSelectedPackage(existingPackageId);
      } else {
        setSelectedPackage('');
      }
      // Don't reset customMenuItems to preserve previous selections
    }
  }, [open]);

  const handlePackageSelect = (packageId: string) => {
    setSelectedPackage(packageId);
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
          totalPackageItems: data.totalPackageItems,
          excludedItemCount: data.excludedItemCount,
          totalDeduction: data.totalDeduction, // Total price of excluded items
          packageId: editingPackage.id
        }
      }));
    }
    setShowMenuItemEditor(false);
    setEditingPackage(null);
  };

  const handleNext = () => {
    if (currentStep === 'selection') {
      if (!selectedPackage) {
        toast({
          title: "No package selected",
          description: "Please select a menu package to continue.",
          variant: "destructive",
        });
        return;
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

  const handleSave = () => {
    const packageData = customMenuItems[selectedPackage];
    console.log('🔍 MenuSelectionFlow handleSave calling onSave with:', { selectedPackage, packageData });
    onSave(selectedPackage, packageData);
    onOpenChange(false);
    toast({
      title: "Success",
      description: "Menu configuration saved successfully",
    });
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'selection':
        return 'Select Menu Package';
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
        return 'Choose the menu package you want to include in this quotation.';
      case 'editing':
        return 'Customize the menu items for the selected package.';
      case 'review':
        return 'Review your menu configuration before saving.';
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
                        selectedPackage === menuPackage.id!
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
                          {selectedPackage === menuPackage.id! && (
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

              {selectedPackage && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border">
                  <h4 className="font-medium text-blue-800 mb-2">
                    Selected Package
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const selectedPackageData = menuPackages.find(pkg => pkg.id === selectedPackage);
                      return selectedPackageData ? (
                        <Badge variant="default" className="bg-blue-600">
                          {selectedPackageData.name} - ₹{selectedPackageData.price}
                        </Badge>
                      ) : null;
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Menu Customization */}
          {currentStep === 'editing' && (
            <div className="space-y-4">
              {(() => {
                const menuPackage = menuPackages.find(pkg => pkg.id === selectedPackage);
                if (!menuPackage) return null;

                const hasCustomItems = customMenuItems[selectedPackage];
                const customItemsCount = hasCustomItems 
                  ? (hasCustomItems.selectedItems?.length || 0)
                  : 0;
                
                // Calculate deduction for excluded items (using actual item prices)
                const totalPackageItems = hasCustomItems?.totalPackageItems || menuPackage.menuItems?.length || 0;
                const excludedItemCount = hasCustomItems?.excludedItemCount || 0;
                const totalDeduction = hasCustomItems?.totalDeduction || 0; // Actual price of excluded items
                
                // Use package price as base (not sum of individual items)
                const packagePrice = menuPackage.price;
                
                // Calculate additional price from custom items (additional items only)
                const additionalPrice = hasCustomItems?.selectedItems?.reduce((sum: number, item: any) => {
                  // Only add price for additional items (not package items)
                  return sum + (!item.isPackageItem ? (item.additionalPrice || 0) : 0);
                }, 0) || 0;
                
                // Package price + additional items (without GST - GST will be added in final quote)
                const totalPrice = packagePrice + additionalPrice;

                return (
                  <Card className="relative">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{menuPackage.name}</CardTitle>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <span>Package Price: ₹{menuPackage.price} • {menuPackage.category}</span>
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
                        
                        {hasCustomItems && (
                          <div className="p-3 bg-blue-50 rounded-lg border">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-blue-800">Customized for Quotation:</span>
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                {customItemsCount} items
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="text-green-700">
                                ✓ {hasCustomItems.selectedItems?.filter((item: any) => item.isPackageItem).length || 0} package items
                              </div>
                              {excludedItemCount > 0 && (
                                <div className="text-red-700">
                                  ✗ {excludedItemCount} excluded items
                                </div>
                              )}
                              {additionalPrice > 0 && (
                                <div className="text-blue-700">
                                  + {hasCustomItems.selectedItems?.filter((item: any) => !item.isPackageItem).length || 0} additional items
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
                          {hasCustomItems ? 'Edit Customization' : 'Customize Menu'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              <div className="mt-4 p-4 bg-blue-50 rounded-lg border">
                <h4 className="font-medium text-blue-800 mb-2">Next Steps:</h4>
                <p className="text-sm text-blue-700">
                  Click "Next" to proceed to menu customization, or click "Customize Menu" to edit items for the selected package.
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {currentStep === 'review' && (
            <div className="space-y-4">
              {(() => {
                const menuPackage = menuPackages.find(pkg => pkg.id === selectedPackage);
                const customData = customMenuItems[selectedPackage];
                
                if (!menuPackage) return null;

                // Calculate deduction for excluded items (using actual item prices)
                const totalPackageItems = customData?.totalPackageItems || menuPackage.menuItems?.length || 0;
                const excludedItemCount = customData?.excludedItemCount || 0;
                const totalDeduction = customData?.totalDeduction || 0; // Actual price of excluded items
                
                // Calculate selected package items price
                const selectedPackageItemsPrice = customData?.selectedItems?.reduce((sum: number, item: any) => {
                  return sum + (item.isPackageItem ? (item.price || 0) : 0);
                }, 0) || menuPackage.price;
                
                // Calculate additional price from custom items (additional items only)
                const additionalPrice = customData?.selectedItems?.reduce((sum: number, item: any) => {
                  // Only add price for additional items (not package items)
                  return sum + (!item.isPackageItem ? (item.additionalPrice || 0) : 0);
                }, 0) || 0;
                
                // Selected items price + additional items (without GST - GST will be added in final quote)
                const totalPrice = selectedPackageItemsPrice + additionalPrice;

                return (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">{menuPackage.name}</CardTitle>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                          Package Price: ₹{menuPackage.price} • {menuPackage.category}
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
                                <span className="ml-2 text-green-600">{customData.selectedItems?.filter((item: any) => item.isPackageItem).length || 0}</span>
                              </div>
                              {excludedItemCount > 0 && (
                                <div>
                                  <span className="font-medium">Excluded Items:</span>
                                  <span className="ml-2 text-red-600">{excludedItemCount}</span>
                                </div>
                              )}
                              {additionalPrice > 0 && (
                                <>
                                  <div>
                                    <span className="font-medium">Additional Items:</span>
                                    <span className="ml-2 text-blue-600">{customData.selectedItems?.filter((item: any) => !item.isPackageItem).length || 0}</span>
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
              })()}

              <div className="mt-4 p-4 bg-blue-50 rounded-lg border">
                <h4 className="font-medium text-blue-800 mb-2">Configuration Summary:</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Selected Package:</span>
                    <span className="ml-2 text-blue-600">1</span>
                  </div>
                  <div>
                    <span className="font-medium">Customized:</span>
                    <span className="ml-2 text-blue-600">{Object.keys(customMenuItems).length > 0 ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>
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

