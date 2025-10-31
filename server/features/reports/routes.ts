import type { Express } from "express";
import { storage } from "../../storage";
import { isAuthenticated } from "../../auth";
import { loadUserPermissions, requirePermission } from "../../middleware/rbac";

export function registerReportRoutes(app: Express) {
  // Apply RBAC middleware to all report routes
  app.use('/api/reports*', isAuthenticated, loadUserPermissions);

  app.get("/api/reports/enquiry-pipeline", async (req, res) => {
    try {
      const filters = {
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
      };
      const report = await storage.getEnquiryPipelineReport(filters);
      
      // Enhanced audit logging for report generation
      if (req.audit) {
        await req.audit.logBusinessAction('report_generated', 'reports', 'enquiry-pipeline', {
          reportType: 'enquiry_pipeline',
          filters: filters,
          recordCount: report?.total || 0,
          businessContext: true
        }, req);
      }
      
      res.json(report);
    } catch (error) {
      // Log failed report generation
      if (req.audit) {
        await req.audit.log({
          userId: (req as any).user?.id,
          userRole: (req as any).userRole || 'unknown',
          action: 'error_occurred',
          module: 'reports'
        });
      }
      
      res.status(500).json({ message: "Failed to generate enquiry pipeline report" });
    }
  });

  app.get("/api/reports/follow-up-performance", async (req, res) => {
    try {
      const filters = {
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
      };
      const report = await storage.getFollowUpPerformanceReport(filters);
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate follow-up performance report" });
    }
  });

  app.get("/api/reports/booking-analytics", async (req, res) => {
    try {
      const filters = {
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
      };
      const report = await storage.getBookingAnalyticsReport(filters);
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate booking analytics report" });
    }
  });

  app.get("/api/reports/team-performance", async (req, res) => {
    try {
      const filters = {
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
      };
      const report = await storage.getTeamPerformanceReport(filters);
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate team performance report" });
    }
  });

}