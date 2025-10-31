import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

export function initializeSentry() {
  if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      integrations: [
        nodeProfilingIntegration(),
        // HTTP requests tracing
        Sentry.httpIntegration({ tracing: true }),
        // Express integration for better error context
        Sentry.expressIntegration(),
        // Performance monitoring
        Sentry.graphqlIntegration(),
        Sentry.mongooseIntegration()
      ],
      
      // Performance monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      
      // Error filtering
      beforeSend(event, hint) {
        // Filter out known non-critical errors
        if (event.exception) {
          const error = hint.originalException;
          if (error instanceof Error) {
            // Skip authentication errors (expected in normal flow)
            if (error.message.includes('Unauthorized') || error.message.includes('No session')) {
              return null;
            }
            
            // Skip validation errors (user input errors)
            if (error.message.includes('validation failed') || error.message.includes('Invalid input')) {
              return null;
            }
          }
        }
        
        return event;
      },
      
      // Additional context
      initialScope: {
        tags: {
          component: 'sop-manager-backend'
        }
      }
    });
    
    }
}

// Custom error tracking functions
export const trackError = (error: Error, context?: Record<string, any>) => {
  if (process.env.NODE_ENV === 'production') {
    Sentry.withScope(scope => {
      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          scope.setTag(key, String(value));
        });
      }
      Sentry.captureException(error);
    });
  } else {
    }
};

export const trackEvent = (message: string, data?: Record<string, any>) => {
  if (process.env.NODE_ENV === 'production') {
    Sentry.addBreadcrumb({
      message,
      data,
      level: 'info',
      timestamp: Date.now() / 1000
    });
  } else {
    }
};

export const trackPerformance = (operation: string, duration: number, metadata?: Record<string, any>) => {
  if (process.env.NODE_ENV === 'production') {
    Sentry.addBreadcrumb({
      message: `Performance: ${operation}`,
      data: {
        duration: `${duration}ms`,
        ...metadata
      },
      level: 'info',
      timestamp: Date.now() / 1000
    });
  }
  
  // Log slow operations
  if (duration > 1000) {
    }
};

// Health check for monitoring systems
export const healthCheck = {
  sentry: () => {
    try {
      if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
        // Test Sentry connection
        Sentry.captureMessage('Health check - Sentry is working', 'info');
        return { status: 'healthy', service: 'sentry' };
      }
      return { status: 'disabled', service: 'sentry' };
    } catch (error) {
      return { status: 'unhealthy', service: 'sentry', error: (error as Error).message };
    }
  }
};