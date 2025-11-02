import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Plus, Minus, Utensils, Search, Edit, Check, X } from "lucide-react";
import type { MenuPackage, MenuItem, AdditionalItem } from "@shared/schema-client";

interface MenuItemEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menuPackage: MenuPackage;
  onSave: (data: any) => void;
  previouslySelectedItems?: string[];
}

export default function MenuItemEditor({ open, onOpenChange, menuPackage, onSave, previouslySelectedItems = [] }: MenuItemEditorProps) {
  const [selectedItems, setSelectedItems] = useState<string[]>(previouslySelectedItems);
  const [searchTerm, setSearchTerm] = useState("");
  const [forceUpdate, setForceUpdate] = useState(0);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const { toast } = useToast();

  // Fetch menu items for this package
  const { data: packageItems = [] } = useQuery<MenuItem[]>({
    queryKey: ["/api/menus/items"],
    enabled: open,
  });

  // Fetch additional items
  const { data: additionalItems = [] } = useQuery<AdditionalItem[]>({
    queryKey: ["/api/menus/additional-items"],
    enabled: open,
  });

  // Filter items for this package
  const filteredPackageItems = packageItems.filter(item => item.packageId === menuPackage.id);
  const filteredAdditionalItems = additionalItems.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Initialize selected items when dialog opens
  useEffect(() => {
    if (open) {
      if (previouslySelectedItems && previouslySelectedItems.length > 0) {
        // Use previously selected items if they exist
        setSelectedItems(previouslySelectedItems);
      } else {
        // Default all package items to be checked (included)
        const packageItemIds = filteredPackageItems.map(item => item.id!);
        setSelectedItems(packageItemIds);
      }
      setSearchTerm("");
      setHasUserInteracted(false);
    }
  }, [open]);

  const handleItemToggle = (itemId: string) => {
    console.log('🔄 Item clicked:', itemId);
    console.log('🔄 Current selectedItems:', selectedItems);
    
    // Mark that user has interacted
    setHasUserInteracted(true);
    
    setSelectedItems(prev => {
      const isCurrentlySelected = prev.includes(itemId);
      console.log('🔄 Is currently selected:', isCurrentlySelected);
      
      const newSelection = isCurrentlySelected 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId];
      
      console.log('🔄 New selection:', newSelection);
      
      // Force re-render
      setForceUpdate(prev => prev + 1);
      
      return newSelection;
    });
  };

  const handleSave = () => {
    setHasUserInteracted(false);
    
    // Get all package item IDs for comparison
    const allPackageItemIds = filteredPackageItems.map(item => item.id!);
    const excludedPackageItemIds = allPackageItemIds.filter(id => !selectedItems.includes(id));
    
    // Convert selected item IDs to actual item objects with details
    const selectedItemsWithDetails = selectedItems.map(itemId => {
      // Find the item in package items
      const packageItem = packageItems.find(item => item.id === itemId);
      if (packageItem) {
        return {
          id: packageItem.id,
          name: packageItem.name,
          price: packageItem.price || 0, // Individual item price
          additionalPrice: packageItem.additionalPrice || 0,
          isPackageItem: true
        };
      }
      
      // Find the item in additional items
      const additionalItem = additionalItems.find(item => item.id === itemId);
      if (additionalItem) {
        return {
          id: additionalItem.id,
          name: additionalItem.name,
          price: 0, // Additional items don't have base price
          additionalPrice: additionalItem.price || 0, // Their price is in additionalPrice
          isPackageItem: false
        };
      }
      
      return null;
    }).filter(Boolean);
    
    // Calculate deduction for excluded items using their actual prices
    const totalPackageItems = allPackageItemIds.length;
    const excludedItemCount = excludedPackageItemIds.length;
    
    // Calculate total deduction based on actual prices of excluded items
    const totalDeduction = excludedPackageItemIds.reduce((sum, itemId) => {
      const item = packageItems.find(i => i.id === itemId);
      return sum + (item?.price || 0);
    }, 0);
    
    // Return data with metadata about exclusions
    const saveData = {
      selectedItems: selectedItemsWithDetails,
      totalPackageItems,
      excludedItemCount,
      totalDeduction // Total price of excluded items
    };
    
    console.log('🔍 MenuItemEditor handleSave calling onSave with:', saveData);
    onSave(saveData);
    
    onOpenChange(false);
    
    toast({
      title: "Success",
      description: "Menu items updated successfully",
    });
  };

  const handleCancel = () => {
    setHasUserInteracted(false);
    onOpenChange(false);
  };

  // Group items by category
  const groupedPackageItems = filteredPackageItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  const groupedAdditionalItems = filteredAdditionalItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, AdditionalItem[]>);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Utensils className="w-5 h-5" />
              Edit Menu Items - {menuPackage.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
          {/* Package Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Package Items (Included in Base Price)</CardTitle>
              <p className="text-sm text-muted-foreground">
                All items below are included in the base package price. Uncheck items to exclude them (price will be deducted proportionally).
              </p>
            </CardHeader>
            <CardContent>
              {Object.keys(groupedPackageItems).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Utensils className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>No items found for this package</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedPackageItems).map(([category, items]) => (
                    <div key={category}>
                      <h4 className="font-medium text-lg mb-3">{category}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {items.map((item) => (
                          <div
                            key={`${item.id}-${forceUpdate}`}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              selectedItems.includes(item.id!)
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (item.id) {
                                handleItemToggle(item.id);
                              } else {
                                }
                            }}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h5 className="font-medium">{item.name}</h5>
                                  {item.isVeg !== undefined && (
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${item.isVeg ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                                      <span className={`inline-flex items-center justify-center w-3.5 h-3.5 ${item.isVeg ? 'border-green-700' : 'border-red-700'} border rounded-sm`}>
                                        <span className={`${item.isVeg ? 'bg-green-700' : 'bg-red-700'} w-1.5 h-1.5 rounded-full`} />
                                      </span>
                                      {item.isVeg ? 'Veg' : 'Non-Veg'}
                                    </span>
                                  )}
                                  {selectedItems.includes(item.id!) ? (
                                    <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                                      Included
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs text-red-600 border-red-300">
                                      Excluded
                                    </Badge>
                                  )}
                                </div>
                                {item.description && (
                                  <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                                )}
                                <div className="flex items-center gap-4 text-sm">
                                  <span className="text-muted-foreground">Quantity: {item.quantity}</span>
                                  <span className="font-medium text-green-600">₹{item.price || 0}</span>
                                </div>
                              </div>
                              <div className="ml-2">
                                {selectedItems.includes(item.id!) ? (
                                  <Check className="w-5 h-5 text-green-600" />
                                ) : (
                                  <div className="w-5 h-5 border-2 border-red-300 rounded" />
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Additional Items (Extra Charges Apply)</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Premium items that can be added at an extra cost (prices shown below)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search items..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-10 w-64"
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={() => setSearchTerm('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {Object.keys(groupedAdditionalItems).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Utensils className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  {additionalItems.length === 0 ? (
                    <div>
                      <p className="text-lg font-medium mb-2">No additional items available</p>
                      <p className="text-sm">Additional items need to be created in Menu Management first.</p>
                    </div>
                  ) : searchTerm ? (
                    <div>
                      <p className="text-lg font-medium mb-2">No items match your search</p>
                      <p className="text-sm">Try searching with different keywords or clear the search.</p>
                    </div>
                  ) : (
                    <p>No additional items found</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedAdditionalItems).map(([category, items]) => (
                    <div key={category}>
                      <h4 className="font-medium text-lg mb-3">{category}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {items.map((item) => (
                          <div
                            key={`${item.id}-${forceUpdate}`}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              selectedItems.includes(item.id!)
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (item.id) {
                                handleItemToggle(item.id);
                              } else {
                                }
                            }}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h5 className="font-medium">{item.name}</h5>
                                  {item.isVeg !== undefined && (
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${item.isVeg ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                                      <span className={`inline-flex items-center justify-center w-3.5 h-3.5 ${item.isVeg ? 'border-green-700' : 'border-red-700'} border rounded-sm`}>
                                        <span className={`${item.isVeg ? 'bg-green-700' : 'bg-red-700'} w-1.5 h-1.5 rounded-full`} />
                                      </span>
                                      {item.isVeg ? 'Veg' : 'Non-Veg'}
                                    </span>
                                  )}
                                </div>
                                {item.description && (
                                  <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                                )}
                                <div className="text-sm">
                                  <span className="font-bold text-blue-600">+₹{item.price}</span>
                                  <span className="text-muted-foreground ml-2 text-xs">(extra charge)</span>
                                </div>
                              </div>
                              <div className="ml-2">
                                {selectedItems.includes(item.id!) ? (
                                  <Check className="w-5 h-5 text-blue-600" />
                                ) : (
                                  <div className="w-5 h-5 border-2 border-gray-300 rounded" />
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>



          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Selection Summary & Price Impact</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Package Items:</span>
                    <span className="font-medium">{filteredPackageItems.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Included Package Items:</span>
                    <span className="font-medium text-green-600">{selectedItems.filter(id => 
                      filteredPackageItems.some(item => item.id === id)
                    ).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Excluded Package Items:</span>
                    <span className="font-medium text-red-600">{(() => {
                      const excludedCount = filteredPackageItems.length - selectedItems.filter(id => 
                        filteredPackageItems.some(item => item.id === id)
                      ).length;
                      return excludedCount;
                    })()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Additional Items Selected:</span>
                    <span className="font-medium text-blue-600">{selectedItems.filter(id => 
                      filteredAdditionalItems.some(item => item.id === id)
                    ).length}</span>
                  </div>
                </div>
                
                <Separator />
                
                <div className="bg-blue-50 p-3 rounded-lg space-y-2">
                  <div className="flex justify-between font-medium">
                    <span>Final Item Count:</span>
                    <span>{selectedItems.length} items</span>
                  </div>
                  
                  {(() => {
                    const excludedCount = filteredPackageItems.length - selectedItems.filter(id => 
                      filteredPackageItems.some(item => item.id === id)
                    ).length;
                    const additionalItemsSelected = selectedItems.filter(id => 
                      filteredAdditionalItems.some(item => item.id === id)
                    );
                    
                    // Calculate actual prices for selected package items
                    const selectedPackageItemsPrice = selectedItems
                      .map(itemId => packageItems.find(item => item.id === itemId))
                      .filter(item => item && filteredPackageItems.some(pkg => pkg.id === item.id))
                      .reduce((sum, item) => sum + (item?.price || 0), 0);
                    
                    // Calculate deduction (excluded items' actual prices)
                    const totalDeduction = filteredPackageItems
                      .filter(item => !selectedItems.includes(item.id!))
                      .reduce((sum, item) => sum + (item.price || 0), 0);
                    
                    // Calculate additional items cost
                    const additionalCost = additionalItemsSelected.reduce((sum, itemId) => {
                      const item = additionalItems.find(i => i.id === itemId);
                      return sum + (item?.price || 0);
                    }, 0);
                    
                    const adjustedPrice = selectedPackageItemsPrice + additionalCost;
                    
                    return (
                      <>
                        {excludedCount > 0 && (
                          <div className="flex justify-between text-sm text-red-600">
                            <span>Price Deduction:</span>
                            <span>-₹{Math.round(totalDeduction)}</span>
                          </div>
                        )}
                        {additionalCost > 0 && (
                          <div className="flex justify-between text-sm text-green-600">
                            <span>Additional Items Cost:</span>
                            <span>+₹{additionalCost}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm border-t pt-2">
                          <span>Adjusted Base Price:</span>
                          <span>₹{Math.round(adjustedPrice)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-blue-600">
                          <span>Total:</span>
                          <span>₹{Math.round(adjustedPrice)}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
                
                <div className="text-xs text-muted-foreground">
                  * All changes are specific to this quotation and don't affect the original menu data
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end items-center">
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={(e) => {
                  console.log('💾 Button click event fired!', e);
                  e.preventDefault();
                  e.stopPropagation();
                  handleSave();
                }}
              >
                Save Changes
              </Button>
            </div>
          </div>
          </div>
        </DialogContent>
      </Dialog>

    </>
  );
}

