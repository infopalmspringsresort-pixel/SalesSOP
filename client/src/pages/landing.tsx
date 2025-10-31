import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
import { useEffect } from "react";
import logoUrl from "@assets/Palm Springs Logo resort_1756665272163.png";

export default function Landing() {
  const [, setLocation] = useLocation();

  // Auto-redirect to login if user lands on root without being authenticated
  useEffect(() => {
    const timer = setTimeout(() => {
      setLocation("/login");
    }, 2000); // Redirect after 2 seconds

    return () => clearTimeout(timer);
  }, [setLocation]);
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="pt-8 pb-6 text-center">
          <div className="space-y-6">
            <div>
              <div className="flex justify-center mb-4">
                <img 
                  src={logoUrl} 
                  alt="Palm Springs Resort" 
                  className="h-20 w-auto object-contain"
                />
              </div>
              <p className="text-muted-foreground">
                Professional event management system for banquet hall operations
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="font-semibold text-blue-800">Enquiry Management</div>
                  <div className="text-blue-600">Track & Convert</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="font-semibold text-green-800">Booking Workflow</div>
                  <div className="text-green-600">Contract & BEO</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <div className="font-semibold text-orange-800">Multi-Level Approvals</div>
                  <div className="text-orange-600">Sales → GM → MD</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="font-semibold text-purple-800">Payment Tracking</div>
                  <div className="text-purple-600">Complete Financial Flow</div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={() => window.location.href = '/login'}
                className="w-full"
                data-testid="button-email-login"
              >
                Sign In with Email
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
