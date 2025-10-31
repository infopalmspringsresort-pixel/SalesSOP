// Explicitly load .env from project root FIRST, before anything else
import dotenv from 'dotenv';
import { resolve } from 'path';
// Use override: true to ensure .env values take precedence over system env vars
dotenv.config({ path: resolve(process.cwd(), '.env'), override: true });

import { initializeSentry, sentryRequestHandler, sentryTracingHandler, sentryErrorHandler } from './sentry';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createAuditMiddleware } from './middleware/audit-logger';
import { globalAuditMiddleware } from './middleware/global-audit';
import { storage } from './storage';
import { sessionCleanup } from './utils/sessionCleanup';

// Set default timezone to Indian Standard Time (GMT+5:30)
process.env.TZ = 'Asia/Kolkata';

// Initialize Sentry before everything else
initializeSentry();

const app = express();

// Sentry request instrumentation
app.use(sentryRequestHandler());
app.use(sentryTracingHandler());

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add comprehensive audit logging middleware
app.use(globalAuditMiddleware());

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    const server = await registerRoutes(app);

    // Sentry error handler (must be before other error handlers)
    app.use(sentryErrorHandler());

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      // Don't throw - log error but don't crash
      console.error('Error:', err);
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || '5000', 10);
    // Bind to 0.0.0.0 for production (Render, Railway, etc.) to accept external connections
    // Use localhost only in development
    const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
    
    server.listen(port, host, () => {
      log(`serving on ${host}:${port}`);
      
      // Start session cleanup
      sessionCleanup.startAutomaticCleanup();
    });

    // Handle server errors
    server.on('error', (err: any) => {
      console.error('Server error:', err);
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use`);
      }
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();
