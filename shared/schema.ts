import { z } from "zod";

// MongoDB ObjectId - only available on server side
let ObjectId: any = null;
if (typeof window === 'undefined') {
  try {
    const mongodb = require('mongodb');
    ObjectId = mongodb.ObjectId;
  } catch (e) {
    // MongoDB not available, use string IDs
    ObjectId = null;
  }
}

// ============================================================================
// MONGODB SCHEMA DEFINITIONS - Phase 2.1 Migration
// ============================================================================

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export const ROLE_TYPES = ['admin', 'manager', 'salesperson', 'accounts', 'staff'] as const;
export const USER_STATUS = ['active', 'inactive', 'suspended'] as const;
export const AUTH_PROVIDERS = ['replit', 'google', 'github', 'local'] as const;
export const ENQUIRY_SOURCES = ['walk_in', 'phone_call', 'online_form', 'email', 'referral', 'social_media', 'phone', 'website', 'whatsapp_social', 'travel_agent', 'corporate', 'event_planner', 'agent', 'other'] as const;
export const ENQUIRY_STATUSES = ['new', 'quotation_sent', 'converted', 'lost', 'ongoing', 'booked', 'closed'] as const;
export const EVENT_TYPES = ['wedding', 'birthday', 'corporate', 'conference', 'anniversary', 'other'] as const;
export const BOOKING_STATUSES = ['booked', 'pending_beo', 'beo_ready', 'in_progress', 'completed', 'cancelled', 'closed'] as const;
export const BEO_STATUSES = ['draft', 'pending_verification', 'approved', 'rejected'] as const;
export const LOST_REASONS = ['price_too_high', 'venue_unavailable', 'chose_competitor', 'client_unresponsive', 'requirements_changed', 'duplicate_invalid', 'other'] as const;
export const CANCELLATION_REASONS = ['client_cancelled', 'date_changed', 'payment_not_received', 'force_majeure', 'double_booking', 'other'] as const;
export const REOPEN_REASONS = ['client_reconnected', 'wrongly_marked_lost', 'package_revised', 'event_postponed', 'other'] as const;
export const APPROVAL_STATUSES = ['pending', 'approved', 'rejected'] as const;
export const FUNCTION_PROSPECT_STATUSES = ['draft', 'finalized', 'converted_to_booking'] as const;

// ============================================================================
// HELPER SCHEMAS FOR EMBEDDED DOCUMENTS
// ============================================================================

// Password Reset Token (embedded in users)
const passwordResetTokenSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  token: z.string(),
  expiresAt: z.date(),
  used: z.boolean().default(false),
  createdAt: z.date().default(() => new Date())
});

// Status History (embedded in enquiries)
const statusHistorySchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  fromStatus: z.enum(ENQUIRY_STATUSES).nullable().optional(),
  toStatus: z.enum(ENQUIRY_STATUSES),
  changedById: z.instanceof(ObjectId),
  notes: z.string().nullable().optional(),
  followUpDate: z.date().nullable().optional(),
  createdAt: z.date().default(() => new Date())
});

// Follow-up History (embedded in enquiries)  
const followUpHistorySchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  followUpDate: z.date(),
  followUpTime: z.string(), // HH:MM format
  notes: z.string(),
  setById: z.instanceof(ObjectId),
  completed: z.boolean().default(false),
  completedAt: z.date().nullable().optional(),
  completedById: z.instanceof(ObjectId).nullable().optional(),
  completionNotes: z.string().nullable().optional(),
  statusBefore: z.enum(ENQUIRY_STATUSES).nullable().optional(),
  statusAfter: z.enum(ENQUIRY_STATUSES).nullable().optional(),
  isOverdue: z.boolean().default(false),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date())
});

// Function Prospects (embedded in enquiries)
const functionProspectSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  prospectNumber: z.string(), // FP-YYYY-XXX
  tentativePax: z.number().nullable().optional(),
  suggestedHall: z.string().nullable().optional(),
  menuItems: z.array(z.any()).nullable().optional(), // Array of menu items
  avRequirements: z.string().nullable().optional(),
  additionalServices: z.string().nullable().optional(),
  estimatedCost: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(FUNCTION_PROSPECT_STATUSES).default('draft'),
  createdById: z.instanceof(ObjectId),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date())
});

