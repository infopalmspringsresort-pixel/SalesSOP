import { z } from "zod";
import { ObjectId } from "mongodb";

// ============================================================================
// ENUMS AND CONSTANTS
// ============================================================================

export const ROLE_TYPES = ['admin', 'manager', 'salesperson', 'accounts', 'staff'] as const;
export const USER_STATUSES = ['active', 'inactive'] as const;
export const ENQUIRY_STATUSES = ['new', 'quotation_sent', 'ongoing', 'converted', 'booked', 'closed', 'lost'] as const;
export const BOOKING_STATUSES = ['booked', 'pending_beo', 'beo_ready', 'in_progress', 'completed', 'cancelled', 'closed'] as const;
export const BEO_STATUSES = ['draft', 'verified', 'approved'] as const;
export const ASSIGNMENT_STATUSES = ['unassigned', 'pending', 'assigned', 'accepted', 'rejected'] as const;

// ============================================================================
// MONGODB SCHEMAS (ObjectId IDs)
// ============================================================================

// 1. ROLES COLLECTION
export const roleSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  name: z.enum(ROLE_TYPES),
  displayName: z.string(),
  description: z.string().nullable().optional(),
  permissions: z.record(z.record(z.boolean())),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

// 2. ENQUIRY SESSION (embedded in enquiries)
export const enquirySessionSchema = z.object({
  id: z.string().optional(),
  sessionName: z.string(),
  sessionLabel: z.string().nullable().optional(),
  venue: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  sessionDate: z.date(),
  paxCount: z.number().default(0),
  specialInstructions: z.string().nullable().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

// 3. USERS COLLECTION
export const userSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  email: z.string().email().nullable().optional(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  profileImageUrl: z.string().nullable().optional(),
  roleId: z.instanceof(ObjectId).nullable().optional(),
  role: z.string().default('salesperson'),
  authProvider: z.string().default('local'),
  googleId: z.string().nullable().optional(),
  githubId: z.string().nullable().optional(),
  passwordHash: z.string().nullable().optional(),
  status: z.enum(USER_STATUSES).default('active'),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

// 4. ENQUIRIES COLLECTION
export const enquirySchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  enquiryNumber: z.string(),
  enquiryDate: z.date(),
  clientName: z.string(),
  contactNumber: z.string(),
  email: z.string().email().nullable().optional(),
  city: z.string().nullable().optional(),
  eventDate: z.date().nullable().optional(),
  eventEndDate: z.date().nullable().optional(),
  eventDuration: z.number().min(1).default(1),
  eventDates: z.array(z.date()).nullable().optional(),
  tentativeDates: z.array(z.date()).nullable().optional(),
  eventType: z.string().nullable().optional(),
  expectedPax: z.number().nullable().optional(),
  numberOfRooms: z.number().min(0).default(0),
  venue: z.string().nullable().optional(),
  budget: z.number().nullable().optional(),
  source: z.string(),
  sourceNotes: z.string().nullable().optional(),
  salespersonId: z.instanceof(ObjectId).nullable().optional(),
  createdBy: z.instanceof(ObjectId), // Who created the enquiry
  assignmentStatus: z.enum(ASSIGNMENT_STATUSES).default('assigned'), // pending, assigned, accepted, rejected
  assignedTo: z.instanceof(ObjectId).nullable().optional(), // Who the enquiry is assigned to
  status: z.enum(ENQUIRY_STATUSES).default('new'),
  closureReason: z.string().nullable().optional(),
  lostReason: z.string().nullable().optional(),
  followUpDate: z.date().nullable().optional(),
  notes: z.string().nullable().optional(),
  hasIncompleteFollowUp: z.boolean().optional(),
  sessions: z.array(enquirySessionSchema).default([]),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

// 5. BOOKINGS COLLECTION
export const bookingSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  bookingNumber: z.string(),
  enquiryId: z.instanceof(ObjectId),
  clientName: z.string(),
  contactNumber: z.string(),
  email: z.string().email().nullable().optional(),
  eventType: z.string(),
  eventDate: z.date(),
  eventEndDate: z.date().nullable().optional(),
  eventDuration: z.number().min(1).default(1),
  eventDates: z.array(z.date()).optional(),
  confirmedPax: z.number(),
  numberOfRooms: z.number().min(0).default(0),
  hall: z.string().nullable().optional(),
  totalAmount: z.number().min(0),
  advanceAmount: z.number().min(0).default(0),
  balanceAmount: z.number().min(0).default(0),
  contractSigned: z.boolean().default(false),
  status: z.enum(BOOKING_STATUSES).default('booked'),
  notes: z.string().nullable().optional(),
  salespersonId: z.instanceof(ObjectId).nullable().optional(), // Reference to the assigned salesperson
  sessions: z.array(z.object({
    id: z.string().optional(),
    sessionName: z.string(),
    sessionLabel: z.string().optional(),
    venue: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    sessionDate: z.date(),
    specialInstructions: z.string().optional(),
  })).min(1, "At least one session is required"),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

// 6. BEO COLLECTION
export const beoSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  beoNumber: z.string(),
  bookingId: z.instanceof(ObjectId),
  status: z.enum(BEO_STATUSES).default('draft'),
  specialInstructions: z.string().nullable().optional(),
  menuItems: z.array(z.any()).default([]),
  serviceRequirements: z.string().nullable().optional(),
  dietaryRestrictions: z.string().nullable().optional(),
  createdById: z.instanceof(ObjectId).nullable().optional(),
  verifiedById: z.instanceof(ObjectId).nullable().optional(),
  verifiedAt: z.date().nullable().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

// 7. SYSTEM AUDIT LOG
export const systemAuditSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  userId: z.instanceof(ObjectId).nullable().optional(),
  userRole: z.string().nullable().optional(),
  action: z.string(),
  module: z.string(),
  resourceType: z.string().nullable().optional(),
  resourceId: z.string().nullable().optional(),
  details: z.record(z.any()).nullable().optional(),
  ipAddress: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
  createdAt: z.date().optional()
});

// 8. DROPDOWN OPTIONS COLLECTION
export const dropdownOptionSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  category: z.string(),
  value: z.string(),
  label: z.string(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().default(0),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

// 9. FOLLOW-UP HISTORY
export const followUpHistorySchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  enquiryId: z.instanceof(ObjectId),
  followUpDate: z.date(),
  notes: z.string().nullable().optional(),
  completed: z.boolean().default(false),
  completedAt: z.date().nullable().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

// 10. QUOTATION COLLECTION (defined below with comprehensive schema)

// 11. APPROVAL COLLECTION
export const approvalSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  resourceType: z.string(),
  resourceId: z.instanceof(ObjectId),
  requestedBy: z.instanceof(ObjectId),
  approvedBy: z.instanceof(ObjectId).nullable().optional(),
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  comments: z.string().nullable().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

// 12. COUNTER COLLECTION
export const counterSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  name: z.string(),
  value: z.number().default(0),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

// ============================================================================
// MENU & ROOM MANAGEMENT SCHEMAS
// ============================================================================

// Menu Package Schema
export const menuPackageSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  name: z.string(), // e.g., "Royal", "Platinum", "Diamond"
  type: z.enum(['veg', 'non-veg']), // Vegetarian or Non-Vegetarian
  price: z.number(), // Price per person (calculated from menu items)
  description: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Menu Item Schema
export const menuItemSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  packageId: z.instanceof(ObjectId), // Reference to menu package
  category: z.string(), // e.g., "Welcome Drinks", "Soup Station", "Main Course"
  name: z.string(), // e.g., "Chicken Biryani", "Dal Tadka"
  description: z.string().optional(),
  quantity: z.number().default(1), // Number of items in this category
  price: z.number().default(0), // Individual item price (contributes to package total)
  additionalPrice: z.number().default(0), // Extra charge if applicable (for additional items)
  isVeg: z.boolean().default(true), // Vegetarian or Non-Vegetarian
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Additional Item Schema (for extra items like Juice, Soup, etc.)
export const additionalItemSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  name: z.string(), // e.g., "Juice Mocktail", "Soup"
  price: z.number(), // Price per person
  currency: z.string().default('INR'),
  category: z.string(), // e.g., "Beverages", "Starters", "Desserts"
  description: z.string().optional(),
  isVeg: z.boolean().default(true),
  isActive: z.boolean().default(true),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Room Type Schema
export const roomTypeSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  name: z.string().min(1, "Room name is required"), // e.g., "Deluxe Room", "Executive Room"
  baseRate: z.number().min(1, "Base rate must be greater than 0"), // Base room rate
  extraPersonRate: z.number().min(0, "Extra person rate must be 0 or greater"), // Rate for extra person
  currency: z.string().default('INR'),
  maxOccupancy: z.number().min(1, "Max occupancy must be at least 1").default(2), // Maximum persons per room
  defaultOccupancy: z.number().min(1, "Default occupancy must be at least 1").default(2), // Default occupancy
  description: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Venue Schema
export const venueSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  name: z.string().min(1, "Venue name is required"), // e.g., "Oasis The Lawns", "Areca The Banquet"
  area: z.number().min(1, "Area must be greater than 0"), // Area in square feet
  minGuests: z.number().min(1, "Minimum guests must be at least 1"), // Minimum number of guests
  maxGuests: z.number().min(1, "Maximum guests must be at least 1").optional(), // Maximum number of guests
  hiringCharges: z.number().min(1, "Hiring charges must be greater than 0"), // Venue hiring charges per session
  currency: z.string().default('INR'),
  description: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Package-Venue Mapping Schema
export const packageVenueMappingSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  packageName: z.string(), // e.g., "Silver Package", "Gold Package"
  venueId: z.instanceof(ObjectId), // Reference to venue
  minGuests: z.number(), // Minimum guests for this package-venue combination
  isActive: z.boolean().default(true),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// ============================================================================
// INSERT SCHEMAS
// ============================================================================

export const insertRoleSchema = roleSchema.omit({ _id: true, createdAt: true, updatedAt: true });
export const insertUserSchema = userSchema.omit({ _id: true, createdAt: true, updatedAt: true });
export const insertEnquirySessionSchema = enquirySessionSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const insertEnquirySchema = enquirySchema.omit({ _id: true, createdAt: true, updatedAt: true });
export const insertBookingSchema = bookingSchema.omit({ _id: true, bookingNumber: true, createdAt: true, updatedAt: true });
export const insertBeoSchema = beoSchema.omit({ _id: true, createdAt: true, updatedAt: true });
export const insertSystemAuditSchema = systemAuditSchema.omit({ _id: true, createdAt: true });
export const insertDropdownOptionSchema = dropdownOptionSchema.omit({ _id: true, createdAt: true, updatedAt: true });
export const insertFollowUpHistorySchema = followUpHistorySchema.omit({ _id: true, createdAt: true, updatedAt: true });
// insertQuotationSchema defined below with comprehensive schema
export const insertApprovalSchema = approvalSchema.omit({ _id: true, createdAt: true, updatedAt: true });
export const insertCounterSchema = counterSchema.omit({ _id: true, createdAt: true, updatedAt: true });

// Menu & Room Insert Schemas
export const insertMenuPackageSchema = menuPackageSchema.omit({ _id: true, createdAt: true, updatedAt: true });
export const insertMenuItemSchema = menuItemSchema.omit({ _id: true, createdAt: true, updatedAt: true });
export const insertAdditionalItemSchema = additionalItemSchema.omit({ _id: true, createdAt: true, updatedAt: true });
export const insertRoomTypeSchema = roomTypeSchema.omit({ _id: true, createdAt: true, updatedAt: true });
export const insertVenueSchema = venueSchema.omit({ _id: true, createdAt: true, updatedAt: true });
export const insertPackageVenueMappingSchema = packageVenueMappingSchema.omit({ _id: true, createdAt: true, updatedAt: true });

// ============================================================================
// QUOTATION SCHEMAS (MongoDB with ObjectId)
// ============================================================================

// Venue Rental Package Item
export const venueRentalItemSchema = z.object({
  venue: z.string(),
  venueSpace: z.string(), // e.g., "15000 Sq. ft."
  session: z.string(), // e.g., "All", "Morning", "Evening"
  sessionRate: z.number(),
});

// Room Package (simplified)
export const roomPackageSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  category: z.string(), // e.g., "Standard Room", "Deluxe Room"
  rate: z.number(), // Room rate
});

