import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { disableNumberInputArrows, disableNumberInputWheel } from "@/utils/disableNumberArrows";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import ForgotPasswordPage from "@/pages/forgot-password";
import VerifyTokenPage from "@/pages/verify-token";
import ResetPasswordPage from "@/pages/reset-password";
import Dashboard from "@/pages/dashboard";
import { EnquiriesPage } from "@/features/enquiries";
import { BookingsPage, BeoManagementPage } from "@/features/bookings";
import { ReportsPage } from "@/features/reports";
import { SettingsPage } from "@/features/settings";
import { AdminRoute } from "@/components/AdminRoute";
import CalendarPage from "@/pages/calendar";
import MenuManagement from "@/pages/menu-management";
import RoomManagement from "@/pages/room-management";
import PublicEnquiryPage from "@/pages/public-enquiry";
import ErrorBoundary from "@/components/ErrorBoundary";

function Router() {
  const { isAuthenticated, isLoading, isUnauthenticated } = useAuth();

  // Show loading spinner instead of landing page while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Public routes - always accessible */}
      <Route path="/login" component={LoginPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/verify-token" component={VerifyTokenPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/public-enquiry" component={PublicEnquiryPage} />
      
      {isAuthenticated ? (
        <>
          {/* Protected routes for authenticated users */}
          <Route path="/" component={Dashboard} />
          <Route path="/enquiries" component={EnquiriesPage} />
          <Route path="/bookings" component={BookingsPage} />
          <Route path="/calendar" component={CalendarPage} />
          <Route path="/beo-management" component={BeoManagementPage} />
          <Route path="/reports" component={ReportsPage} />
          <Route path="/menu-management" component={(props) => <AdminRoute component={MenuManagement} {...props} />} />
          <Route path="/room-management" component={(props) => <AdminRoute component={RoomManagement} {...props} />} />
          <Route path="/settings" component={(props) => <AdminRoute component={SettingsPage} {...props} />} />
        </>
      ) : (
        <>
          {/* Routes for unauthenticated users - redirect to login */}
          <Route path="/" component={LoginPage} />
          <Route path="/enquiries" component={LoginPage} />
          <Route path="/bookings" component={LoginPage} />
          <Route path="/calendar" component={LoginPage} />
          <Route path="/beo-management" component={LoginPage} />
          <Route path="/reports" component={LoginPage} />
          <Route path="/menu-management" component={LoginPage} />
          <Route path="/room-management" component={LoginPage} />
          <Route path="/settings" component={LoginPage} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    // Initialize number input arrow key disabling
    disableNumberInputArrows();
    disableNumberInputWheel();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