// Venue Session (embedded in quotations)
const venueSessionSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  eventDate: z.date(),
  venue: z.string(),
  venueSpace: z.string().nullable().optional(),
  session: z.string(),
  sessionRate: z.number()
});

// Room Package (embedded in quotations) - Simplified
const roomPackageSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  category: z.string(),
  rate: z.number(),
});

// Food Package (embedded in quotations)  
const foodPackageSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  itemName: z.string(),
  category: z.string().nullable().optional(),
  quantity: z.number(),
  rate: z.number(),
  amount: z.number()
});

// Booking Session (embedded in bookings)
const bookingSessionSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  sessionName: z.string(),
  sessionLabel: z.string().nullable().optional(),
  venue: z.string(),
  startTime: z.string(), // HH:MM format
  endTime: z.string(), // HH:MM format  
  sessionDate: z.date(),
  paxCount: z.number().default(0),
  specialInstructions: z.string().nullable().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date())
});

// Amendment (embedded in bookings)
const amendmentSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  amendmentNumber: z.string(), // AMD-YYYY-XXX
  oldDetails: z.any().nullable().optional(),
  newDetails: z.any().nullable().optional(),
  reason: z.string().nullable().optional(),
  financialImpact: z.number().nullable().optional(),
  clientAcknowledged: z.boolean().default(false),
  approvalStatus: z.string().default('pending'),
  approvedById: z.instanceof(ObjectId).nullable().optional(),
  approvedAt: z.date().nullable().optional(),
  createdAt: z.date().default(() => new Date())
});

// Booking Status History (embedded in bookings)
const bookingStatusHistorySchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  fromStatus: z.enum(BOOKING_STATUSES).nullable().optional(),
  toStatus: z.enum(BOOKING_STATUSES),
  notes: z.string().nullable().optional(),
  cancellationReason: z.string().nullable().optional(),
  performedById: z.instanceof(ObjectId),
  createdAt: z.date().default(() => new Date())
});

// ============================================================================
// MAIN COLLECTION SCHEMAS  
// ============================================================================

// 1. ROLES COLLECTION
export const roleSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  name: z.enum(ROLE_TYPES),
  displayName: z.string(),
  description: z.string().nullable().optional(),
  permissions: z.record(z.boolean()).default({}), // JSON object with permission flags
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date())
});

// 2. USERS COLLECTION (with embedded password reset tokens)
export const userSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  email: z.string().email().nullable().optional(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  profileImageUrl: z.string().nullable().optional(),
  roleId: z.instanceof(ObjectId),
  // Keep legacy role field for backward compatibility
  role: z.string().default('salesperson'),
  status: z.enum(USER_STATUS).default('active'),
  lastLoginAt: z.date().nullable().optional(),
  passwordHash: z.string().nullable().optional(),
  authProvider: z.enum(AUTH_PROVIDERS).default('replit'),
  googleId: z.string().nullable().optional(),
  githubId: z.string().nullable().optional(),
  replitId: z.string().nullable().optional(),
  requirePasswordReset: z.boolean().default(false),
  twoFactorEnabled: z.boolean().default(false),
  twoFactorSecret: z.string().nullable().optional(),
  // Embedded password reset tokens
  passwordResetTokens: z.array(passwordResetTokenSchema).default([]),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date())
});

// 3. ENQUIRIES COLLECTION (with embedded history and prospects)
export const enquirySchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  enquiryNumber: z.string(), // ENQ-YYYY-XXX
  enquiryDate: z.date(),
  clientName: z.string(),
  contactNumber: z.string(),
  email: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  eventType: z.enum(EVENT_TYPES),
  eventDate: z.date().nullable().optional(),
  tentativeDates: z.array(z.date()).nullable().optional(),
  expectedPax: z.number().nullable().optional(),
  source: z.string(),
  sourceNotes: z.string().nullable().optional(),
  salespersonId: z.instanceof(ObjectId).nullable().optional(),
  status: z.enum(ENQUIRY_STATUSES).default('new'),
  closureReason: z.string().nullable().optional(),
  lostReason: z.string().nullable().optional(),
  lostReasonNotes: z.string().nullable().optional(),
  reopenReason: z.string().nullable().optional(),
  reopenReasonNotes: z.string().nullable().optional(),
  followUpDate: z.date().nullable().optional(),
  followUpTime: z.string().nullable().optional(),
  followUpNotes: z.string().nullable().optional(),
  repeatFollowUp: z.boolean().default(false),
  repeatInterval: z.number().nullable().optional(),
  repeatEndDate: z.date().nullable().optional(),
  notes: z.string().nullable().optional(),
  // Embedded arrays
  statusHistory: z.array(statusHistorySchema).default([]),
  followUpHistory: z.array(followUpHistorySchema).default([]),
  functionProspects: z.array(functionProspectSchema).default([]),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date())
});

