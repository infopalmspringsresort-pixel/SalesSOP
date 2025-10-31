import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Redirect } from "wouter";
import { useEffect } from "react";

interface AdminRouteProps {
  component: React.ComponentType<any>;
  [key: string]: any;
}

export function AdminRoute({ component: Component, ...props }: AdminRouteProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Check if current user is admin
  const isCurrentUserAdmin = Boolean(user && 
    typeof user === 'object' && 
    'role' in user && 
    user.role && 
    typeof user.role === 'object' && 
    'name' in user.role && 
    (user.role as any).name === 'admin');

  useEffect(() => {
    if (user && !isCurrentUserAdmin) {
      toast({
        title: "Access Denied",
        description: "Administrator privileges required to access this page.",
        variant: "destructive",
      });
    }
  }, [user, isCurrentUserAdmin, toast]);

  if (!user) {
    // User not loaded yet or not authenticated
    return null;
  }

  if (!isCurrentUserAdmin) {
    // Redirect non-admin users to dashboard
    return <Redirect to="/" />;
  }

  return <Component {...props} />;
}