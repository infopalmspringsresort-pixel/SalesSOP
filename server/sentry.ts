import * as Sentry from "@sentry/node";

export function initializeSentry() {
  if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      integrations: [
        // Enable Express.js instrumentation
        Sentry.expressIntegration(),
        // Enable database instrumentation
        Sentry.postgresIntegration(),
      ],
      // Performance Monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      // Capture unhandled promise rejections
      captureUnhandledRejections: true,
      // Capture unhandled exceptions
      captureUncaughtException: true,
      // Set maximum breadcrumbs
      maxBreadcrumbs: 50,
      // Configure release tracking
      release: process.env.DEPLOYMENT_ID || 'development',
      // Error filtering
      beforeSend(event) {
        // Filter out non-critical errors in production
        if (process.env.NODE_ENV === 'production') {
          // Don't send validation errors to Sentry
          if (event.tags?.errorType === 'validation') {
            return null;
          }
          // Don't send 4xx client errors except 401/403
          if (event.tags?.statusCode && 
              parseInt(event.tags.statusCode) >= 400 && 
              parseInt(event.tags.statusCode) < 500 &&
              !['401', '403'].includes(event.tags.statusCode)) {
            return null;
          }
        }
        return event;
      },
    });

    } else {
    }
}

// Middleware to add request context to Sentry
export const sentryRequestHandler = () => (req: any, res: any, next: any) => next();
export const sentryTracingHandler = () => (req: any, res: any, next: any) => next();
export const sentryErrorHandler = () => (err: any, req: any, res: any, next: any) => {
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(err);
  }
  next(err);
};

// Helper function to capture custom events
export function captureBusinessEvent(event: string, data: any, user?: { id: string; email?: string }) {
  Sentry.addBreadcrumb({
    message: event,
    category: 'business',
    level: 'info',
    data,
  });

  if (user) {
    Sentry.setUser(user);
  }

  Sentry.captureMessage(event, 'info');
}

// Helper function to capture errors with context
export function captureErrorWithContext(error: Error, context: any, level: 'error' | 'warning' = 'error') {
  Sentry.withScope((scope) => {
    scope.setLevel(level);
    scope.setContext('error_context', context);
    Sentry.captureException(error);
  });
}