// 4. QUOTATIONS COLLECTION (with embedded packages)
export const quotationSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  enquiryId: z.instanceof(ObjectId),
  quotationNumber: z.string(), // QUO-YYYY-XXX
  quotationType: z.string().default('basic'),
  expectedGuests: z.number().default(0),
  // Embedded venue sessions
  venueSessions: z.array(venueSessionSchema).default([]),
  venueTotal: z.number().default(0),
  // Embedded room packages
  roomPackages: z.array(roomPackageSchema).default([]),
  roomTotal: z.number().default(0),
  // Embedded food packages  
  foodPackages: z.array(foodPackageSchema).default([]),
  foodTotal: z.number().default(0),
  // Calculations
  subtotal: z.number(),
  gstPercent: z.number().default(18),
  gstAmount: z.number().default(0),
  totalAmount: z.number(),
  
  // Discount
  discountType: z.enum(['percentage', 'fixed']).optional(),
  discountValue: z.number().default(0),
  discountAmount: z.number().default(0),
  discountReason: z.string().optional(),
  discountExceedsLimit: z.boolean().default(false),
  finalAmount: z.number(),
  // Special instructions
  specialInstructions: z.string().nullable().optional(),
  termsAndConditions: z.array(z.string()).default([]),
  checkInTime: z.string().default('14:00'),
  checkOutTime: z.string().default('11:00'),
  validUntil: z.date().nullable().optional(),
  terms: z.string().nullable().optional(),
  createdAt: z.date().default(() => new Date())
});

// 5. BOOKINGS COLLECTION (with embedded sessions, amendments, status history)
export const bookingSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  bookingNumber: z.string(), // BOOK-YYYY-XXX
  enquiryId: z.instanceof(ObjectId).nullable().optional(),
  quotationId: z.instanceof(ObjectId).nullable().optional(),
  clientName: z.string(),
  contactNumber: z.string(),
  email: z.string().nullable().optional(),
  eventType: z.enum(EVENT_TYPES),
  eventDate: z.date(),
  eventEndDate: z.date().nullable().optional(),
  eventDuration: z.number().default(1),
  eventDates: z.array(z.date()).nullable().optional(),
  eventStartTime: z.string().nullable().optional(),
  eventEndTime: z.string().nullable().optional(),
  confirmedPax: z.number(),
  hall: z.string().nullable().optional(),
  totalAmount: z.number(),
  advanceAmount: z.number(),
  balanceAmount: z.number(),
  status: z.enum(BOOKING_STATUSES).default('booked'),
  statusChanged: z.boolean().default(false),
  cancellationReason: z.string().nullable().optional(),
  cancellationReasonNotes: z.string().nullable().optional(),
  contractSigned: z.boolean().default(false),
  contractSignedAt: z.date().nullable().optional(),
  salespersonId: z.instanceof(ObjectId).nullable().optional(), // Reference to the assigned salesperson
  // Embedded arrays
  sessions: z.array(bookingSessionSchema).default([]),
  amendments: z.array(amendmentSchema).default([]),
  statusHistory: z.array(bookingStatusHistorySchema).default([]),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date())
});

// 6. BEOS COLLECTION  
export const beoSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  beoNumber: z.string(), // BEO-YYYY-XXX
  bookingId: z.instanceof(ObjectId),
  menuItems: z.array(z.any()).nullable().optional(),
  serviceRequirements: z.string().nullable().optional(),
  avRequirements: z.string().nullable().optional(),
  setupInstructions: z.string().nullable().optional(),
  specialInstructions: z.string().nullable().optional(),
  status: z.enum(BEO_STATUSES).default('draft'),
  createdById: z.instanceof(ObjectId).nullable().optional(),
  verifiedById: z.instanceof(ObjectId).nullable().optional(),
  verifiedAt: z.date().nullable().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date())
});

