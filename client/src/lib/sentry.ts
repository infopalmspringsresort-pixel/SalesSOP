import * as Sentry from "@sentry/react";
import { createRoutingInstrumentation } from "@sentry/react";

export function initializeSentry() {
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      integrations: [
        // Browser profiling
        Sentry.browserProfilingIntegration(),
        // React error boundary
        Sentry.reactRouterV6BrowserTracingIntegration({
          useEffect: React.useEffect,
        }),
        // Performance monitoring
        Sentry.browserTracingIntegration(),
        // Replay sessions for debugging
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      // Performance Monitoring
      tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
      // Profile sample rate
      profilesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
      // Session Replay
      replaysSessionSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
      replaysOnErrorSampleRate: 1.0,
      // Set maximum breadcrumbs
      maxBreadcrumbs: 50,
      // Configure release tracking
      release: import.meta.env.VITE_DEPLOYMENT_ID || 'development',
      // Error filtering
      beforeSend(event) {
        // Filter out non-critical errors in production
        if (import.meta.env.PROD) {
          // Don't send network errors
          if (event.tags?.errorType === 'network') {
            return null;
          }
          // Don't send form validation errors
          if (event.tags?.errorType === 'validation') {
            return null;
          }
        }
        return event;
      },
    });

    } else {
    }
}

// React Error Boundary Component
export const SentryErrorBoundary = Sentry.ErrorBoundary;

// Helper function to capture user actions
export function captureUserAction(action: string, data: any, user?: { id: string; email?: string }) {
  Sentry.addBreadcrumb({
    message: action,
    category: 'user',
    level: 'info',
    data,
  });

  if (user) {
    Sentry.setUser(user);
  }
}

// Helper function to capture business events
export function captureBusinessEvent(event: string, data: any) {
  Sentry.addBreadcrumb({
    message: event,
    category: 'business',
    level: 'info',
    data,
  });

  Sentry.captureMessage(event, 'info');
}

// Helper function to capture API errors
export function captureApiError(error: Error, endpoint: string, method: string, statusCode?: number) {
  Sentry.withScope((scope) => {
    scope.setTag('errorType', 'api');
    scope.setTag('endpoint', endpoint);
    scope.setTag('method', method);
    if (statusCode) {
      scope.setTag('statusCode', statusCode.toString());
    }
    Sentry.captureException(error);
  });
}
