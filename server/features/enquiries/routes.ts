import type { Express } from "express";
import { storage } from "../../storage";
import { isAuthenticated } from "../../auth";
import { loadUserPermissions, requirePermission } from "../../middleware/rbac";
import { insertEnquirySchema, insertFollowUpHistorySchema } from "@shared/schema-client";
import { getCollection } from "../../mongo";
import { z } from "zod";

export function registerEnquiryRoutes(app: Express) {
  // Apply RBAC middleware to all enquiry routes
  app.use('/api/enquiries*', isAuthenticated, loadUserPermissions);
  app.use('/api/follow-ups*', isAuthenticated, loadUserPermissions);

  // Enquiry CRUD operations
  app.post("/api/enquiries", requirePermission('enquiries', 'create'), async (req: any, res) => {
    try {
      // Convert date strings to Date objects before validation
      const processedData = { ...req.body };
      if (processedData.enquiryDate && typeof processedData.enquiryDate === 'string') {
        processedData.enquiryDate = new Date(processedData.enquiryDate);
      }
      if (processedData.eventDate && typeof processedData.eventDate === 'string') {
        processedData.eventDate = new Date(processedData.eventDate);
      }
      if (processedData.tentativeDates && Array.isArray(processedData.tentativeDates)) {
        processedData.tentativeDates = processedData.tentativeDates.map((date: any) => 
          typeof date === 'string' ? new Date(date) : date
        );
      }
      if (processedData.eventEndDate && typeof processedData.eventEndDate === 'string') {
        processedData.eventEndDate = new Date(processedData.eventEndDate);
      }
      if (processedData.eventDates && Array.isArray(processedData.eventDates)) {
        processedData.eventDates = processedData.eventDates.map((date: any) => 
          typeof date === 'string' ? new Date(date) : date
        );
      }
      // Convert session dates to Date objects
      if (processedData.sessions && Array.isArray(processedData.sessions)) {
        processedData.sessions = processedData.sessions.map((session: any) => ({
          ...session,
          sessionDate: typeof session.sessionDate === 'string' ? new Date(session.sessionDate) : session.sessionDate
        }));
        } else {
        }
      
      const dataToValidate = {
        ...processedData,
        salespersonId: processedData.salespersonId || (req.user.provider === 'local' || req.user.provider === 'google' || req.user.provider === 'github' ? (req.user.provider === 'google' ? req.user.profile?.sub : req.user.provider === 'github' ? req.user.profile?.id?.toString() : req.user.profile?.id) : req.user.claims?.sub),
      };
      
      // Collision check (blocking only) before creation
      if (processedData.sessions && Array.isArray(processedData.sessions) && processedData.sessions.length > 0) {
        const toYMD = (d: any) => {
          const dt = d instanceof Date ? d : new Date(d);
          const y = dt.getFullYear(); const m = String(dt.getMonth()+1).padStart(2,'0'); const day = String(dt.getDate()).padStart(2,'0');
          return `${y}-${m}-${day}`;
        };
        const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) => aStart < bEnd && aEnd > bStart;
        const candidate = (processedData.sessions as any[]).filter(s => s.venue && s.sessionDate && s.startTime && s.endTime)
          .map(s => ({ venue: s.venue, date: toYMD(s.sessionDate), start: s.startTime, end: s.endTime }));

        if (candidate.length > 0) {
          const enquiriesCol = await getCollection<any>('enquiries');
          const bookingsCol = await getCollection<any>('bookings');
          const venues = Array.from(new Set(candidate.map(c => c.venue)));
          const dates = Array.from(new Set(candidate.map(c => c.date)));

          // Fetch booked bookings with sessions roughly matching venues/dates
          const bookings = await bookingsCol.find({ status: 'booked' }).toArray();
          let hasBlocking = false;
          for (const b of bookings) {
            const bs = (b.sessions || []).filter((s: any) => s.venue && s.sessionDate && s.startTime && s.endTime);
            for (const c of candidate) {
              for (const s of bs) {
                if (s.venue === c.venue && toYMD(s.sessionDate) === c.date && overlaps(c.start, c.end, s.startTime, s.endTime)) {
                  hasBlocking = true;
                }
              }
            }
          }
          // Fetch converted enquiries (ignore lost/closed)
          const enquiries = await enquiriesCol.find({ status: { $in: ['converted'] } }).toArray();
          for (const e of enquiries) {
            const es = (e.sessions || []).filter((s: any) => s.venue && s.sessionDate && s.startTime && s.endTime);
            for (const c of candidate) {
              for (const s of es) {
                if (s.venue === c.venue && toYMD(s.sessionDate) === c.date && overlaps(c.start, c.end, s.startTime, s.endTime)) {
                  hasBlocking = true;
                }
              }
            }
          }
          if (hasBlocking) {
            return res.status(409).json({ message: 'Venue collision with existing converted/booked record. Creation blocked.' });
          }
        }
      }

      // Create a modified schema that makes enquiryNumber optional
      const createEnquirySchema = insertEnquirySchema.omit({ enquiryNumber: true });
      const validatedData = createEnquirySchema.parse(dataToValidate);
      const enquiry = await storage.createEnquiry(validatedData);
      
      // Enhanced audit logging for enquiry creation
      if (req.audit) {
        await req.audit.logBusinessAction('enquiry_created', 'enquiries', enquiry.id, {
          enquiryNumber: enquiry.enquiryNumber,
          clientName: enquiry.clientName,
          eventType: enquiry.eventType,
          expectedPax: enquiry.expectedPax,
          source: enquiry.source,
          salespersonId: enquiry.salespersonId,
          businessContext: true
        }, req);
      }
      
      res.status(201).json(enquiry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create enquiry" });
    }
  });

  app.get("/api/enquiries", requirePermission('enquiries', 'read'), async (req: any, res) => {
    try {
      const enquiries = await storage.getEnquiries(req.query);
      res.json(enquiries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch enquiries" });
    }
  });

  // Search for previous enquiry by contact number
  app.get("/api/enquiries/search-by-phone", requirePermission('enquiries', 'read'), async (req: any, res) => {
    try {
      const { phone } = req.query;
      if (!phone) {
        return res.status(400).json({ message: "Phone number is required" });
      }

      const enquiries = await getCollection<any>('enquiries');
      
      // Find the most recent enquiry with this contact number
      // Contact number format is typically "+91 1234567890" so we need to match it properly
      const previousEnquiry = await enquiries.findOne(
        { contactNumber: phone },
        { sort: { createdAt: -1 } } // Get most recent first
      );

      if (previousEnquiry) {
        // Return relevant fields for prefilling
        res.json({
          found: true,
          clientName: previousEnquiry.clientName || "",
          email: previousEnquiry.email || "",
          city: previousEnquiry.city || "",
          contactNumber: previousEnquiry.contactNumber || phone,
        });
      } else {
        res.json({ found: false });
      }
    } catch (error: any) {
      console.error("Search by phone error:", error);
      res.status(500).json({ message: "Failed to search enquiries" });
    }
  });

  // Get transfer requests for current user (sender or recipient) - MUST BE BEFORE /api/enquiries/:id
  app.get("/api/enquiries/transfers", async (req: any, res) => {
    try {
      const userId = req.user?.id || "68df4ada812332fb4d31c8b3"; // Fallback to Manager One for debugging
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      const transfers = await storage.getEnquiryTransfersByUser(userId);
      
      // Populate enquiry and user information for each transfer
      const populatedTransfers = await Promise.all(
        transfers.map(async (transfer: any) => {
          const result: any = {
            ...transfer,
            enquiry: null,
            fromUser: null,
            toUser: null,
          };
          
          // Fetch enquiry information
          if (transfer.enquiryId) {
            try {
              const enquiry = await storage.getEnquiryById(transfer.enquiryId);
              if (enquiry) {
                result.enquiry = {
                  id: enquiry.id || enquiry._id?.toString(),
                  enquiryNumber: enquiry.enquiryNumber || null,
                  clientName: enquiry.clientName || null,
                };
              }
            } catch (error: any) {
              console.error(`[Transfer API] Error fetching enquiry ${transfer.enquiryId}:`, error?.message || error);
            }
          }
          
          // Fetch from user information
          if (transfer.fromUserId) {
            try {
              const userWithRole = await storage.getUserWithRole(transfer.fromUserId);
              if (userWithRole) {
                result.fromUser = {
                  id: userWithRole.id,
                  firstName: userWithRole.firstName || null,
                  lastName: userWithRole.lastName || null,
                  email: userWithRole.email || null,
                };
              }
            } catch (error: any) {
              console.error(`[Transfer API] Error fetching from user ${transfer.fromUserId}:`, error?.message || error);
              // Try fallback
              try {
                const user = await storage.getUser(transfer.fromUserId);
                if (user) {
                  result.fromUser = {
                    id: (user as any).id,
                    firstName: (user as any).firstName || null,
                    lastName: (user as any).lastName || null,
                    email: (user as any).email || null,
                  };
                }
              } catch (fallbackError: any) {
                console.error(`[Transfer API] Fallback error for from user ${transfer.fromUserId}:`, fallbackError?.message || fallbackError);
              }
            }
          }
          
          // Fetch to user information
          if (transfer.toUserId) {
            try {
              const userWithRole = await storage.getUserWithRole(transfer.toUserId);
              if (userWithRole) {
                result.toUser = {
                  id: userWithRole.id,
                  firstName: userWithRole.firstName || null,
                  lastName: userWithRole.lastName || null,
                  email: userWithRole.email || null,
                };
              }
            } catch (error: any) {
              console.error(`[Transfer API] Error fetching to user ${transfer.toUserId}:`, error?.message || error);
              // Try fallback
              try {
                const user = await storage.getUser(transfer.toUserId);
                if (user) {
                  result.toUser = {
                    id: (user as any).id,
                    firstName: (user as any).firstName || null,
                    lastName: (user as any).lastName || null,
                    email: (user as any).email || null,
                  };
                }
              } catch (fallbackError: any) {
                console.error(`[Transfer API] Fallback error for to user ${transfer.toUserId}:`, fallbackError?.message || fallbackError);
              }
            }
          }
          
          return result;
        })
      );
      
      res.json(populatedTransfers);
    } catch (error: any) {
      console.error("Get transfers error:", error?.message || error);
      res.status(500).json({ message: "Failed to fetch transfers" });
    }
  });

  app.get("/api/enquiries/:id", requirePermission('enquiries', 'read'), async (req, res) => {
    try {
      const enquiry = await storage.getEnquiryById(req.params.id);
      if (!enquiry) {
        return res.status(404).json({ message: "Enquiry not found" });
      }
      res.json(enquiry);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch enquiry" });
    }
  });

  // Check for venue conflicts for an enquiry
  app.post("/api/enquiries/check-conflicts", requirePermission('enquiries', 'read'), async (req, res) => {
    try {
      const { enquiryId, tentativeDates, venues } = req.body;
      
      if (!tentativeDates || !Array.isArray(tentativeDates) || tentativeDates.length === 0) {
        return res.json({ hasConflict: false, conflicts: [] });
      }

      const conflictCheck = await storage.checkEnquiryVenueConflicts({
        enquiryId,
        tentativeDates: tentativeDates.map((d: string) => new Date(d)),
        venues: venues || []
      });

      res.json(conflictCheck);
    } catch (error) {
      res.status(500).json({ message: "Failed to check conflicts" });
    }
  });

  app.patch("/api/enquiries/:id", requirePermission('enquiries', 'update'), async (req: any, res) => {
    try {
      // Convert date strings to Date objects before updating
      const processedData = { ...req.body };
      if (processedData.enquiryDate && typeof processedData.enquiryDate === 'string') {
        processedData.enquiryDate = new Date(processedData.enquiryDate);
      }
      if (processedData.eventDate && typeof processedData.eventDate === 'string') {
        processedData.eventDate = new Date(processedData.eventDate);
      }
      if (processedData.tentativeDates && Array.isArray(processedData.tentativeDates)) {
        processedData.tentativeDates = processedData.tentativeDates.map((date: any) => 
          typeof date === 'string' ? new Date(date) : date
        );
      }
      if (processedData.eventEndDate && typeof processedData.eventEndDate === 'string') {
        processedData.eventEndDate = new Date(processedData.eventEndDate);
      }
      if (processedData.eventDates && Array.isArray(processedData.eventDates)) {
        processedData.eventDates = processedData.eventDates.map((date: any) => 
          typeof date === 'string' ? new Date(date) : date
        );
      }
      // Convert session dates to Date objects
      if (processedData.sessions && Array.isArray(processedData.sessions)) {
        processedData.sessions = processedData.sessions.map((session: any) => ({
          ...session,
          sessionDate: typeof session.sessionDate === 'string' ? new Date(session.sessionDate) : session.sessionDate
        }));
        }
      
      // Collision check (blocking only) when updating sessions
      if (processedData.sessions && Array.isArray(processedData.sessions) && processedData.sessions.length > 0) {
        const toYMD = (d: any) => {
          const dt = d instanceof Date ? d : new Date(d);
          const y = dt.getFullYear(); const m = String(dt.getMonth()+1).padStart(2,'0'); const day = String(dt.getDate()).padStart(2,'0');
          return `${y}-${m}-${day}`;
        };
        const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) => aStart < bEnd && aEnd > bStart;
        const candidate = (processedData.sessions as any[]).filter(s => s.venue && s.sessionDate && s.startTime && s.endTime)
          .map(s => ({ venue: s.venue, date: toYMD(s.sessionDate), start: s.startTime, end: s.endTime }));

        if (candidate.length > 0) {
          const enquiriesCol = await getCollection<any>('enquiries');
          const bookingsCol = await getCollection<any>('bookings');

          // Check booked bookings
          const bookings = await bookingsCol.find({ status: 'booked' }).toArray();
          let hasBlocking = false;
          for (const b of bookings) {
            const bs = (b.sessions || []).filter((s: any) => s.venue && s.sessionDate && s.startTime && s.endTime);
            for (const c of candidate) {
              for (const s of bs) {
                if (s.venue === c.venue && toYMD(s.sessionDate) === c.date && overlaps(c.start, c.end, s.startTime, s.endTime)) {
                  hasBlocking = true;
                }
              }
            }
          }
          // Check converted enquiries (exclude self)
          const currentId = req.params.id;
          const converted = await enquiriesCol.find({ status: { $in: ['converted'] } }).toArray();
          for (const e of converted) {
            if (e._id?.toString && e._id.toString() === currentId) continue;
            const es = (e.sessions || []).filter((s: any) => s.venue && s.sessionDate && s.startTime && s.endTime);
            for (const c of candidate) {
              for (const s of es) {
                if (s.venue === c.venue && toYMD(s.sessionDate) === c.date && overlaps(c.start, c.end, s.startTime, s.endTime)) {
                  hasBlocking = true;
                }
              }
            }
          }
          if (hasBlocking) {
            return res.status(409).json({ message: 'Venue collision with existing converted/booked record. Update blocked.' });
          }
        }
      }
      
      // Handle FCFS (First Come First Served) for enquiry acceptance
      if (processedData.assignmentStatus === 'accepted') {
        const existingEnquiry = await storage.getEnquiryById(req.params.id);
        if (existingEnquiry && existingEnquiry.assignmentStatus === 'accepted') {
          return res.status(409).json({ 
            message: "Enquiry has already been accepted by another salesperson",
            error: "ENQUIRY_ALREADY_ACCEPTED"
          });
        }
      }

      // Handle different authentication providers
      let userId: string | undefined;
      
      // Try to extract user ID from various possible locations
      userId = req.user.id || req.user._id?.toString();
      // If not found, try provider-specific extraction
      if (!userId) {
        if (req.user.provider === 'local' || req.user.provider === 'google' || req.user.provider === 'github') {
          if (req.user.provider === 'google') {
            userId = req.user.profile?.sub;
            } else if (req.user.provider === 'github') {
            userId = req.user.profile?.id?.toString();
            } else {
            userId = req.user.profile?.id;
            }
        } else {
          userId = req.user.claims?.sub;
          }
      }
      
      if (!userId) {
        }
      
      const enquiry = await storage.updateEnquiryWithStatusHistory(req.params.id, processedData, userId);
      
      // Enhanced audit logging for enquiry updates
      if (req.audit) {
        // Get old enquiry data for comparison
        const oldEnquiry = await storage.getEnquiryById(req.params.id);
        
        await req.audit.logDataChange(oldEnquiry, enquiry, 'enquiry_updated', 'enquiries', enquiry.id, req);
        
        // Log specific business actions
        if (req.body.status) {
          await req.audit.logBusinessAction('enquiry_status_changed', 'enquiries', enquiry.id, {
            fromStatus: oldEnquiry?.status,
            toStatus: req.body.status,
            enquiryNumber: enquiry.enquiryNumber,
            clientName: enquiry.clientName,
            businessContext: true
          }, req);
        }
      }
      
      res.json(enquiry);
    } catch (error) {
      console.error("Error updating enquiry:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update enquiry";
      res.status(500).json({ message: "Failed to update enquiry", error: errorMessage });
    }
  });

  app.delete("/api/enquiries/:id", requirePermission('enquiries', 'delete'), async (req: any, res) => {
    try {
      const enquiry = await storage.getEnquiryById(req.params.id);
      await storage.updateEnquiry(req.params.id, { status: 'cancelled' });
      
      // Enhanced audit logging for enquiry cancellation
      if (req.audit && enquiry) {
        // Handle different authentication providers
        let userId: string;
        if (req.user.provider === 'local' || req.user.provider === 'google' || req.user.provider === 'github') {
          if (req.user.provider === 'google') {
            userId = req.user.profile?.sub;
          } else if (req.user.provider === 'github') {
            userId = req.user.profile?.id?.toString();
          } else {
            userId = req.user.profile?.id;
          }
        } else {
          userId = req.user.claims?.sub;
        }
        await req.audit.logCRUD('deleted', 'enquiries', 'enquiry', req.params.id, userId || 'unknown', req.userRole || 'unknown', req, {
          enquiryNumber: enquiry.enquiryNumber,
          clientName: enquiry.clientName,
          reason: 'Cancelled via API',
        });
      }
      
      res.json({ message: "Enquiry cancelled successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to cancel enquiry" });
    }
  });

  // Reopen enquiry
  app.post("/api/enquiries/:id/reopen", requirePermission('enquiries', 'update'), async (req: any, res) => {
    try {
      const { reason, notes } = req.body;
      // Handle different authentication providers
      let userId: string;
      if (req.user.provider === 'local' || req.user.provider === 'google' || req.user.provider === 'github') {
        if (req.user.provider === 'google') {
          userId = req.user.profile?.sub;
        } else if (req.user.provider === 'github') {
          userId = req.user.profile?.id?.toString();
        } else {
          userId = req.user.profile?.id;
        }
      } else {
        userId = req.user.claims?.sub;
      }
      const enquiry = await storage.reopenEnquiry(req.params.id, reason || "", notes || "", userId);
      res.json(enquiry);
    } catch (error) {
      res.status(500).json({ message: "Failed to reopen enquiry" });
    }
  });

  // Follow-up operations
  app.get("/api/follow-ups", async (req, res) => {
    try {
      const followUps = await storage.getAllFollowUps();
      res.json(followUps);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch follow-ups" });
    }
  });

  // Complete all follow-ups for an enquiry
  app.post("/api/enquiries/:id/complete-all-followups", requirePermission('enquiries', 'update'), async (req: any, res) => {
    try {
      // Handle different authentication providers
      let userId: string;
      if (req.user.provider === 'local' || req.user.provider === 'google' || req.user.provider === 'github') {
        if (req.user.provider === 'google') {
          userId = req.user.profile?.sub;
        } else if (req.user.provider === 'github') {
          userId = req.user.profile?.id?.toString();
        } else {
          userId = req.user.profile?.id;
        }
      } else {
        userId = req.user.claims?.sub;
      }
      await storage.completeAllFollowUpsForEnquiry(req.params.id, userId);
      
      // Enhanced audit logging for completing all follow-ups
      if (req.audit) {
        await req.audit.logCRUD('updated', 'enquiries', 'follow_ups', req.params.id, userId, req.userRole || 'unknown', req, {
          action: 'completed_all_followups',
          reason: 'Status change completion',
        });
      }
      
      res.json({ message: "All follow-ups completed successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to complete all follow-ups" });
    }
  });

  app.post("/api/follow-ups", requirePermission('enquiries', 'update'), async (req: any, res) => {
    try {
      // Convert date strings to Date objects before validation
      const processedData = { ...req.body };
      if (processedData.followUpDate && typeof processedData.followUpDate === 'string') {
        processedData.followUpDate = new Date(processedData.followUpDate);
      }
      if (processedData.repeatEndDate && typeof processedData.repeatEndDate === 'string') {
        processedData.repeatEndDate = new Date(processedData.repeatEndDate);
      }
      if (processedData.completedAt && typeof processedData.completedAt === 'string') {
        processedData.completedAt = new Date(processedData.completedAt);
      }
      
      const dataToValidate = {
        ...processedData,
        setById: processedData.setById || (req.user.provider === 'local' || req.user.provider === 'google' || req.user.provider === 'github' ? (req.user.provider === 'google' ? req.user.profile?.sub : req.user.provider === 'github' ? req.user.profile?.id?.toString() : req.user.profile?.id) : req.user.claims?.sub),
      };
      const validatedData = insertFollowUpHistorySchema.parse(dataToValidate);
      const followUp = await storage.createFollowUpHistory(validatedData);
      res.status(201).json(followUp);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create follow-up" });
    }
  });

  app.patch("/api/follow-ups/:id/complete", requirePermission('enquiries', 'update'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      // Handle different authentication providers
      let completedById: string;
      if (req.user.provider === 'local' || req.user.provider === 'google' || req.user.provider === 'github') {
        if (req.user.provider === 'google') {
          completedById = req.user.profile?.sub;
        } else if (req.user.provider === 'github') {
          completedById = req.user.profile?.id?.toString();
        } else {
          completedById = req.user.profile?.id;
        }
      } else {
        completedById = req.user.claims?.sub;
      }
      
      const followUp = await storage.markFollowUpCompleted(id, completedById, notes);
      res.json(followUp);
    } catch (error) {
      res.status(500).json({ message: "Failed to mark follow-up complete" });
    }
  });

  app.post("/api/follow-ups/:id/reschedule", requirePermission('enquiries', 'update'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { followUpDate, followUpTime, notes } = req.body;
      // Handle different authentication providers
      let setById: string;
      if (req.user.provider === 'local' || req.user.provider === 'google' || req.user.provider === 'github') {
        if (req.user.provider === 'google') {
          setById = req.user.profile?.sub;
        } else if (req.user.provider === 'github') {
          setById = req.user.profile?.id?.toString();
        } else {
          setById = req.user.profile?.id;
        }
      } else {
        setById = req.user.claims?.sub;
      }
      
      const followUp = await storage.rescheduleFollowUp(id, {
        followUpDate: new Date(followUpDate),
        followUpTime,
        notes,
        setById
      });
      res.json(followUp);
    } catch (error) {
      res.status(500).json({ message: "Failed to reschedule follow-up" });
    }
  });

  // Get follow-ups for a specific enquiry
  app.get("/api/enquiries/:id/follow-ups", async (req, res) => {
    try {
      const { id } = req.params;
      const followUps = await storage.getFollowUpHistoryByEnquiry(id);
      res.json(followUps);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch enquiry follow-ups" });
    }
  });

  // Get follow-up stats for a specific enquiry  
  app.get("/api/enquiries/:id/follow-up-stats", async (req, res) => {
    try {
      const { id } = req.params;
      const followUps = await storage.getFollowUpHistoryByEnquiry(id);
      const total = followUps.length;
      const completed = followUps.filter(f => f.completed).length;
      res.json({ total, completed });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch enquiry follow-up stats" });
    }
  });

  // Get audit log for a specific enquiry
  app.get("/api/enquiries/:id/audit-log", async (req, res) => {
    try {
      const { id } = req.params;
      const auditLog = await storage.getAuditLogByEnquiry(id);
      res.json(auditLog);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch enquiry audit log" });
    }
  });

  // Claim enquiry (for employees to claim unassigned enquiries)
  app.post("/api/enquiries/:id/claim", requirePermission('enquiries', 'update'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Get the enquiry
      const enquiry = await storage.getEnquiryById(id);
      if (!enquiry) {
        return res.status(404).json({ message: "Enquiry not found" });
      }

      // Check if enquiry is already claimed
      if (enquiry.assignmentStatus === 'assigned' && enquiry.salespersonId) {
        return res.status(400).json({ 
          message: "This enquiry is already claimed by another employee" 
        });
      }

      // Claim the enquiry
      const updatedEnquiry = await storage.updateEnquiry(id, {
        salespersonId: userId,
        assignmentStatus: 'assigned',
        assignedTo: userId,
      });

      // Enhanced audit logging for enquiry claiming
      if (req.audit) {
        await req.audit.logBusinessAction('enquiry_claimed', 'enquiries', id, {
          enquiryNumber: enquiry.enquiryNumber,
          clientName: enquiry.clientName,
          claimedBy: userId,
          previousStatus: enquiry.assignmentStatus,
          newStatus: 'assigned',
          businessContext: true
        }, req);
      }

      res.json({
        success: true,
        message: "Enquiry claimed successfully",
        data: updatedEnquiry
      });
    } catch (error) {
      console.error("Enquiry claiming error:", error);
      res.status(500).json({ message: "Failed to claim enquiry" });
    }
  });

  // Unclaim enquiry (for employees to release a claimed enquiry)
  app.post("/api/enquiries/:id/unclaim", requirePermission('enquiries', 'update'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Get the enquiry
      const enquiry = await storage.getEnquiryById(id);
      if (!enquiry) {
        return res.status(404).json({ message: "Enquiry not found" });
      }

      // Check if the user is the one who claimed it
      if (enquiry.salespersonId !== userId) {
        return res.status(403).json({ 
          message: "You can only unclaim enquiries that you have claimed" 
        });
      }

      // Unclaim the enquiry
      const updatedEnquiry = await storage.updateEnquiry(id, {
        salespersonId: null,
        assignmentStatus: 'unassigned',
        assignedTo: null,
      });

      // Enhanced audit logging for enquiry unclaiming
      if (req.audit) {
        await req.audit.logBusinessAction('enquiry_unclaimed', 'enquiries', id, {
          enquiryNumber: enquiry.enquiryNumber,
          clientName: enquiry.clientName,
          unclaimedBy: userId,
          previousStatus: enquiry.assignmentStatus,
          newStatus: 'unassigned',
          businessContext: true
        }, req);
      }

      res.json({
        success: true,
        message: "Enquiry unclaimed successfully",
        data: updatedEnquiry
      });
    } catch (error) {
      console.error("Enquiry unclaiming error:", error);
      res.status(500).json({ message: "Failed to unclaim enquiry" });
    }
  });

  // Enquiry Transfer Routes
  // Create transfer request
  app.post("/api/enquiries/:id/transfer", async (req: any, res) => {
    try {
      const enquiryId = req.params.id;
      const { toUserId, transferReason } = req.body;
      const fromUserId = req.user.id;

      // Validate required fields
      if (!toUserId) {
        return res.status(400).json({ 
          error: "VALIDATION_ERROR",
          message: "Recipient is required",
          code: "MISSING_RECIPIENT"
        });
      }

      // Check if user can transfer this enquiry
      const enquiry = await storage.getEnquiryById(enquiryId);
      if (!enquiry) {
        return res.status(404).json({ 
          error: "ENQUIRY_NOT_FOUND",
          message: "Enquiry not found",
          code: "ENQUIRY_NOT_FOUND"
        });
      }

      // Check if trying to transfer to self
      if (toUserId === fromUserId) {
        return res.status(400).json({
          error: "INVALID_TRANSFER",
          message: "You cannot transfer an enquiry to yourself",
          code: "SELF_TRANSFER_NOT_ALLOWED"
        });
      }

      const userRole = req.userRole;
      const isOwner = (enquiry as any).salespersonId === fromUserId 
        || (enquiry as any).assignedTo === fromUserId 
        || (enquiry as any).createdBy === fromUserId;

      const isAdmin = userRole === 'admin';

      // Permission check: Admin can transfer any enquiry, others can only transfer their own
      if (!isAdmin && !isOwner) {
        return res.status(403).json({ 
          error: "INSUFFICIENT_PERMISSIONS",
          message: "You can only transfer enquiries you own",
          code: "NOT_ENQUIRY_OWNER"
        });
      }

      // Check if there's already a pending transfer for this enquiry
      const existingTransfers = await storage.getEnquiryTransfersByEnquiry(enquiryId);
      const pendingTransfer = existingTransfers.find(t => t.status === 'pending');
      if (pendingTransfer) {
        return res.status(409).json({ 
          error: "TRANSFER_CONFLICT",
          message: "There is already a pending transfer request for this enquiry. Please wait for it to be resolved before creating a new one.",
          code: "PENDING_TRANSFER_EXISTS",
          details: {
            existingTransferId: pendingTransfer.id,
            requestedBy: pendingTransfer.fromUser?.firstName + ' ' + pendingTransfer.fromUser?.lastName,
            requestedAt: pendingTransfer.requestedAt
          }
        });
      }

      // Check if enquiry is in a transferable state
      if (enquiry.status === 'cancelled' || enquiry.status === 'closed') {
        return res.status(400).json({
          error: "INVALID_ENQUIRY_STATE",
          message: `Cannot transfer enquiry in '${enquiry.status}' status. Only active enquiries can be transferred.`,
          code: "ENQUIRY_NOT_TRANSFERABLE"
        });
      }

      // Create transfer request
      const transfer = await storage.createEnquiryTransfer({
        enquiryId,
        fromUserId,
        toUserId,
        transferReason: transferReason || null,
        status: 'pending'
      });

      res.status(201).json(transfer);
    } catch (error: any) {
      console.error("Transfer creation error:", error);
      
      // Handle specific database errors
      if (error.code === 11000) { // Duplicate key error
        return res.status(409).json({
          error: "DUPLICATE_TRANSFER",
          message: "A transfer request already exists for this enquiry",
          code: "DUPLICATE_TRANSFER"
        });
      }
      
      res.status(500).json({ 
        error: "INTERNAL_ERROR",
        message: "Failed to create transfer request. Please try again.",
        code: "TRANSFER_CREATION_FAILED"
      });
    }
  });



  // Get transfers by enquiry id (for dialog history)
  app.get("/api/enquiries/:id/transfers", async (req: any, res) => {
    try {
      const enquiryId = req.params.id;
      const transfers = await storage.getEnquiryTransfersByEnquiry(enquiryId);
      res.json(transfers);
    } catch (error: any) {
      console.error("Get transfers by enquiry error:", error);
      res.status(500).json({ message: "Failed to fetch enquiry transfers" });
    }
  });

  // (Removed debug/test transfer endpoints for production readiness)

  // Accept transfer request
  app.post("/api/enquiries/transfers/:transferId/accept", async (req: any, res) => {
    try {
      const transferId = req.params.transferId;
      const { responseNotes } = req.body;
      const userId = req.user.id;

      // Check if user is the recipient
      const transfer = await storage.getEnquiryTransferById(transferId);
      if (!transfer) {
        return res.status(404).json({ message: "Transfer not found" });
      }

      if (transfer.toUserId !== userId) {
        return res.status(403).json({ message: "You can only accept transfers sent to you" });
      }

      if (transfer.status !== 'pending') {
        return res.status(400).json({ message: "Transfer is not pending" });
      }

      const updatedTransfer = await storage.acceptEnquiryTransfer(transferId, responseNotes);
      res.json(updatedTransfer);
    } catch (error) {
      console.error("Accept transfer error:", error);
      res.status(500).json({ message: "Failed to accept transfer" });
    }
  });

  // Decline transfer request
  app.post("/api/enquiries/transfers/:transferId/decline", async (req: any, res) => {
    try {
      const transferId = req.params.transferId;
      const { responseNotes } = req.body;
      const userId = req.user.id;

      // Check if user is the recipient
      const transfer = await storage.getEnquiryTransferById(transferId);
      if (!transfer) {
        return res.status(404).json({ message: "Transfer not found" });
      }

      if (transfer.toUserId !== userId) {
        return res.status(403).json({ message: "You can only decline transfers sent to you" });
      }

      if (transfer.status !== 'pending') {
        return res.status(400).json({ message: "Transfer is not pending" });
      }

      const updatedTransfer = await storage.declineEnquiryTransfer(transferId, responseNotes);
      res.json(updatedTransfer);
    } catch (error) {
      console.error("Decline transfer error:", error);
      res.status(500).json({ message: "Failed to decline transfer" });
    }
  });

  // Cancel transfer request (only by sender or admin)
  app.post("/api/enquiries/transfers/:transferId/cancel", async (req: any, res) => {
    try {
      const transferId = req.params.transferId;
      const userId = req.user.id;
      const userRole = req.userRole;

      const transfer = await storage.getEnquiryTransferById(transferId);
      if (!transfer) {
        return res.status(404).json({ message: "Transfer not found" });
      }

      // Check if user can cancel (sender or admin)
      if (transfer.fromUserId !== userId && userRole !== 'admin') {
        return res.status(403).json({ message: "You can only cancel transfers you sent" });
      }

      if (transfer.status !== 'pending') {
        return res.status(400).json({ message: "Transfer is not pending" });
      }

      const updatedTransfer = await storage.cancelEnquiryTransfer(transferId);
      res.json(updatedTransfer);
    } catch (error) {
      console.error("Cancel transfer error:", error);
      res.status(500).json({ message: "Failed to cancel transfer" });
    }
  });
}