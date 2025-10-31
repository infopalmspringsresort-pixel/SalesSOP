import { Request, Response, NextFunction } from 'express';
import { IStorage } from '../storage';

// Extend Express Request type to include user properties
declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
    userRole?: string;
    audit?: AuditLogger;
  }
}

// Define comprehensive action types for audit logging
export type AuditAction = 
  | 'login' | 'logout' | 'login_failed' | 'password_reset' | 'password_changed' | 'password_reset_requested' | 'password_reset_completed'
  | 'created' | 'updated' | 'deleted' | 'viewed' | 'searched' | 'accessed'
  | 'status_changed' | 'approved' | 'rejected' | 'follow_up_scheduled' | 'follow_up_completed' | 'follow_up_rescheduled'
  | 'user_created' | 'user_updated' | 'user_deactivated' | 'user_reactivated' | 'role_assigned' | 'user_registered'
  | 'enquiry_created' | 'enquiry_updated' | 'enquiry_deleted' | 'enquiry_status_changed' | 'enquiry_claimed' | 'enquiry_unclaimed'
  | 'booking_created' | 'booking_updated' | 'booking_deleted' | 'booking_status_changed'
  | 'quotation_generated' | 'beo_created' | 'data_exported' | 'report_generated'
  | 'system_accessed' | 'error_occurred' | 'validation_failed';

export type AuditModule = 
  | 'auth' | 'users' | 'enquiries' | 'bookings' | 'beos' | 'quotations'
  | 'follow_ups' | 'approvals' | 'amendments' | 'reports' | 'settings';

interface AuditLogEntry {
  userId?: string;
  userRole: string;
  action: AuditAction;
  module: AuditModule;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
  errorMessage?: string;
}

// Enhanced audit logger utility
export class AuditLogger {
  constructor(private storage: IStorage) {}

  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await this.storage.createSystemAuditLog({
        userId: entry.userId,
        userRole: entry.userRole,
        action: entry.action,
        module: entry.module,
      });
    } catch (error) {
      // Don't throw error to avoid disrupting the main operation
    }
  }

  async logBusinessAction(action: string, module: string, resourceId: string, details: Record<string, any>, req: Request): Promise<void> {
    await this.log({
      userId: (req as any).user?.id,
      userRole: (req as any).userRole || 'unknown',
      action: action as AuditAction,
      module: module as AuditModule,
    });
  }

  async logDataChange(oldData: any, newData: any, action: string, module: string, resourceId: string, req: Request): Promise<void> {
    await this.log({
      userId: (req as any).user?.id,
      userRole: (req as any).userRole || 'unknown',
      action: action as AuditAction,
      module: module as AuditModule,
    });
  }

  async logCRUD(
    action: string, 
    module: string, 
    resourceType: string, 
    resourceId: string, 
    userId: string, 
    userRole: string, 
    req: Request, 
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      userId: userId || (req as any).user?.id,
      userRole: userRole || (req as any).userRole || 'unknown',
      action: action as AuditAction,
      module: module as AuditModule,
    });
  }

  private getChanges(oldData: any, newData: any): Record<string, any> {
    if (!oldData || !newData) return {};
    
    const changes: Record<string, any> = {};
    const keys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
    
    for (const key of keys) {
      if (oldData[key] !== newData[key]) {
        changes[key] = {
          from: oldData[key],
          to: newData[key],
        };
      }
    }
    
    return changes;
  }
}

// Express middleware to add audit logger to request
export function createAuditMiddleware(storage: IStorage) {
  const auditLogger = new AuditLogger(storage);
  
  return (req: Request & { audit?: AuditLogger }, res: Response, next: NextFunction) => {
    req.audit = auditLogger;
    next();
  };
}