// Menu Package Item
export const menuPackageItemSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  type: z.string().default('non-veg'),
  price: z.number().default(0),
  gst: z.number().default(18),
  selectedItems: z.array(z.object({
    id: z.string().optional(),
    name: z.string(),
    price: z.number().default(0), // Individual item price
    additionalPrice: z.number().default(0), // Extra charge for additional items
    isPackageItem: z.boolean().default(true) // True if from package, false if additional
  })).default([]),
  customItems: z.array(z.object({
    name: z.string(),
    price: z.number().default(0)
  })).default([]),
  totalPackageItems: z.number().default(0), // Total count of items in package
  excludedItemCount: z.number().default(0) // Count of excluded items
});

// Main Quotation Schema
export const quotationSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  enquiryId: z.instanceof(ObjectId),
  quotationNumber: z.string(),
  clientName: z.string(),
  clientEmail: z.string().optional(),
  clientPhone: z.string().optional(),
  eventType: z.string(),
  eventDate: z.string(),
  eventEndDate: z.string().optional(),
  eventDuration: z.number().default(1),
  expectedGuests: z.number().default(0),
  
  // Venue Rental Package
  venueRentalItems: z.array(venueRentalItemSchema).default([]),
  venueRentalTotal: z.number().default(0),
  
  // Room Quotation
  roomPackages: z.array(roomPackageSchema).default([]),
  roomQuotationTotal: z.number().default(0),
  
  // Menu Packages
  menuPackages: z.array(menuPackageItemSchema).default([]),
  menuTotal: z.number().default(0),
  
  // Summary
  banquetTotal: z.number().default(0),
  roomTotal: z.number().default(0),
  grandTotal: z.number().default(0),
  
  // Discount
  discountType: z.enum(['percentage', 'fixed']).optional(), // percentage or fixed amount
  discountValue: z.number().default(0), // The discount value (e.g., 10 for 10% or 1000 for ₹1000)
  discountAmount: z.number().default(0), // Calculated discount amount in rupees
  discountReason: z.string().optional(), // Reason for the discount
  discountExceedsLimit: z.boolean().default(false), // True if discount exceeds admin-set limit (for notification)
  finalTotal: z.number().default(0), // Grand total after discount
  
  // GST
  includeGST: z.boolean().default(false), // Whether GST is included in the quotation
  
  // Terms & Conditions
  termsAndConditions: z.array(z.string()).default([]),
  checkInTime: z.string().default("14:00"),
  checkOutTime: z.string().default("11:00"),
  paymentTerms: z.string().default("Payment 100% Advance: 25% at the time of booking confirmation & 75% fifteen days prior to the function date."),
  musicPolicy: z.string().default("Music is allowed till 10:00 PM. However, the sound limit should be confined to Government Regulations"),
  permissionsRequired: z.string().default("Mandatory Permissions/Licenses to be obtained by guests like PPL / Music / Liquor licenses should be submitted prior to the event."),
  gstPolicy: z.string().default("Provide GSTIN prior to the event only."),
  venuePolicy: z.string().default("Choices of banquet halls are subject to availability. Management reserves the right to change the banquet hall."),
  extraSpacePolicy: z.string().default("Any other space required such as a store/venue for any function will be extra chargeable"),
  electricityPolicy: z.string().default("The hotel will only provide electricity supply for rooms, for the banquet supporting basic lighting, AC in the banquet & for basic lighting on the lawn. If any additional power supply is required, the power supply needs to be procured by the guest from our vendor at an additional cost."),
  decorPolicy: z.string().default("Décor is not a part of the above package. For décor requirements, we have impaneled vendor whom you can reach out to to for your requirements."),
  chairsTablesPolicy: z.string().default("Basic banquet chairs with covers will be provided by the hotel. Any specially decorated chairs/tables/covers need to be procured from our décorator."),
  prohibitedItems: z.string().default("Fire Crackers/Paper Blasts are not allowed within the premises of the hotel"),
  damageLiability: z.string().default("Any damage due to non-adherence to the hotel surface, hotel décor, hotel rooms, and linen will be billed by the hotel as deemed fit to compensate for the loss or damage to the property"),
  externalVendorPolicy: z.string().default("No external vendor in case of an event/hospitality team from the guest side will be allowed to display their branding in any form. Any damage by external vendors would be the responsibility of the main guest."),
  
  // Status and metadata
  status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired']).default('draft'),
  validUntil: z.union([z.date(), z.string()]).transform((val) => typeof val === 'string' ? new Date(val) : val),
  sentAt: z.date().optional(),
  acceptedAt: z.date().optional(),
  rejectedAt: z.date().optional(),
  notes: z.string().optional(),
  
  // Audit fields
  createdBy: z.instanceof(ObjectId),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const insertQuotationSchema = quotationSchema.omit({
  _id: true, 
  createdAt: true, 
  updatedAt: true,
});

