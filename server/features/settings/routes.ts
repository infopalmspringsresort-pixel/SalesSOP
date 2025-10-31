import type { Express } from "express";
import { storage } from "../../storage";
import { isAuthenticated } from "../../auth";
import { loadUserPermissions, requirePermission, requireAdmin } from "../../middleware/rbac";
import { insertUserSchema } from "@shared/schema-client";
import { z } from "zod";
import bcryptjs from "bcryptjs";

export function registerSettingsRoutes(app: Express) {
  // Role management routes - simplified for testing
  app.get("/api/roles", isAuthenticated, async (req, res) => {
    try {
      const roles = await storage.getRoles();
      res.json(roles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch roles" });
    }
  });

  // Admin-only: View all users
  app.get("/api/users", isAuthenticated, async (req, res) => {
    // Manual admin check instead of middleware
    const userWithRole = await storage.getUserWithRole(req.user.id);
    if (!userWithRole || userWithRole.role?.name !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    try {
      const users = await storage.getUsersWithRoles();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Transfer recipients: allow managers, salespeople, and admins to fetch eligible users
  app.get("/api/users/transfer-targets", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUserWithRole(req.user.id);
      const currentRole = currentUser?.role?.name;

      // Allow salesperson, manager, admin to call this endpoint
      if (!currentRole || !["salesperson", "manager", "admin"].includes(currentRole)) {
        console.log("/api/users/transfer-targets forbidden for role:", currentRole);
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const users = await storage.getUsersWithRoles();
      console.log("All users with roles:", users.map(u => ({
        id: u.id,
        name: u.firstName + ' ' + u.lastName,
        role: u.role,
        roleName: u.role?.name,
        email: u.email
      })));
      
      const eligible = users
        .filter((u: any) => {
          const roleName = u.role?.name || u.role;
          console.log(`User ${u.firstName} ${u.lastName}: role=${u.role}, roleName=${roleName}`);
          // Return only salespeople and managers as potential recipients
          return ["salesperson", "manager"].includes(roleName);
        })
        .filter((u: any) => u.id !== req.user.id); // exclude self
      console.log(`/api/users/transfer-targets role=${currentRole} returned`, eligible.length, "users");
      res.json(eligible);
    } catch (error) {
      console.error("/api/users/transfer-targets error:", error);
      res.status(500).json({ message: "Failed to fetch transfer targets" });
    }
  });

  // Admin-only: Create new user
  app.post("/api/users", isAuthenticated, async (req: any, res) => {
    // Manual admin check instead of middleware
    const userWithRole = await storage.getUserWithRole(req.user.id);
    if (!userWithRole || userWithRole.role?.name !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    try {
      // Validate password separately
      const { password, ...userData } = req.body;
      
      if (!password || typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' });
      }
      
      const validatedData = insertUserSchema.parse(userData);
      
      // Prevent assignment of admin role - only one super admin allowed
      if (validatedData.roleId) {
        const role = await storage.getRoleById(validatedData.roleId);
        if (role && role.name === 'admin') {
          return res.status(400).json({ message: 'Cannot create another admin user. Only one super admin is allowed.' });
        }
      }
      
      // Normalize email to lowercase for case-insensitive comparison
      if (validatedData.email) {
        validatedData.email = validatedData.email.toLowerCase().trim();
      }
      
      // Check if user already exists
      if (validatedData.email) {
        const existingUser = await storage.getUserByEmail(validatedData.email);
        if (existingUser) {
          return res.status(400).json({ message: 'User with this email already exists' });
        }
      }
      
      // Hash the password
      const passwordHash = await bcryptjs.hash(password, 10);
      
      // Create user data with password hash and set auth provider to local
      const userDataWithPassword = {
        ...validatedData,
        passwordHash,
        authProvider: 'local' as const,
      };
      
      const user = await storage.createUser(userDataWithPassword);
      
      // Enhanced audit logging for user creation - REMOVED
      
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Admin-only: Update user (status, profile, etc.)
  app.patch("/api/users/:id", isAuthenticated, async (req: any, res) => {
    // Manual admin check instead of middleware
    const userWithRole = await storage.getUserWithRole(req.user.id);
    if (!userWithRole || userWithRole.role?.name !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    try {
      const { id } = req.params;
      
      // Prevent assignment of admin role through user update - only one super admin allowed
      if (req.body.roleId) {
        const role = await storage.getRoleById(req.body.roleId);
        if (role && role.name === 'admin') {
          return res.status(400).json({ message: 'Cannot assign admin role. Only one super admin is allowed.' });
        }
      }
      
      // Get old user data for comparison
      const oldUser = await storage.getUserWithRole(id);
      const user = await storage.updateUser(id, req.body);
      
      // Enhanced audit logging for user updates - REMOVED
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Admin-only: Assign user role
  app.patch("/api/users/:id/role", isAuthenticated, async (req: any, res) => {
    // Manual admin check instead of middleware
    const userWithRole = await storage.getUserWithRole(req.user.id);
    if (!userWithRole || userWithRole.role?.name !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    try {
      const { id } = req.params;
      const { roleId } = req.body;
      
      // Prevent assignment of admin role - only one super admin allowed
      if (roleId) {
        const role = await storage.getRoleById(roleId);
        if (role && role.name === 'admin') {
          return res.status(400).json({ message: 'Cannot assign admin role. Only one super admin is allowed.' });
        }
      }
      
      // Get old user data for comparison
      const oldUser = await storage.getUserWithRole(id);
      const user = await storage.assignUserRole(id, roleId);
      
      // Enhanced audit logging for role assignment - REMOVED
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to assign role" });
    }
  });

  // Admin-only: Deactivate/Delete user
  app.delete("/api/users/:id", isAuthenticated, async (req: any, res) => {
    // Manual admin check instead of middleware
    const userWithRole = await storage.getUserWithRole(req.user.id);
    if (!userWithRole || userWithRole.role?.name !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    try {
      const { id } = req.params;
      
      // Prevent deleting/deactivating the super admin
      const user = await storage.getUserWithRole(id);
      if (user && user.role && user.role.name === 'admin') {
        return res.status(400).json({ message: 'Cannot deactivate the super admin user.' });
      }
      
      const deactivatedUser = await storage.deactivateUser(id);
      res.json(deactivatedUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to deactivate user" });
    }
  });

  // System audit log routes - TODO: Implement when audit system is ready
  // app.get("/api/audit", requirePermission('audit', 'view'), async (req, res) => {
  //   try {
  //     const logs = await storage.getSystemAuditLogs();
  //     res.json(logs);
  //   } catch (error) {
  //     //     res.status(500).json({ message: "Failed to fetch audit logs" });
  //   }
  // });

  // Admin-only: Reset user password
  app.post("/api/auth/admin-reset-password", isAuthenticated, async (req: any, res) => {
    // Manual admin check instead of middleware
    const userWithRole = await storage.getUserWithRole(req.user.id);
    if (!userWithRole || userWithRole.role?.name !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    try {
      const { userId, newPassword } = req.body;
      
      if (!userId || !newPassword) {
        return res.status(400).json({ message: 'User ID and new password are required' });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' });
      }
      
      // Hash the new password
      const passwordHash = await bcryptjs.hash(newPassword, 10);
      
      // Update user password
      const updatedUser = await storage.updateUser(userId, { passwordHash });
      
      res.json({ message: 'Password reset successfully', user: updatedUser });
    } catch (error) {
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // (Removed debug endpoint for production readiness)

  // Admin-only: Export customer data for Excel
  app.get("/api/export/customers", isAuthenticated, async (req, res) => {
    try {
      // Check if user is admin
      const userWithRole = await storage.getUserWithRole(req.user.id);
      if (!userWithRole || userWithRole.role?.name !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      // Get filters from query parameters (optional)
      const { dateFrom, dateTo, eventType } = req.query;
      
      // Get all enquiries (customer data)
      const enquiries = await storage.getEnquiries();
      
      // Filter by date range if provided
      let filteredEnquiries = enquiries;
      if (dateFrom && dateTo) {
        const fromDate = new Date(dateFrom as string);
        const toDate = new Date(dateTo as string);
        filteredEnquiries = filteredEnquiries.filter(enquiry => {
          const enquiryDate = new Date(enquiry.enquiryDate);
          return enquiryDate >= fromDate && enquiryDate <= toDate;
        });
      }
      
      // Filter by event type if provided
      const eventTypeStr = typeof eventType === 'string' ? eventType : Array.isArray(eventType) ? (eventType[0] as string) : '';
      if (eventTypeStr && eventTypeStr !== 'all') {
        const beforeCount = filteredEnquiries.length;
        filteredEnquiries = filteredEnquiries.filter(enquiry => {
          const enquiryEventType = (enquiry.eventType || '').trim();
          return enquiryEventType.toLowerCase() === eventTypeStr.toLowerCase();
        });
        const afterCount = filteredEnquiries.length;
        console.log(`Event type filter "${eventTypeStr}": ${beforeCount} -> ${afterCount} enquiries`);
      }
      
      // Format customer data
      const customerData = filteredEnquiries.map(enquiry => ({
        customerName: enquiry.clientName || 'N/A',
        location: (enquiry as any).city || 'N/A',
        phone: enquiry.contactNumber || 'N/A',
        email: enquiry.email || 'N/A',
        eventType: enquiry.eventType || 'N/A'
      }));
      
      // Log first 3 records

      res.json({
        success: true,
        data: customerData,
        count: customerData.length,
        dateRange: dateFrom && dateTo ? { from: dateFrom, to: dateTo } : null,
        eventType: eventTypeStr && eventTypeStr !== 'all' ? eventTypeStr : null
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to export customer data" });
    }
  });

}