// 7. SYSTEM AUDIT COLLECTION
export const systemAuditSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  userId: z.instanceof(ObjectId).nullable().optional(),
  userRole: z.string(),
  action: z.string(), // 'created', 'updated', 'deleted', 'login', 'logout', etc.
  module: z.string(), // 'users', 'enquiries', 'bookings', 'settings', etc.
  createdAt: z.date().default(() => new Date())
});

// 8. DROPDOWN OPTIONS COLLECTION
export const dropdownOptionSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  category: z.string(), // 'enquiry_source', 'lost_reason', 'cancellation_reason', etc.
  value: z.string(),
  label: z.string(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().default(0),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date())
});

// 9. APPROVALS COLLECTION
export const approvalSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  referenceNumber: z.string(), // ENQ/BOOK/BEO/AMD number
  referenceType: z.string(), // enquiry, booking, beo, amendment, reopen_booking
  referenceId: z.instanceof(ObjectId),
  approvalType: z.string(), // discount, beo_verification, amendment, refund, reopen_booking
  requestedById: z.instanceof(ObjectId).nullable().optional(),
  approverId: z.instanceof(ObjectId).nullable().optional(),
  status: z.enum(APPROVAL_STATUSES).default('pending'),
  discountPercent: z.number().nullable().optional(),
  amount: z.number().nullable().optional(),
  reason: z.string().nullable().optional(),
  comments: z.string().nullable().optional(),
  approvedAt: z.date().nullable().optional(),
  createdAt: z.date().default(() => new Date())
});

// ============================================================================
// INSERT SCHEMAS (for validation when creating new documents)
// ============================================================================

export const insertRoleSchema = roleSchema.omit({ _id: true, createdAt: true, updatedAt: true });
export const insertUserSchema = userSchema.omit({ _id: true, createdAt: true, updatedAt: true });
export const insertEnquirySchema = enquirySchema.omit({ 
  _id: true, 
  enquiryNumber: true, 
  createdAt: true,
  updatedAt: true,
  statusHistory: true,
  followUpHistory: true,
  functionProspects: true
});
export const insertQuotationSchema = quotationSchema.omit({ _id: true, quotationNumber: true, createdAt: true });
export const insertBookingSchema = bookingSchema.omit({ 
  _id: true, 
  bookingNumber: true, 
  createdAt: true,
  updatedAt: true,
  sessions: true,
  amendments: true,
  statusHistory: true
});
export const insertBeoSchema = beoSchema.omit({ _id: true, beoNumber: true, createdAt: true, updatedAt: true });
export const insertSystemAuditSchema = systemAuditSchema.omit({ _id: true, createdAt: true });
export const insertDropdownOptionSchema = dropdownOptionSchema.omit({ _id: true, createdAt: true, updatedAt: true });
export const insertApprovalSchema = approvalSchema.omit({ _id: true, createdAt: true });

// Sub-document insert schemas
export const insertStatusHistorySchema = statusHistorySchema.omit({ _id: true, createdAt: true });
export const insertFollowUpHistorySchema = followUpHistorySchema.omit({ _id: true, createdAt: true, updatedAt: true });
export const insertFunctionProspectSchema = functionProspectSchema.omit({ _id: true, createdAt: true, updatedAt: true });
export const insertBookingSessionSchema = bookingSessionSchema.omit({ _id: true, createdAt: true, updatedAt: true });
export const insertAmendmentSchema = amendmentSchema.omit({ _id: true, createdAt: true });

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Role = z.infer<typeof roleSchema>;
export type User = z.infer<typeof userSchema>;  
export type Enquiry = z.infer<typeof enquirySchema>;
export type Quotation = z.infer<typeof quotationSchema>;
export type Booking = z.infer<typeof bookingSchema>;
export type Beo = z.infer<typeof beoSchema>;
export type SystemAudit = z.infer<typeof systemAuditSchema>;
export type DropdownOption = z.infer<typeof dropdownOptionSchema>;
export type Approval = z.infer<typeof approvalSchema>;

export type InsertRole = z.infer<typeof insertRoleSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertEnquiry = z.infer<typeof insertEnquirySchema>;
export type InsertQuotation = z.infer<typeof insertQuotationSchema>;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type InsertBeo = z.infer<typeof insertBeoSchema>;
export type InsertSystemAudit = z.infer<typeof insertSystemAuditSchema>;
export type InsertDropdownOption = z.infer<typeof insertDropdownOptionSchema>;
export type InsertApproval = z.infer<typeof insertApprovalSchema>;

