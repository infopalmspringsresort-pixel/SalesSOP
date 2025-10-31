import { Request, Response, NextFunction } from 'express';
import { AuditLogger } from './audit-logger';
import { storage } from '../storage';

// Global audit middleware that logs ALL operations
export function globalAuditMiddleware() {
  return (req: Request & { audit?: AuditLogger }, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const originalSend = res.send;
    const originalJson = res.json;
    
    // Initialize audit logger with storage instance
    req.audit = new AuditLogger(storage);
    
    // Override res.send to capture response details
    res.send = function(body: any) {
      const duration = Date.now() - startTime;
      const success = res.statusCode >= 200 && res.statusCode < 400;
      
      // Log the operation asynchronously (don't await to avoid blocking)
      logOperationAsync(req, res, {
        success,
        duration,
        responseSize: body ? JSON.stringify(body).length : 0,
        statusCode: res.statusCode,
        method: req.method,
        url: req.originalUrl
      });
      
      return originalSend.call(this, body);
    };
    
    // Override res.json to capture response details
    res.json = function(body: any) {
      const duration = Date.now() - startTime;
      const success = res.statusCode >= 200 && res.statusCode < 400;
      
      // Log the operation asynchronously (don't await to avoid blocking)
      logOperationAsync(req, res, {
        success,
        duration,
        responseSize: body ? JSON.stringify(body).length : 0,
        statusCode: res.statusCode,
        method: req.method,
        url: req.originalUrl
      });
      
      return originalJson.call(this, body);
    };
    
    next();
  };
}

// Async operation logging (non-blocking)
async function logOperationAsync(req: Request, res: Response, metadata: any) {
  if (!req.audit) return;
  
  try {
    const action = getActionFromRoute(req, metadata);
    const module = getModuleFromRoute(req);
    const resourceId = getResourceIdFromRoute(req);
    const isBusinessCritical = isBusinessOperation(req);
    
    // Skip logging for certain non-critical operations
    if (shouldSkipLogging(req)) return;
    
    // Skip all viewing operations (GET requests)
    if (action === 'SKIP_VIEWING') return;
    
    await req.audit.log({
      userId: (req as any).user?.id || (req as any).user?.profile?.id,
      userRole: (req as any).userRole || 'anonymous',
      action,
      module
    });
  } catch (error) {
    // Don't let audit logging errors break the main operation
    }
}

// Determine action from route and method
function getActionFromRoute(req: Request, metadata: any): string {
  const method = req.method.toLowerCase();
  const path = req.path;
  
  // Authentication actions - REMOVED
  // if (path.includes('/auth/login')) return 'login';
  // if (path.includes('/auth/logout')) return 'logout';
  // if (path.includes('/auth/forgot-password')) return 'password_reset_requested';
  // if (path.includes('/auth/reset-password')) return 'password_reset_completed';
  // if (path.includes('/auth/register')) return 'user_registered';
  // if (path.includes('/auth/verify-token')) return 'token_verified';
  
  // CRUD operations - SKIP ALL GET REQUESTS (viewing operations)
  if (method === 'get') {
    return 'SKIP_VIEWING'; // Special marker to skip all viewing operations
  }
  if (method === 'post') {
    if (path.includes('/follow-ups')) return 'follow_up_scheduled';
    if (path.includes('/complete')) return 'follow_up_completed';
    return 'created';
  }
  if (method === 'put' || method === 'patch') {
    if (path.includes('/status')) return 'status_changed';
    if (path.includes('/role')) return 'role_assigned';
    return 'updated';
  }
  if (method === 'delete') return 'deleted';
  
  return 'accessed';
}

// Determine module from route
function getModuleFromRoute(req: Request): string {
  const path = req.path;
  
  if (path.includes('/auth')) return 'auth';
  if (path.includes('/enquiries')) return 'enquiries';
  if (path.includes('/bookings')) return 'bookings';
  if (path.includes('/users')) return 'users';
  if (path.includes('/roles')) return 'users';
  if (path.includes('/follow-ups')) return 'follow_ups';
  if (path.includes('/reports')) return 'reports';
  if (path.includes('/export')) return 'reports';
  if (path.includes('/audit')) return 'audit';
  if (path.includes('/settings')) return 'settings';
  if (path.includes('/dashboard')) return 'dashboard';
  
  return 'system';
}

// Extract resource ID from route
function getResourceIdFromRoute(req: Request): string | undefined {
  const path = req.path;
  const idMatch = path.match(/\/([a-f0-9]{24})(?:\/|$)/);
  return idMatch ? idMatch[1] : undefined;
}

// Check if operation is business-critical
function isBusinessOperation(req: Request): boolean {
  const businessPaths = [
    '/enquiries', '/bookings', '/users', '/follow-ups',
    '/reports', '/export'
  ];
  
  return businessPaths.some(path => req.path.includes(path));
}

// Determine if logging should be skipped for certain operations
function shouldSkipLogging(req: Request): boolean {
  const path = req.path;
  
  // Skip logging for health checks, static assets, authentication, settings, etc.
  const skipPaths = [
    '/', // Skip root path
    '/health', '/ping', '/favicon.ico', '/robots.txt',
    '/api/auth/user', // Skip frequent user checks
    '/api/auth/login', '/api/auth/logout', '/api/auth/register',
    '/api/auth/forgot-password', '/api/auth/reset-password',
    '/api/auth/verify-token', '/api/auth/google', '/api/auth/github',
    '/api/settings', '/api/roles', '/api/users', '/api/system-settings',
    '/api/audit', // Skip audit log viewing
    '/api/enquiries', // Skip global logging for enquiries (handled by specific routes)
    '/api/quotations', // Skip global logging for quotations (handled by specific routes)
    '/api/bookings', // Skip global logging for bookings (handled by specific routes)
    '/api/reports' // Skip global logging for reports (handled by specific routes)
  ];
  
  return skipPaths.some(skipPath => path.includes(skipPath));
}

