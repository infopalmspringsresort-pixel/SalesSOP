import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { loadUserPermissions } from "./middleware/rbac";
import { registerEnquiryRoutes } from "./features/enquiries/routes";
import { registerBookingRoutes } from "./features/bookings/routes";
import { registerReportRoutes } from "./features/reports/routes";
import { registerSettingsRoutes } from "./features/settings/routes";
import { registerSystemSettingsRoutes } from "./features/system-settings/routes";
import { registerAuditRoutes } from "./features/audit/routes";
import { registerMinimalAuditRoutes } from "./features/audit/minimal-routes.js";
import { registerAuditMonitoringRoutes } from "./features/audit/audit-monitoring";
import { registerPublicRoutes } from "./features/public/routes";
import menuRoutes from "./features/menus/routes";
import roomRoutes from "./features/rooms/routes";
import quotationRoutes from "./features/quotations/routes";
import quotationEmailRoutes from "./features/quotations/email-routes";

export async function registerRoutes(app: Express): Promise<Server> {
  const routesStartTime = Date.now();
  
  // Register audit routes BEFORE authentication to avoid RBAC issues
  registerMinimalAuditRoutes(app);
  
  // Register public routes BEFORE authentication
  console.log("About to register public routes...");
  registerPublicRoutes(app);
  console.log("Public routes registered successfully");
  
  // Auth middleware
  await setupAuth(app);
  // Public auth routes (no authentication required)
  // Forgot Password - Send verification token
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Log failed attempt for security monitoring - REMOVED
        // Don't reveal if email exists or not for security
        return res.json({ message: "If an account with that email exists, a verification code has been sent" });
      }

      // Generate 6-digit verification token
      const { generateVerificationToken, storeVerificationToken } = await import("./utils/passwordReset");
      const verificationToken = generateVerificationToken();
      
      // Store the token
      storeVerificationToken(verificationToken, user.id, user.email);

      // Send verification email
      const { emailService } = await import("./utils/emailService");
      const emailSent = await emailService.sendPasswordResetEmail(
        user.email,
        verificationToken,
        user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email
      );

      if (!emailSent) {
        // Log email failure - REMOVED
        return res.status(500).json({ message: "Failed to send verification email" });
      }

      // Log successful password reset request - REMOVED

      res.json({ message: "If an account with that email exists, a verification code has been sent" });
    } catch (error) {
      res.status(500).json({ message: "Failed to process forgot password request" });
    }
  });

  // Verify Token - Verify the 6-digit token
  app.post("/api/auth/verify-token", async (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ message: "Verification token is required" });
      }

      // Verify the token
      const { verifyAndConsumeToken } = await import("./utils/passwordReset");
      const tokenData = verifyAndConsumeToken(token);
      
      if (!tokenData) {
        return res.status(400).json({ message: "Invalid or expired verification token" });
      }

      // Generate a session token for password reset
      const { generatePasswordResetToken } = await import("./utils/passwordReset");
      const resetToken = generatePasswordResetToken(tokenData.userId, tokenData.email);

      res.json({ 
        message: "Token verified successfully", 
        resetToken: resetToken,
        userId: tokenData.userId 
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to verify token" });
    }
  });

  // Reset Password - Verify token and update password
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      // Verify the reset token
      const { verifyPasswordResetToken } = await import("./utils/passwordReset");
      const tokenData = verifyPasswordResetToken(token);
      if (!tokenData) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Validate password
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }

      // Hash the new password
      const bcryptjs = await import("bcryptjs");
      const passwordHash = await bcryptjs.hash(newPassword, 10);

      // Update user password
      const updatedUser = await storage.updateUser(tokenData.userId, { passwordHash });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "Password has been reset successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // (Removed test email endpoint for production readiness)

  // User Registration
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { firstName, lastName, email, password, role = 'salesperson' } = req.body;

      // Validate required fields
      if (!firstName || !email || !password) {
        return res.status(400).json({ 
          message: "First name, email, and password are required" 
        });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ 
          message: "User with this email already exists" 
        });
      }

      // Hash password
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user data
        const userData = {
          firstName,
          lastName: lastName || '',
          email: email.toLowerCase().trim(),
          passwordHash: hashedPassword,
          role,
          status: 'active' as const,
          authProvider: 'local' as const,
        };

      // Create user
      const user = await storage.createUser(userData);

      // Enhanced audit logging for user registration - REMOVED

      res.status(201).json({ 
        message: "User registered successfully",
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          status: user.status
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to register user" });
    }
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.user.email;
      const userId = req.user.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Get user with role information from database
      const userWithRole = await storage.getUserWithRole(userId);
      
      if (!userWithRole) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(userWithRole);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Dashboard metrics
  app.get("/api/dashboard/metrics", isAuthenticated, async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  // Register feature-based routes
  registerEnquiryRoutes(app);
  registerBookingRoutes(app);
  registerReportRoutes(app);
  registerSettingsRoutes(app);
  registerSystemSettingsRoutes(app);
  registerAuditRoutes(app);
  registerAuditMonitoringRoutes(app);
  
  // Register menu, room, and quotation management routes
  app.use('/api/menus', isAuthenticated, menuRoutes);
  app.use('/api/rooms', isAuthenticated, roomRoutes);
  app.use('/api/quotations', isAuthenticated, quotationRoutes);
  app.use('/api/quotations/email', isAuthenticated, quotationEmailRoutes);
  
  const httpServer = createServer(app);
  return httpServer;
}