// ============================================================================
// SYSTEM SETTINGS SCHEMA
// ============================================================================

export const systemSettingsSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  
  // Discount Settings
  maxDiscountPercentage: z.number().default(10), // Maximum discount % - track quotations exceeding this limit
  
  // Audit fields
  updatedBy: z.instanceof(ObjectId).optional(),
  updatedAt: z.date().optional(),
});

export const insertSystemSettingsSchema = systemSettingsSchema.omit({
  _id: true,
  updatedAt: true,
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Role = z.infer<typeof roleSchema>;
export type User = z.infer<typeof userSchema>;  
export type EnquirySession = z.infer<typeof enquirySessionSchema>;
export type Enquiry = z.infer<typeof enquirySchema>;
export type Booking = z.infer<typeof bookingSchema>;
export type Beo = z.infer<typeof beoSchema>;
export type SystemAudit = z.infer<typeof systemAuditSchema>;
export type DropdownOption = z.infer<typeof dropdownOptionSchema>;
export type FollowUpHistory = z.infer<typeof followUpHistorySchema>;
export type Approval = z.infer<typeof approvalSchema>;
export type Counter = z.infer<typeof counterSchema>;
export type Quotation = z.infer<typeof quotationSchema>;
export type SystemSettings = z.infer<typeof systemSettingsSchema>;

export type InsertRole = z.infer<typeof insertRoleSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertEnquirySession = z.infer<typeof insertEnquirySessionSchema>;
export type InsertEnquiry = z.infer<typeof insertEnquirySchema>;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type InsertBeo = z.infer<typeof insertBeoSchema>;
export type InsertSystemAudit = z.infer<typeof insertSystemAuditSchema>;
export type InsertDropdownOption = z.infer<typeof insertDropdownOptionSchema>;
export type InsertFollowUpHistory = z.infer<typeof insertFollowUpHistorySchema>;
export type InsertQuotation = z.infer<typeof insertQuotationSchema>;
export type InsertApproval = z.infer<typeof insertApprovalSchema>;
export type InsertCounter = z.infer<typeof insertCounterSchema>;

// Menu & Room Types
export type MenuPackage = z.infer<typeof menuPackageSchema>;
export type MenuItem = z.infer<typeof menuItemSchema>;
export type AdditionalItem = z.infer<typeof additionalItemSchema>;
export type RoomType = z.infer<typeof roomTypeSchema>;
export type Venue = z.infer<typeof venueSchema>;
export type PackageVenueMapping = z.infer<typeof packageVenueMappingSchema>;
export type VenueRentalItem = z.infer<typeof venueRentalItemSchema>;
export type RoomPackage = z.infer<typeof roomPackageSchema>;
export type MenuPackageItem = z.infer<typeof menuPackageItemSchema>;

export type InsertMenuPackage = z.infer<typeof insertMenuPackageSchema>;
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type InsertAdditionalItem = z.infer<typeof insertAdditionalItemSchema>;
export type InsertRoomType = z.infer<typeof insertRoomTypeSchema>;
export type InsertVenue = z.infer<typeof insertVenueSchema>;
export type InsertPackageVenueMapping = z.infer<typeof insertPackageVenueMappingSchema>;

// ============================================================================
// COLLECTIONS CONSTANT
// ============================================================================

export const COLLECTIONS = {
  ROLES: 'roles',
  USERS: 'users', 
  ENQUIRIES: 'enquiries',
  BOOKINGS: 'bookings',
  BEOS: 'beos',
  SYSTEM_AUDIT: 'system_audit',
  DROPDOWN_OPTIONS: 'dropdown_options',
  FOLLOW_UP_HISTORY: 'follow_up_history',
  QUOTATIONS: 'quotations',
  APPROVALS: 'approvals',
  COUNTERS: 'counters',
  MENU_PACKAGES: 'menu_packages',
  MENU_ITEMS: 'menu_items',
  ADDITIONAL_ITEMS: 'additional_items',
  ROOM_TYPES: 'room_types',
  VENUES: 'venues',
  PACKAGE_VENUE_MAPPINGS: 'package_venue_mappings',
} as const;