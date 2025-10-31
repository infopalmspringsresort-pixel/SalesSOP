import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { sessionSync } from "@/lib/sessionSync";

// Add instance counter to track hook calls
let hookInstanceCount = 0;

export function useAuth() {
  const [initialCheckComplete, setInitialCheckComplete] = useState(false);
  const queryClient = useQueryClient();
  
  // Only log for first few instances to avoid spam
  const instanceId = ++hookInstanceCount;
  const authStartTime = Date.now();
  
  if (instanceId <= 3) {
    } else if (instanceId === 4) {
    }
  
  const { data: user, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 15 * 60 * 1000, // 15 minutes - longer cache for better performance
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache longer
    refetchOnMount: false, // Prevent refetch on component mount
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    // Add query debugging
    meta: {
      instanceId: instanceId
    }
  });

  useEffect(() => {
    if (!isLoading) {
      if (instanceId <= 3) {
        }
      setInitialCheckComplete(true);
    }
  }, [isLoading, instanceId, authStartTime]);

  // Set up cross-tab session synchronization
  useEffect(() => {
    const unsubscribe = sessionSync.onAuthChange(() => {
      // When auth changes in another tab, invalidate queries and refetch
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      // Don't clear all cached data - just invalidate auth
      refetch(); // Force refetch user data
    });

    return unsubscribe;
  }, [queryClient, refetch]);

  // Monitor for 401 errors and sync logout across tabs
  useEffect(() => {
    const handleUnauthorized = (event: any) => {
      if (event.detail?.status === 401) {
        sessionSync.notifySessionInvalid();
      }
    };

    window.addEventListener('fetch-error', handleUnauthorized);
    return () => window.removeEventListener('fetch-error', handleUnauthorized);
  }, []);

  const isAuthenticated = !!user;
  const isUnauthenticated = !isLoading && !user && error;

  return {
    user,
    isLoading: !initialCheckComplete,
    isAuthenticated,
    isUnauthenticated,
    refetch,
  };
}
