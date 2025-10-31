import type { Express } from "express";
import { isAuthenticated } from "../../auth";
import { loadUserPermissions, requirePermission } from "../../middleware/rbac";
import { auditMonitor } from "../../utils/audit-monitor";

export function registerAuditMonitoringRoutes(app: Express) {
  // Apply authentication and RBAC to all audit monitoring routes
  app.use('/api/audit-monitoring*', isAuthenticated, loadUserPermissions);

  // Get audit statistics
  app.get("/api/audit-monitoring/stats", requirePermission('audit', 'read'), async (req, res) => {
    try {
      const { dateFrom, dateTo } = req.query;
      
      const fromDate = dateFrom ? new Date(dateFrom as string) : undefined;
      const toDate = dateTo ? new Date(dateTo as string) : undefined;
      
      const stats = await auditMonitor.getAuditStats(fromDate, toDate);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch audit statistics" });
    }
  });

  // Check for audit gaps
  app.get("/api/audit-monitoring/gaps", requirePermission('audit', 'read'), async (req, res) => {
    try {
      const gaps = await auditMonitor.checkAuditGaps();
      res.json(gaps);
    } catch (error) {
      res.status(500).json({ message: "Failed to check audit gaps" });
    }
  });

  // Generate compliance report
  app.get("/api/audit-monitoring/compliance", requirePermission('audit', 'read'), async (req, res) => {
    try {
      const report = await auditMonitor.generateComplianceReport();
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate compliance report" });
    }
  });

  // Get audit health status
  app.get("/api/audit-monitoring/health", requirePermission('audit', 'read'), async (req, res) => {
    try {
      const stats = await auditMonitor.getAuditStats();
      const gaps = await auditMonitor.checkAuditGaps();
      
      const health = {
        status: 'healthy',
        totalOperations: stats.totalOperations,
        successRate: stats.totalOperations > 0 
          ? ((stats.successfulOperations / stats.totalOperations) * 100).toFixed(1)
          : '0',
        businessOperations: stats.businessOperations,
        securityEvents: stats.securityEvents,
        missingLogs: gaps.missingLogs.length,
        recommendations: gaps.recommendations.length,
        lastChecked: new Date().toISOString()
      };

      // Determine health status
      if (gaps.missingLogs.length > 0 || stats.securityEvents > 20) {
        health.status = 'warning';
      }
      if (gaps.missingLogs.length > 5 || stats.failedOperations > stats.successfulOperations) {
        health.status = 'critical';
      }

      res.json(health);
    } catch (error) {
      res.status(500).json({ 
        status: 'error',
        message: "Failed to check audit health",
        lastChecked: new Date().toISOString()
      });
    }
  });
}