// Sub-document types
export type PasswordResetToken = z.infer<typeof passwordResetTokenSchema>;
export type StatusHistory = z.infer<typeof statusHistorySchema>;
export type FollowUpHistory = z.infer<typeof followUpHistorySchema>;
export type FunctionProspect = z.infer<typeof functionProspectSchema>;
export type VenueSession = z.infer<typeof venueSessionSchema>;
export type RoomPackage = z.infer<typeof roomPackageSchema>;
export type FoodPackage = z.infer<typeof foodPackageSchema>;
export type BookingSession = z.infer<typeof bookingSessionSchema>;
export type Amendment = z.infer<typeof amendmentSchema>;
export type BookingStatusHistory = z.infer<typeof bookingStatusHistorySchema>;


export type InsertStatusHistory = z.infer<typeof insertStatusHistorySchema>;
export type InsertFollowUpHistory = z.infer<typeof insertFollowUpHistorySchema>;
export type InsertFunctionProspect = z.infer<typeof insertFunctionProspectSchema>;
export type InsertBookingSession = z.infer<typeof insertBookingSessionSchema>;
export type InsertAmendment = z.infer<typeof insertAmendmentSchema>;

// ============================================================================
// MONGODB COLLECTION NAMES
// ============================================================================

export const COLLECTIONS = {
  ROLES: 'roles',
  USERS: 'users', 
  ENQUIRIES: 'enquiries',
  QUOTATIONS: 'quotations',
  BOOKINGS: 'bookings',
  BEOS: 'beos',
  SYSTEM_AUDIT: 'systemAudit',
  DROPDOWN_OPTIONS: 'dropdownOptions',
  APPROVALS: 'approvals',
  SYSTEM_SETTINGS: 'systemSettings'
} as const;

// ============================================================================
// SEQUENCE NUMBER GENERATORS (for auto-generated numbers)
// ============================================================================

export const SEQUENCE_TYPES = {
  ENQUIRY: 'ENQ',
  QUOTATION: 'QUO', 
  BOOKING: 'BOOK',
  BEO: 'BEO',
  AMENDMENT: 'AMD',
  FUNCTION_PROSPECT: 'FP'
} as const;

// Counter schema for sequence generation
export const counterSchema = z.object({
  _id: z.string(), // e.g., "ENQ-2025", "BOOK-2025"
  sequence: z.number().default(0),
  year: z.number(),
  prefix: z.string()
});

export type Counter = z.infer<typeof counterSchema>;

// ============================================================================
// MONGODB INDEXES (for performance optimization)
// ============================================================================

export const INDEXES = {
  users: [
    { email: 1 },
    { roleId: 1 },
    { authProvider: 1, googleId: 1 },
    { authProvider: 1, githubId: 1 },
    { authProvider: 1, replitId: 1 }
  ],
  enquiries: [
    { enquiryNumber: 1 },
    { salespersonId: 1 },
    { status: 1 },
    { enquiryDate: -1 },
    { eventDate: 1 },
    { followUpDate: 1 },
    { clientName: 'text', contactNumber: 'text' } // Text search
  ],
  quotations: [
    { quotationNumber: 1 },
    { enquiryId: 1 },
    { createdAt: -1 }
  ],
  bookings: [
    { bookingNumber: 1 },
    { enquiryId: 1 },
    { quotationId: 1 },
    { status: 1 },
    { eventDate: 1 },
    { createdAt: -1 },
    { clientName: 'text', contactNumber: 'text' } // Text search
  ],
  beos: [
    { beoNumber: 1 },
    { bookingId: 1 },
    { status: 1 },
    { createdAt: -1 }
  ],
  systemAudit: [
    { userId: 1, createdAt: -1 },
    { module: 1, action: 1 },
    { resourceType: 1, resourceId: 1 },
    { createdAt: -1 }
  ],
  dropdownOptions: [
    { category: 1, sortOrder: 1 },
    { isActive: 1 }
  ],
  approvals: [
    { referenceNumber: 1 },
    { referenceType: 1, referenceId: 1 },
    { status: 1 },
    { requestedById: 1 },
    { approverId: 1 },
    { createdAt: -1 }
  ]
} as const;