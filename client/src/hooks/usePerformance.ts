import { useEffect, useRef } from 'react';

interface PerformanceMetrics {
  componentName: string;
  renderTime: number;
  mountTime: number;
  updateCount: number;
}

export function usePerformance(componentName: string) {
  const startTime = useRef<number>(Date.now());
  const renderCount = useRef<number>(0);
  const mountTime = useRef<number>(0);

  useEffect(() => {
    const endTime = Date.now();
    const renderTime = endTime - startTime.current;
    
    if (renderCount.current === 0) {
      mountTime.current = renderTime;
    }
    
    renderCount.current += 1;
    
    // Log performance metrics in development
    if (import.meta.env.DEV) {
      const metrics: PerformanceMetrics = {
        componentName,
        renderTime,
        mountTime: mountTime.current,
        updateCount: renderCount.current,
      };
      
      }
    
    startTime.current = Date.now();
  });

  return {
    renderCount: renderCount.current,
    mountTime: mountTime.current,
  };
}

// Hook for measuring API call performance
export function useAPIPerformance() {
  const measureAPICall = async <T>(
    apiCall: () => Promise<T>,
    apiName: string
  ): Promise<T> => {
    const startTime = performance.now();
    
    try {
      const result = await apiCall();
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (import.meta.env.DEV) {
        }
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (import.meta.env.DEV) {
        }
      
      throw error;
    }
  };

  return { measureAPICall };
}

export default usePerformance;

