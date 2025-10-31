import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

// Extend Express Request to include user permissions
declare module 'express-serve-static-core' {
  interface Request {
    userPermissions?: any;
    userRole?: string;
    user?: any;
  }
}

// Middleware to check authentication and load user permissions
export async function loadUserPermissions(req: any, res: Response, next: NextFunction) {
  try {
    // Handle local authentication only
    let userId: string;
    
    // For local authentication, user data is directly in req.user
    userId = req.user.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const userWithRole = await storage.getUserWithRole(userId);

    if (!userWithRole) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Store user permissions and role in request for later use
    req.userPermissions = userWithRole.role?.permissions || {};
    req.userRole = userWithRole.role?.name || 'salesperson';

    // Create audit log for user access
    await storage.createAuditLog({
      userId,
      userRole: req.userRole,
      action: 'access',
      module: req.path.split('/')[2] || 'unknown', // Extract module from path
      resourceType: req.method,
      resourceId: req.params.id || null,
      details: {
        path: req.path,
        method: req.method,
        query: req.query,
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || '',
    });

    next();
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Middleware factory for checking specific permissions
export function requirePermission(module: string, action: string) {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      // Handle local authentication only
      let userId: string;
      
      // For local authentication, user data is directly in req.user
      userId = req.user.id;
      
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Admin role bypasses all permission checks
      if (req.userRole === 'admin') {
        return next();
      }

      // Check specific permission
      const hasPermission = req.userPermissions?.[module]?.[action] === true;

      if (!hasPermission) {
        // Log unauthorized access attempt
        await storage.createAuditLog({
          userId,
          userRole: req.userRole || 'unknown',
          action: 'access_denied',
          module,
          resourceType: action,
          details: {
            requiredPermission: `${module}.${action}`,
            path: req.path,
            method: req.method,
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent') || '',
        });

        return res.status(403).json({ 
          message: 'Insufficient permissions',
          required: `${module}.${action}`,
        });
      }

      next();
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  };
}

// Middleware for admin-only routes
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}

// Middleware for role-based access (multiple roles allowed)
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!allowedRoles.includes(req.userRole || '')) {
      return res.status(403).json({ 
        message: 'Insufficient role',
        required: allowedRoles,
        current: req.userRole,
      });
    }
    next();
  };
}

// Middleware to ensure user can only access their own data (unless admin/manager)
export function requireOwnershipOrRole(...allowedRoles: string[]) {
  return (req: any, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const resourceUserId = req.params.userId || req.body.salespersonId || req.query.salespersonId;

    // Admin and managers can access all data
    if (allowedRoles.includes(req.userRole || '')) {
      return next();
    }

    // User can only access their own data
    if (userId === resourceUserId) {
      return next();
    }

    return res.status(403).json({ 
      message: 'Access denied: You can only access your own data',
    });
  };
}