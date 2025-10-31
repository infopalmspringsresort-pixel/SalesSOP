import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { sessionSync } from "./sessionSync";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    let parsedData;
    try {
      parsedData = JSON.parse(text);
    } catch {
      parsedData = { message: text };
    }
    
    const error: any = new Error(`${res.status}: ${text}`);
    error.status = res.status;
    error.data = parsedData;
    throw error;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // Handle 401 errors by notifying session sync
  if (res.status === 401) {
    sessionSync.notifySessionInvalid();
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (res.status === 401) {
      // Notify session sync about unauthorized access
      sessionSync.notifySessionInvalid();
      
      if (unauthorizedBehavior === "returnNull") {
        return null;
      }
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      staleTime: 10 * 60 * 1000, // 10 minutes - increased for better performance
      gcTime: 30 * 60 * 1000, // 30 minutes - longer cache for better performance
      retry: (failureCount, error: any) => {
        // Don't retry on 401 errors
        if (error.message?.includes('401')) {
          return false;
        }
        // Don't retry on 4xx client errors
        if (error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 1; // Reduced retry attempts for better performance
      },
      refetchOnWindowFocus: false,
      refetchOnMount: false, // Prevent unnecessary refetch on mount
      refetchOnReconnect: false,
      // Add network mode for better offline handling
      networkMode: 'online',
    },
    mutations: {
      retry: false, // Don't retry mutations by default
      networkMode: 'online',
    },
  },
});
