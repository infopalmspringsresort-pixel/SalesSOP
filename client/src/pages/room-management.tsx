import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Building, MapPin, Menu, ChartLine, Mail, FileText, Calendar, BarChart3, Utensils } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import RoomTypeForm from "@/features/rooms/components/room-type-form";
import VenueForm from "@/features/rooms/components/venue-form";
import Sidebar from "@/components/sidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Link } from "wouter";
import type { RoomType, Venue } from "@shared/schema-client";

export default function RoomManagement() {
  const [activeTab, setActiveTab] = useState("room-types");
  const [showRoomTypeForm, setShowRoomTypeForm] = useState(false);
  const [showVenueForm, setShowVenueForm] = useState(false);
  const [editingRoomType, setEditingRoomType] = useState<RoomType | null>(null);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch room types
  const { data: roomTypes = [], isLoading: roomTypesLoading } = useQuery<RoomType[]>({
    queryKey: ["/api/rooms/types"],
  });

  // Fetch venues
  const { data: venues = [], isLoading: venuesLoading } = useQuery<Venue[]>({
    queryKey: ["/api/rooms/venues"],
  });

  // Delete room type mutation
  const deleteRoomTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/rooms/types/${id}`);
      if (!response.ok) throw new Error("Failed to delete room type");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms/types"] });
      toast({ title: "Success", description: "Room type deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete room type", variant: "destructive" });
    },
  });

  // Delete venue mutation
  const deleteVenueMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/rooms/venues/${id}`);
      if (!response.ok) throw new Error("Failed to delete venue");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms/venues"] });
      toast({ title: "Success", description: "Venue deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete venue", variant: "destructive" });
    },
  });

  const handleEditRoomType = (roomType: RoomType) => {
    setEditingRoomType(roomType);
    setShowRoomTypeForm(true);
  };

  const handleEditVenue = (venue: Venue) => {
    setEditingVenue(venue);
    setShowVenueForm(true);
  };

  const handleCloseForms = () => {
    setShowRoomTypeForm(false);
    setShowVenueForm(false);
    setEditingRoomType(null);
    setEditingVenue(null);
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
                        <Button variant="default" className="w-full justify-start">
                          <Building className="mr-2 h-4 w-4" />
                          Room Management
                        </Button>
                      </Link>
                    </div>
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
            
            <div className="flex-1 flex justify-center">
              <div className="text-center">
                <h1 className="text-xl lg:text-2xl font-bold text-foreground">Room & Venue Management</h1>
                <p className="text-sm text-muted-foreground hidden lg:block">Manage room types, venues, and package-venue mappings for quotations</p>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto p-6 space-y-6">

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="room-types" className="flex items-center gap-2">
            <Building className="w-4 h-4" />
            Room Types
          </TabsTrigger>
          <TabsTrigger value="venues" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Venues
          </TabsTrigger>
        </TabsList>

        {/* Room Types Tab */}
        <TabsContent value="room-types" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Room Types</h2>
            <Button onClick={() => setShowRoomTypeForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Room Type
            </Button>
          </div>

          {roomTypesLoading ? (
            <div className="text-center py-8">Loading room types...</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {roomTypes.map((roomType) => (
                <Card key={roomType.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{roomType.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {roomType.category}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditRoomType(roomType)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRoomTypeMutation.mutate(roomType.id!)}
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
                        <span className="text-sm text-muted-foreground">Base rate:</span>
                        <span className="font-semibold">₹{roomType.baseRate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Extra person:</span>
                        <span className="text-sm">₹{roomType.extraPersonRate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Max occupancy:</span>
                        <span className="text-sm">{roomType.maxOccupancy} persons</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Venues Tab */}
        <TabsContent value="venues" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Venues</h2>
            <Button onClick={() => setShowVenueForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Venue
            </Button>
          </div>

          {venuesLoading ? (
            <div className="text-center py-8">Loading venues...</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {venues.map((venue) => (
                <Card key={venue.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{venue.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {venue.area.toLocaleString()} sq ft
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditVenue(venue)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteVenueMutation.mutate(venue.id!)}
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
                        <span className="text-sm text-muted-foreground">Min guests:</span>
                        <span className="font-semibold">{venue.minGuests}</span>
                      </div>
                      {venue.maxGuests && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Max guests:</span>
                          <span className="text-sm">{venue.maxGuests}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Hiring charges:</span>
                        <span className="font-semibold">₹{venue.hiringCharges.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Session duration:</span>
                        <span className="text-sm">{venue.sessionDuration} hours</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

      </Tabs>

      {/* Forms */}
      <RoomTypeForm
        open={showRoomTypeForm}
        onOpenChange={handleCloseForms}
        editingRoomType={editingRoomType}
      />

      <VenueForm
        open={showVenueForm}
        onOpenChange={handleCloseForms}
        editingVenue={editingVenue}
      />
        </div>
      </main>
    </div>
  );
}
