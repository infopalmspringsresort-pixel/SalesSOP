import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Package, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/sidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Link } from "wouter";
import { Menu, ChartLine, Mail, Calendar, BarChart3, Building, Calculator, Utensils } from "lucide-react";
import type { QuotationPackage } from "@shared/schema-client";
import QuotationPackageForm from "@/features/quotations/components/quotation-package-form";

export default function QuotationPackageManagement() {
  const [showPackageForm, setShowPackageForm] = useState(false);
  const [editingPackage, setEditingPackage] = useState<QuotationPackage | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch quotation packages
  const { data: packages = [], isLoading: packagesLoading } = useQuery<QuotationPackage[]>({
    queryKey: ["/api/quotations/packages"],
    staleTime: 0,
    refetchOnMount: true,
  });

  // Delete package mutation
  const deletePackageMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/quotations/packages/${id}`);
      if (!response.ok) throw new Error("Failed to delete package");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotations/packages"] });
      toast({ title: "Success", description: "Quotation package deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete quotation package", variant: "destructive" });
    },
  });

  const handleEditPackage = (pkg: QuotationPackage) => {
    setEditingPackage(pkg);
    setShowPackageForm(true);
  };

  const handleCloseForm = () => {
    setShowPackageForm(false);
    setEditingPackage(null);
  };

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
                        <Button variant="ghost" className="w-full justify-start">
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
                      <Link href="/quotation-package-management">
                        <Button variant="default" className="w-full justify-start">
                          <Calculator className="mr-2 h-4 w-4" />
                          Quotation Packages
                        </Button>
                      </Link>
                    </div>
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
            
            <div className="flex-1 flex justify-center">
              <div className="text-center">
                <h1 className="text-xl lg:text-2xl font-bold text-foreground">Quotation Package Management</h1>
                <p className="text-sm text-muted-foreground hidden lg:block">Manage saved quotation templates for quick reuse</p>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Quotation Packages</h2>
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
                      <div className="flex-1">
                        <CardTitle className="text-lg">{pkg.name}</CardTitle>
                        {pkg.description && (
                          <p className="text-sm text-muted-foreground mt-1">{pkg.description}</p>
                        )}
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
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Venue Sessions:</span>
                        <span>{pkg.venueRentalItems?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Room Packages:</span>
                        <span>{pkg.roomPackages?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Menu Packages:</span>
                        <span>{pkg.menuPackages?.length || 0}</span>
                      </div>
                      {pkg.isActive !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status:</span>
                          <Badge variant={pkg.isActive ? "default" : "secondary"}>
                            {pkg.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {packages.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No quotation packages yet</p>
                  <p className="text-sm">Create your first quotation package to save and reuse quotation templates</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Package Form */}
        <QuotationPackageForm
          open={showPackageForm}
          onOpenChange={handleCloseForm}
          editingPackage={editingPackage}
        />
      </main>
    </div>
  );
}

