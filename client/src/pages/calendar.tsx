import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/sidebar";
import { BookingCalendar, VenueCalendarGrid } from "@/features/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, MapPin } from "lucide-react";

export default function CalendarPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'bookings' | 'venues'>('bookings');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <div className="hidden lg:block w-64 bg-card border-r animate-pulse"></div>
        <div className="flex-1 p-4 lg:p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 lg:h-8 bg-muted rounded w-32 lg:w-48"></div>
            <div className="h-96 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto h-screen touch-pan-y">
        <header className="bg-card border-b border-border px-4 lg:px-6 py-3 lg:py-4 shadow-sm">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-xl lg:text-2xl font-bold text-foreground">Bookings Calendar</h1>
              <p className="text-sm text-muted-foreground hidden lg:block">View and manage all bookings in a comprehensive sortable table with filters</p>
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-6 space-y-4 lg:space-y-6 pb-20 lg:pb-6">
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'bookings' | 'venues')} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="bookings" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Bookings Listing
              </TabsTrigger>
              <TabsTrigger value="venues" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Bookings Calendar
              </TabsTrigger>
            </TabsList>

            <TabsContent value="bookings">
              <BookingCalendar />
            </TabsContent>

            <TabsContent value="venues">
              <VenueCalendarGrid />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}