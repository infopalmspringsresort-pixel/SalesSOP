import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Role definitions and permissions
export const roleEnum = pgEnum('role_type', ['admin', 'manager', 'salesperson', 'accounts', 'staff']);
export const userStatusEnum = pgEnum('user_status', ['active', 'inactive', 'suspended']);

// Roles table
export const roles = pgTable("roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: roleEnum("name").unique().notNull(),
  displayName: varchar("display_name").notNull(),
  description: text("description"),
  permissions: jsonb("permissions").notNull().default('{}'), // JSON object with permission flags
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Authentication providers enum
export const authProviderEnum = pgEnum('auth_provider', ['replit', 'google', 'github', 'local']);

// User storage table (mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  roleId: varchar("role_id").references(() => roles.id),
  // Keep legacy role field for backward compatibility during migration
  role: varchar("role").notNull().default('salesperson'), // deprecated, use roleId
  status: userStatusEnum("status").default('active'),
  lastLoginAt: timestamp("last_login_at"),
  passwordHash: varchar("password_hash"), // For password-based auth
  authProvider: authProviderEnum("auth_provider").default('replit'),
  googleId: varchar("google_id"), // Google OAuth ID
  githubId: varchar("github_id"), // GitHub OAuth ID
  replitId: varchar("replit_id"), // Replit user ID
  requirePasswordReset: boolean("require_password_reset").default(false),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorSecret: varchar("two_factor_secret"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Password reset tokens
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token: varchar("token").unique().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Dropdown management for configurable options
export const dropdownOptions = pgTable("dropdown_options", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: varchar("category").notNull(), // 'enquiry_source', 'lost_reason', 'cancellation_reason', etc.
  value: varchar("value").notNull(),
  label: varchar("label").notNull(),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Comprehensive audit log for all system actions
export const systemAuditLog = pgTable("system_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  userRole: varchar("user_role").notNull(),
  action: varchar("action").notNull(), // 'created', 'updated', 'deleted', 'login', 'logout', 'permission_changed', etc.
  module: varchar("module").notNull(), // 'users', 'enquiries', 'bookings', 'settings', etc.
  resourceType: varchar("resource_type"), // 'enquiry', 'booking', 'user', etc.
  resourceId: varchar("resource_id"), // ID of the affected resource
  details: jsonb("details"), // Additional context data
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Enums
export const enquirySourceEnum = pgEnum('enquiry_source', ['walk_in', 'phone_call', 'online_form', 'email', 'referral', 'social_media', 'phone', 'website', 'whatsapp_social', 'travel_agent', 'corporate', 'event_planner', 'agent', 'other']);
export const enquiryStatusEnum = pgEnum('enquiry_status', ['new', 'quotation_sent', 'follow_up_required', 'converted', 'lost', 'ongoing', 'booked', 'closed']);
export const eventTypeEnum = pgEnum('event_type', ['wedding', 'birthday', 'corporate', 'conference', 'anniversary', 'other']);
export const bookingStatusEnum = pgEnum('booking_status', ['booked', 'confirmed', 'pending_beo', 'beo_ready', 'in_progress', 'completed', 'cancelled', 'closed']);
export const beoStatusEnum = pgEnum('beo_status', ['draft', 'pending_verification', 'approved', 'rejected']);
export const lostReasonEnum = pgEnum('lost_reason', ['price_too_high', 'venue_unavailable', 'chose_competitor', 'client_unresponsive', 'requirements_changed', 'duplicate_invalid', 'other']);
export const cancellationReasonEnum = pgEnum('cancellation_reason', ['client_cancelled', 'date_changed', 'payment_not_received', 'force_majeure', 'double_booking', 'other']);
export const reopenReasonEnum = pgEnum('reopen_reason', ['client_reconnected', 'wrongly_marked_lost', 'package_revised', 'event_postponed', 'other']);
export const approvalStatusEnum = pgEnum('approval_status', ['pending', 'approved', 'rejected']);
// export const paymentTypeEnum = pgEnum('payment_type', ['advance', 'final', 'partial', 'refund']);
// export const paymentMethodEnum = pgEnum('payment_method', ['cash', 'bank_transfer', 'cheque', 'card', 'upi']);
export const functionProspectStatusEnum = pgEnum('function_prospect_status', ['draft', 'finalized', 'converted_to_booking']);

// Core Tables
export const enquiries = pgTable("enquiries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  enquiryNumber: varchar("enquiry_number").notNull().unique(), // ENQ-YYYY-XXX
  enquiryDate: timestamp("enquiry_date").notNull(),
  clientName: varchar("client_name").notNull(),
  contactNumber: varchar("contact_number").notNull(),
  email: varchar("email"),
  city: varchar("city"),
  eventType: eventTypeEnum("event_type").notNull(),
  eventDate: timestamp("event_date"),
  tentativeDates: jsonb("tentative_dates"), // Array of additional date options
  expectedPax: integer("expected_pax"),
  source: text("source").notNull(),
  sourceNotes: text("source_notes"), // Notes when source is 'other'
  salespersonId: varchar("salesperson_id").references(() => users.id),
  status: enquiryStatusEnum("status").default('new'),
  closureReason: text("closure_reason"), // Reason when status is closed, lost, etc.
  lostReason: text("lost_reason"), // Reason when marking as lost
  lostReasonNotes: text("lost_reason_notes"), // Notes for lost reason
  reopenReason: text("reopen_reason"), // Reason when reopening
  reopenReasonNotes: text("reopen_reason_notes"), // Notes for reopen reason
  followUpDate: timestamp("follow_up_date"), // When follow-up is required
  followUpTime: varchar("follow_up_time"), // Time for follow-up (HH:MM format)
  followUpNotes: text("follow_up_notes"), // Notes for follow-up
  repeatFollowUp: boolean("repeat_follow_up").default(false), // Enable repeat follow-up
  repeatInterval: integer("repeat_interval"), // Days between repeats
  repeatEndDate: timestamp("repeat_end_date"), // When to stop repeating
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Status History Tracking
export const enquiryStatusHistory = pgTable("enquiry_status_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  enquiryId: varchar("enquiry_id").notNull().references(() => enquiries.id, { onDelete: 'cascade' }),
  fromStatus: enquiryStatusEnum("from_status"),
  toStatus: enquiryStatusEnum("to_status").notNull(),
  changedById: varchar("changed_by_id").notNull().references(() => users.id),
  notes: text("notes"), // Optional notes for the status change
  followUpDate: timestamp("follow_up_date"), // Follow-up date if applicable
  createdAt: timestamp("created_at").defaultNow(),
});

// Follow-up History Tracking
export const followUpHistory = pgTable("follow_up_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  enquiryId: varchar("enquiry_id").notNull().references(() => enquiries.id, { onDelete: 'cascade' }),
  followUpDate: timestamp("follow_up_date").notNull(),
  followUpTime: varchar("follow_up_time").notNull(), // HH:MM format
  notes: text("notes").notNull(), // Action/Notes for this follow-up
  setById: varchar("set_by_id").notNull().references(() => users.id),
  completed: boolean("completed").default(false),
  completedAt: timestamp("completed_at"),
  completedById: varchar("completed_by_id").references(() => users.id),
  completionNotes: text("completion_notes"), // Notes when follow-up is completed
  statusBefore: enquiryStatusEnum("status_before"),
  statusAfter: enquiryStatusEnum("status_after"),
  isOverdue: boolean("is_overdue").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const quotations = pgTable("quotations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  enquiryId: varchar("enquiry_id").references(() => enquiries.id),
  quotationNumber: varchar("quotation_number").notNull().unique(),
  quotationType: varchar("quotation_type").default('basic'), // 'basic', 'with_food', 'without_food'
  
  // Venue details
  venueSessions: jsonb("venue_sessions"), // Array of {eventDate, venue, venueSpace, session, sessionRate}
  venueTotal: decimal("venue_total", { precision: 12, scale: 2 }).default('0'),
  
  // Room details  
  roomPackages: jsonb("room_packages"), // Array of {category, rate, requestedRooms, totalOccupancy, amount}
  roomTotal: decimal("room_total", { precision: 12, scale: 2 }).default('0'),
  
  // Food details (for with_food quotations)
  foodPackages: jsonb("food_packages"), // Array of food items and menus
  foodTotal: decimal("food_total", { precision: 12, scale: 2 }).default('0'),
  
  // Calculations
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  gstPercent: decimal("gst_percent", { precision: 5, scale: 2 }).default('18'),
  gstAmount: decimal("gst_amount", { precision: 12, scale: 2 }).default('0'),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }).default('0'),
  discountAmount: decimal("discount_amount", { precision: 12, scale: 2 }).default('0'),
  finalAmount: decimal("final_amount", { precision: 12, scale: 2 }).notNull(),
  
  // Special instructions and notes
  specialInstructions: text("special_instructions"),
  checkInTime: varchar("check_in_time").default('14:00'),
  checkOutTime: varchar("check_out_time").default('11:00'),
  
  validUntil: timestamp("valid_until"),
  terms: text("terms"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingNumber: varchar("booking_number").notNull().unique(), // BOOK-YYYY-XXX
  enquiryId: varchar("enquiry_id").references(() => enquiries.id),
  quotationId: varchar("quotation_id").references(() => quotations.id),
  clientName: varchar("client_name").notNull(),
  contactNumber: varchar("contact_number").notNull(),
  email: varchar("email"),
  eventType: eventTypeEnum("event_type").notNull(),
  eventDate: timestamp("event_date").notNull(),
  eventEndDate: timestamp("event_end_date"), // For multi-day events
  eventDuration: integer("event_duration").notNull().default(1), // Number of days
  eventDates: jsonb("event_dates"), // Array of all event dates for multi-day events
  eventStartTime: varchar("event_start_time"),
  eventEndTime: varchar("event_end_time"),
  confirmedPax: integer("confirmed_pax").notNull(),
  hall: varchar("hall"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  advanceAmount: decimal("advance_amount", { precision: 12, scale: 2 }).notNull(),
  balanceAmount: decimal("balance_amount", { precision: 12, scale: 2 }).notNull(),
  status: bookingStatusEnum("status").default('booked'),
  statusChanged: boolean("status_changed").default(false), // Track if status has been changed from initial
  cancellationReason: text("cancellation_reason"), // Required when status is cancelled
  cancellationReasonNotes: text("cancellation_reason_notes"), // Notes for cancellation reason
  contractSigned: boolean("contract_signed").default(false),
  contractSignedAt: timestamp("contract_signed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Event Sessions - Each booking can have multiple sessions across different venues and times
export const bookingSessions = pgTable("booking_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").references(() => bookings.id).notNull(),
  sessionName: varchar("session_name").notNull(), // Breakfast, Lunch, Hi-Tea, Dinner, or custom
  sessionLabel: varchar("session_label"), // Custom label like "Conference Morning", "Reception Dinner"
  venue: varchar("venue").notNull(), // Areca I, Areca II, Oasis, etc.
  startTime: varchar("start_time").notNull(), // HH:MM format
  endTime: varchar("end_time").notNull(), // HH:MM format
  sessionDate: timestamp("session_date").notNull(), // Specific date for this session
  paxCount: integer("pax_count").default(0), // Number of guests for this session
  specialInstructions: text("special_instructions"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const beos = pgTable("beos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  beoNumber: varchar("beo_number").notNull().unique(), // BEO-YYYY-XXX
  bookingId: varchar("booking_id").references(() => bookings.id),
  menuItems: jsonb("menu_items"),
  serviceRequirements: text("service_requirements"),
  avRequirements: text("av_requirements"),
  setupInstructions: text("setup_instructions"),
  specialInstructions: text("special_instructions"),
  status: beoStatusEnum("status").default('draft'),
  createdById: varchar("created_by_id").references(() => users.id),
  verifiedById: varchar("verified_by_id").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const approvals = pgTable("approvals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referenceNumber: varchar("reference_number").notNull(), // ENQ/BOOK/BEO/AMD number
  referenceType: varchar("reference_type").notNull(), // enquiry, booking, beo, amendment, reopen_booking
  referenceId: varchar("reference_id").notNull(),
  approvalType: varchar("approval_type").notNull(), // discount, beo_verification, amendment, refund, reopen_booking
  requestedById: varchar("requested_by_id").references(() => users.id),
  approverId: varchar("approver_id").references(() => users.id),
  status: approvalStatusEnum("status").default('pending'),
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }),
  amount: decimal("amount", { precision: 12, scale: 2 }),
  reason: text("reason"),
  comments: text("comments"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// export const payments = pgTable("payments", {
//   id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
//   paymentNumber: varchar("payment_number").notNull().unique(),
//   bookingId: varchar("booking_id").references(() => bookings.id),
//   amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
//   paymentType: paymentTypeEnum("payment_type").notNull(),
//   paymentMethod: paymentMethodEnum("payment_method").notNull(),
//   receiptNumber: varchar("receipt_number"),
//   collectedById: varchar("collected_by_id").references(() => users.id),
//   verifiedById: varchar("verified_by_id").references(() => users.id),
//   cashVoucherNumber: varchar("cash_voucher_number"),
//   notes: text("notes"),
//   createdAt: timestamp("created_at").defaultNow(),
// });

export const amendments = pgTable("amendments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  amendmentNumber: varchar("amendment_number").notNull().unique(), // AMD-YYYY-XXX
  bookingId: varchar("booking_id").references(() => bookings.id),
  oldDetails: jsonb("old_details"),
  newDetails: jsonb("new_details"),
  reason: text("reason"),
  financialImpact: decimal("financial_impact", { precision: 12, scale: 2 }),
  clientAcknowledged: boolean("client_acknowledged").default(false),
  approvalStatus: varchar("approval_status").default('pending'), // Changed from enum
  approvedById: varchar("approved_by_id").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const functionProspects = pgTable("function_prospects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  prospectNumber: varchar("prospect_number").notNull().unique(), // FP-YYYY-XXX
  enquiryId: varchar("enquiry_id").references(() => enquiries.id),
  tentativePax: integer("tentative_pax"),
  suggestedHall: varchar("suggested_hall"),
  menuItems: jsonb("menu_items"), // Array of menu items with quantities
  avRequirements: text("av_requirements"),
  additionalServices: text("additional_services"),
  estimatedCost: decimal("estimated_cost", { precision: 12, scale: 2 }),
  notes: text("notes"),
  status: functionProspectStatusEnum("status").default('draft'),
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Audit Log for Enquiry Actions
export const enquiryAuditLog = pgTable("enquiry_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  enquiryId: varchar("enquiry_id").notNull().references(() => enquiries.id, { onDelete: 'cascade' }),
  action: varchar("action").notNull(), // 'reopened', 'status_changed', 'created', 'updated'
  fromStatus: enquiryStatusEnum("from_status"),
  toStatus: enquiryStatusEnum("to_status"),
  reason: reopenReasonEnum("reason"), // For reopen actions
  notes: text("notes"),
  performedById: varchar("performed_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Audit Log for Booking Actions
export const bookingAuditLog = pgTable("booking_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").notNull().references(() => bookings.id, { onDelete: 'cascade' }),
  action: varchar("action").notNull(), // 'created', 'status_changed', 'updated', 'cancelled'
  fromStatus: bookingStatusEnum("from_status"),
  toStatus: bookingStatusEnum("to_status"),
  notes: text("notes"),
  cancellationReason: text("cancellation_reason"), // For cancellation actions
  performedById: varchar("performed_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(roles, {
    fields: [users.roleId],
    references: [roles.id],
  }),
  enquiries: many(enquiries),
  statusHistoryChanges: many(enquiryStatusHistory),
  followUpsSet: many(followUpHistory, { relationName: "followUpsSet" }),
  followUpsCompleted: many(followUpHistory, { relationName: "followUpsCompleted" }),
  createdBeos: many(beos, { relationName: "createdBeos" }),
  verifiedBeos: many(beos, { relationName: "verifiedBeos" }),
  createdFunctionProspects: many(functionProspects),
  auditActions: many(enquiryAuditLog),
  bookingAuditActions: many(bookingAuditLog),
  passwordResetTokens: many(passwordResetTokens),
  systemAuditLogs: many(systemAuditLog),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id],
  }),
}));

export const systemAuditLogRelations = relations(systemAuditLog, ({ one }) => ({
  user: one(users, {
    fields: [systemAuditLog.userId],
    references: [users.id],
  }),
}));

export const enquiriesRelations = relations(enquiries, ({ one, many }) => ({
  salesperson: one(users, {
    fields: [enquiries.salespersonId],
    references: [users.id],
  }),
  quotations: many(quotations),
  bookings: many(bookings),
  functionProspects: many(functionProspects),
  statusHistory: many(enquiryStatusHistory),
  followUpHistory: many(followUpHistory),
  auditLog: many(enquiryAuditLog),
}));

export const enquiryStatusHistoryRelations = relations(enquiryStatusHistory, ({ one }) => ({
  enquiry: one(enquiries, {
    fields: [enquiryStatusHistory.enquiryId],
    references: [enquiries.id],
  }),
  changedBy: one(users, {
    fields: [enquiryStatusHistory.changedById],
    references: [users.id],
  }),
}));

export const bookingAuditLogRelations = relations(bookingAuditLog, ({ one }) => ({
  booking: one(bookings, {
    fields: [bookingAuditLog.bookingId],
    references: [bookings.id],
  }),
  performedBy: one(users, {
    fields: [bookingAuditLog.performedById],
    references: [users.id],
  }),
}));

export const followUpHistoryRelations = relations(followUpHistory, ({ one }) => ({
  enquiry: one(enquiries, {
    fields: [followUpHistory.enquiryId],
    references: [enquiries.id],
  }),
  setBy: one(users, {
    fields: [followUpHistory.setById],
    references: [users.id],
    relationName: "followUpsSet",
  }),
  completedBy: one(users, {
    fields: [followUpHistory.completedById],
    references: [users.id],
    relationName: "followUpsCompleted",
  }),
}));

export const quotationsRelations = relations(quotations, ({ one }) => ({
  enquiry: one(enquiries, {
    fields: [quotations.enquiryId],
    references: [enquiries.id],
  }),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  enquiry: one(enquiries, {
    fields: [bookings.enquiryId],
    references: [enquiries.id],
  }),
  quotation: one(quotations, {
    fields: [bookings.quotationId],
    references: [quotations.id],
  }),
  beos: many(beos),
  amendments: many(amendments),
  auditLog: many(bookingAuditLog),
  sessions: many(bookingSessions),
}));

export const bookingSessionsRelations = relations(bookingSessions, ({ one }) => ({
  booking: one(bookings, {
    fields: [bookingSessions.bookingId],
    references: [bookings.id],
  }),
}));

export const beosRelations = relations(beos, ({ one }) => ({
  booking: one(bookings, {
    fields: [beos.bookingId],
    references: [bookings.id],
  }),
  createdBy: one(users, {
    fields: [beos.createdById],
    references: [users.id],
    relationName: "createdBeos",
  }),
  verifiedBy: one(users, {
    fields: [beos.verifiedById],
    references: [users.id],
    relationName: "verifiedBeos",
  }),
}));

// Commented out approvals and payments relations
// export const approvalsRelations = relations(approvals, ({ one }) => ({
//   requestedBy: one(users, {
//     fields: [approvals.requestedById],
//     references: [users.id],
//     relationName: "requestedApprovals",
//   }),
//   approver: one(users, {
//     fields: [approvals.approverId],
//     references: [users.id],
//     relationName: "givenApprovals",
//   }),
// }));

// export const paymentsRelations = relations(payments, ({ one }) => ({
//   booking: one(bookings, {
//     fields: [payments.bookingId],
//     references: [bookings.id],
//   }),
//   collectedBy: one(users, {
//     fields: [payments.collectedById],
//     references: [users.id],
//     relationName: "collectedPayments",
//   }),
//   verifiedBy: one(users, {
//     fields: [payments.verifiedById],
//     references: [users.id],
//     relationName: "verifiedPayments",
//   }),
// }));

export const amendmentsRelations = relations(amendments, ({ one }) => ({
  booking: one(bookings, {
    fields: [amendments.bookingId],
    references: [bookings.id],
  }),
  approvedBy: one(users, {
    fields: [amendments.approvedById],
    references: [users.id],
  }),
}));

export const functionProspectsRelations = relations(functionProspects, ({ one }) => ({
  enquiry: one(enquiries, {
    fields: [functionProspects.enquiryId],
    references: [enquiries.id],
  }),
  createdBy: one(users, {
    fields: [functionProspects.createdById],
    references: [users.id],
  }),
}));

export const enquiryAuditLogRelations = relations(enquiryAuditLog, ({ one }) => ({
  enquiry: one(enquiries, {
    fields: [enquiryAuditLog.enquiryId],
    references: [enquiries.id],
  }),
  performedBy: one(users, {
    fields: [enquiryAuditLog.performedById],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertEnquirySchema = createInsertSchema(enquiries).omit({
  id: true,
  enquiryNumber: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  enquiryDate: z.string().or(z.date()).transform(val => typeof val === 'string' ? new Date(val) : val),
  eventDate: z.string().or(z.date()).or(z.null()).optional().transform(val => 
    val === null || val === undefined || val === '' ? null : (typeof val === 'string' ? new Date(val) : val)
  ),
  tentativeDates: z.array(z.string().or(z.date()).transform(val => typeof val === 'string' ? new Date(val) : val)).nullable().optional(),
  followUpDate: z.string().or(z.date()).or(z.null()).optional().transform(val => 
    val === null || val === undefined || val === '' ? null : (typeof val === 'string' ? new Date(val) : val)
  ),
  repeatEndDate: z.string().or(z.date()).or(z.null()).optional().transform(val => 
    val === null || val === undefined || val === '' ? null : (typeof val === 'string' ? new Date(val) : val)
  ),
});

export const insertEnquiryStatusHistorySchema = createInsertSchema(enquiryStatusHistory).omit({
  id: true,
  createdAt: true,
}).extend({
  followUpDate: z.string().or(z.date()).or(z.null()).optional().transform(val => 
    val === null || val === undefined || val === '' ? null : (typeof val === 'string' ? new Date(val) : val)
  ),
});

export const insertFollowUpHistorySchema = createInsertSchema(followUpHistory).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  followUpDate: z.string().or(z.date()).transform(val => typeof val === 'string' ? new Date(val) : val),
  completedAt: z.string().or(z.date()).or(z.null()).optional().transform(val => 
    val === null || val === undefined || val === '' ? null : (typeof val === 'string' ? new Date(val) : val)
  ),
});

export const insertQuotationSchema = createInsertSchema(quotations).omit({
  id: true,
  quotationNumber: true,
  createdAt: true,
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  bookingNumber: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBeoSchema = createInsertSchema(beos).omit({
  id: true,
  beoNumber: true,
  createdAt: true,
  updatedAt: true,
});

export const insertApprovalSchema = createInsertSchema(approvals).omit({
  id: true,
  createdAt: true,
});

// export const insertPaymentSchema = createInsertSchema(payments).omit({
//   id: true,
//   paymentNumber: true,
//   createdAt: true,
// });

export const insertAmendmentSchema = createInsertSchema(amendments).omit({
  id: true,
  amendmentNumber: true,
  createdAt: true,
});

export const insertFunctionProspectSchema = createInsertSchema(functionProspects).omit({
  id: true,
  prospectNumber: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEnquiryAuditLogSchema = createInsertSchema(enquiryAuditLog).omit({
  id: true,
  createdAt: true,
});

export const insertBookingAuditLogSchema = createInsertSchema(bookingAuditLog).omit({
  id: true,
  createdAt: true,
});

// New schemas for roles and permissions system
export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
});

export const insertDropdownOptionSchema = createInsertSchema(dropdownOptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSystemAuditLogSchema = createInsertSchema(systemAuditLog).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Role = typeof roles.$inferSelect;
export type InsertUserNew = z.infer<typeof insertUserSchema>;
export type UserNew = typeof users.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertDropdownOption = z.infer<typeof insertDropdownOptionSchema>;
export type DropdownOption = typeof dropdownOptions.$inferSelect;
export type InsertSystemAuditLog = z.infer<typeof insertSystemAuditLogSchema>;
export type SystemAuditLog = typeof systemAuditLog.$inferSelect;
export type InsertEnquiry = z.infer<typeof insertEnquirySchema>;
export type Enquiry = typeof enquiries.$inferSelect;
export type InsertEnquiryStatusHistory = z.infer<typeof insertEnquiryStatusHistorySchema>;
export type EnquiryStatusHistory = typeof enquiryStatusHistory.$inferSelect;
export type InsertFollowUpHistory = z.infer<typeof insertFollowUpHistorySchema>;
export type FollowUpHistory = typeof followUpHistory.$inferSelect;
export type InsertQuotation = z.infer<typeof insertQuotationSchema>;
export type Quotation = typeof quotations.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertBeo = z.infer<typeof insertBeoSchema>;
export type Beo = typeof beos.$inferSelect;
export type InsertApproval = z.infer<typeof insertApprovalSchema>;
export type Approval = typeof approvals.$inferSelect;
// export type InsertPayment = z.infer<typeof insertPaymentSchema>;
// export type Payment = typeof payments.$inferSelect;
export type InsertAmendment = z.infer<typeof insertAmendmentSchema>;
export type Amendment = typeof amendments.$inferSelect;
export type InsertFunctionProspect = z.infer<typeof insertFunctionProspectSchema>;
export type FunctionProspect = typeof functionProspects.$inferSelect;
export type InsertEnquiryAuditLog = z.infer<typeof insertEnquiryAuditLogSchema>;
export type EnquiryAuditLog = typeof enquiryAuditLog.$inferSelect;
export type InsertBookingAuditLog = z.infer<typeof insertBookingAuditLogSchema>;
export type BookingAuditLog = typeof bookingAuditLog.$inferSelect;

// Booking Sessions
export const insertBookingSessionSchema = createInsertSchema(bookingSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBookingSession = z.infer<typeof insertBookingSessionSchema>;
export type BookingSession = typeof bookingSessions.$inferSelect;
