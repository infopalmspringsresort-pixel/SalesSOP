import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/sidebar";
import { BookingCalendar, VenueCalendarGrid } from "@/features/calendar";
import { Button } from "@/components/ui/button";
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
        <div className="p-4 lg:p-6 space-y-4 lg:space-y-6 pb-20 lg:pb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between w-full">
              <div className="w-12 lg:w-0"></div>
              <div className="flex flex-col items-center flex-1">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
                    <Calendar className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                  </div>
                  <h1 className="text-xl lg:text-2xl xl:text-3xl font-bold text-foreground">
                    {viewMode === 'bookings' ? 'Bookings Calendar' : 'Venue Calendar'}
                  </h1>
                </div>
                <p className="text-xs lg:text-sm xl:text-base text-muted-foreground mt-1 text-center">
                  {viewMode === 'bookings' 
                    ? 'View and manage all bookings in a comprehensive sortable table with filters'
                    : 'View venue bookings across all locations with timeline view'
                  }
                </p>
              </div>
            </div>
            
            {/* View Toggle */}
            <div className="flex items-center gap-2 w-full lg:w-auto">
              <Button
                variant={viewMode === 'bookings' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('bookings')}
                className="flex items-center gap-2 flex-1 lg:flex-none min-h-[44px] touch-manipulation"
              >
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">Bookings</span>
                <span className="sm:hidden">Bookings</span>
              </Button>
              <Button
                variant={viewMode === 'venues' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('venues')}
                className="flex items-center gap-2 flex-1 lg:flex-none min-h-[44px] touch-manipulation"
              >
                <MapPin className="w-4 h-4" />
                <span className="hidden sm:inline">Venues</span>
                <span className="sm:hidden">Venues</span>
              </Button>
            </div>
          </div>

          {viewMode === 'bookings' ? <BookingCalendar /> : <VenueCalendarGrid />}
        </div>
      </div>
    </div>
  );
}