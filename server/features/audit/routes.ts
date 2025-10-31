import type { Express } from "express";
import { storage } from "../../storage";
import { isAuthenticated } from "../../auth";
import { loadUserPermissions, requirePermission } from "../../middleware/rbac";
import { z } from "zod";

export function registerAuditRoutes(app: Express) {
  // Apply authentication and RBAC to all audit routes
  app.use('/api/audit*', isAuthenticated, loadUserPermissions);

  // Get system audit logs with comprehensive filtering
  app.get("/api/audit", requirePermission('audit', 'read'), async (req, res) => {
    try {
      const filters = {
        userId: req.query.userId as string,
        userRole: req.query.userRole as string,
        action: req.query.action as string,
        module: req.query.module as string,
        resourceType: req.query.resourceType as string,
        resourceId: req.query.resourceId as string,
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
        ipAddress: req.query.ipAddress as string,
        success: req.query.success ? req.query.success === 'true' : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      };

      // Remove undefined values
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof typeof filters] === undefined) {
          delete filters[key as keyof typeof filters];
        }
      });

      // Direct MongoDB query to bypass TypeScript issues
      const { MongoClient } = await import('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/sales-sop-generator');
      await client.connect();
      const dbName = process.env.MONGODB_DB_NAME || 'PALMSPRINGDB';
      const db = client.db(dbName);
      const collection = db.collection('system_audit_log');
      
      const query: any = {};
      if (filters?.userId) query.userId = filters.userId;
      if (filters?.userRole) query.userRole = filters.userRole;
      if (filters?.action) query.action = filters.action;
      if (filters?.module) query.module = filters.module;
      if (filters?.dateFrom) query.createdAt = { ...query.createdAt, $gte: new Date(filters.dateFrom) };
      if (filters?.dateTo) query.createdAt = { ...query.createdAt, $lte: new Date(filters.dateTo) };
      
      const auditLogs = await collection
        .find(query)
        .sort({ createdAt: -1 })
        .limit(filters?.limit || 100)
        .skip(filters?.offset || 0)
        .toArray();
      
      // Filter out unwanted fields from response
      const cleanLogs = auditLogs.map(log => {
        const { resourceType, resourceId, details, ipAddress, userAgent, ...cleanLog } = log;
        return cleanLog;
      });
      
      await client.close();
      res.json(cleanLogs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch system audit logs", error: error.message });
    }
  });

  // Export audit logs
  app.get("/api/audit/export", requirePermission('audit', 'read'), async (req, res) => {
    try {
      const filters = {
        userId: req.query.userId as string,
        userRole: req.query.userRole as string,
        action: req.query.action as string,
        module: req.query.module as string,
        resourceType: req.query.resourceType as string,
        resourceId: req.query.resourceId as string,
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
        ipAddress: req.query.ipAddress as string,
        success: req.query.success ? req.query.success === 'true' : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 1000,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      };

      // Remove undefined values
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof typeof filters] === undefined) {
          delete filters[key as keyof typeof filters];
        }
      });

      const auditLogs = await (storage as any).getSystemAuditLogs(filters);
      
      // Set headers for file download
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="audit-export-${new Date().toISOString().split('T')[0]}.json"`);
      
      res.json(auditLogs);
    } catch (error) {
      res.status(500).json({ message: "Failed to export audit logs" });
    }
  });

}