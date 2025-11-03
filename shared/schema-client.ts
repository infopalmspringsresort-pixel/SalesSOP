import { z } from "zod";

// ============================================================================
// ENUMS AND CONSTANTS
// ============================================================================

export const ROLE_TYPES = ['admin', 'manager', 'salesperson', 'accounts', 'staff'] as const;
export const USER_STATUSES = ['active', 'inactive'] as const;
export const ENQUIRY_STATUSES = ['new', 'quotation_sent', 'ongoing', 'converted', 'booked', 'closed', 'lost'] as const;
export const BOOKING_STATUSES = ['booked', 'pending_beo', 'beo_ready', 'in_progress', 'completed', 'cancelled', 'closed'] as const;
export const BEO_STATUSES = ['draft', 'verified', 'approved'] as const;
export const ASSIGNMENT_STATUSES = ['unassigned', 'pending', 'assigned', 'accepted', 'rejected'] as const;
export const TRANSFER_STATUSES = ['pending', 'accepted', 'declined', 'cancelled'] as const;

// ============================================================================
// CLIENT-SIDE SCHEMAS (String IDs)
// ============================================================================

// 1. ROLES COLLECTION
export const roleSchema = z.object({
  id: z.string().optional(),
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
  id: z.string().optional(),
  email: z.string().email().nullable().optional(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  profileImageUrl: z.string().nullable().optional(),
  roleId: z.string(),
  role: z.string().default('salesperson'),
  authProvider: z.string().default('local'),
  googleId: z.string().nullable().optional(),
  githubId: z.string().nullable().optional(),
  passwordHash: z.string().nullable().optional(),
  status: z.enum(USER_STATUSES).default('active'),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

// 3. ENQUIRIES COLLECTION
export const enquirySchema = z.object({
  id: z.string().optional(),
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
  salespersonId: z.string().nullable().optional(),
  createdBy: z.string(), // Who created the enquiry
  assignmentStatus: z.enum(ASSIGNMENT_STATUSES).default('assigned'), // pending, assigned, accepted, rejected
  assignedTo: z.string().nullable().optional(), // Who the enquiry is assigned to
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

// 4. ENQUIRY TRANSFER REQUESTS COLLECTION
export const enquiryTransferSchema = z.object({
  id: z.string().optional(),
  enquiryId: z.string(),
  fromUserId: z.string(), // Who is transferring
  toUserId: z.string(), // Who is receiving the transfer
  status: z.enum(TRANSFER_STATUSES).default('pending'),
  transferReason: z.string().nullable().optional(),
  responseNotes: z.string().nullable().optional(),
  requestedAt: z.date().optional(),
  respondedAt: z.date().nullable().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

// 5. BOOKINGS COLLECTION
export const bookingSchema = z.object({
  id: z.string().optional(),
  bookingNumber: z.string(),
  enquiryId: z.string(),
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
  salespersonId: z.string().nullable().optional(), // Reference to the assigned salesperson
  sessions: z.array(z.object({
    id: z.string().optional(),
    sessionName: z.string(),
    sessionLabel: z.string().optional(),
    venue: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    sessionDate: z.string(),
    specialInstructions: z.string().optional(),
  })).min(1, "At least one session is required"),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

// 5. BEO COLLECTION
export const beoSchema = z.object({
  id: z.string().optional(),
  beoNumber: z.string(),
  bookingId: z.string(),
  status: z.enum(BEO_STATUSES).default('draft'),
  specialInstructions: z.string().nullable().optional(),
  menuItems: z.array(z.any()).default([]),
  serviceRequirements: z.string().nullable().optional(),
  dietaryRestrictions: z.string().nullable().optional(),
  createdById: z.string().nullable().optional(),
  verifiedById: z.string().nullable().optional(),
  verifiedAt: z.date().nullable().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

// 6. SYSTEM AUDIT LOG
export const systemAuditSchema = z.object({
  id: z.string().optional(),
  userId: z.string().nullable().optional(),
  userRole: z.string().nullable().optional(),
  action: z.string(),
  module: z.string(),
  createdAt: z.date().optional()
});

// 7. DROPDOWN OPTIONS COLLECTION
export const dropdownOptionSchema = z.object({
  id: z.string().optional(),
  category: z.string(),
  value: z.string(),
  label: z.string(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().default(0),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

// 8. FOLLOW-UP HISTORY
export const followUpHistorySchema = z.object({
  id: z.string().optional(),
  enquiryId: z.string(),
  followUpDate: z.date(),
  notes: z.string().nullable().optional(),
  completed: z.boolean().default(false),
  completedAt: z.date().nullable().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

// ============================================================================
// MENU & ROOM MANAGEMENT SCHEMAS (CLIENT-SIDE)
// ============================================================================

// Menu Package Schema (Client-side with string IDs)
export const menuPackageSchema = z.object({
  id: z.string().optional(),
  name: z.string(), // e.g., "Royal", "Platinum", "Diamond"
  type: z.enum(['veg', 'non-veg']), // Vegetarian or Non-Vegetarian
  price: z.number(), // Price per person (calculated from menu items)
  description: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Package Item Schema (Client-side with string IDs) - renamed from Menu Item
// These are items inside menu packages (e.g., soups, starters with quantities)
export const menuItemSchema = z.object({
  id: z.string().optional(),
  packageId: z.string(), // Reference to menu package
  name: z.string(), // Package item name (e.g., "Soup", "Floating Starters", "Welcome Drinks")
  description: z.string().optional(),
  quantity: z.number().optional().default(1), // Number of items (e.g., 1 soup, 2 starters)
  isVeg: z.boolean().optional().default(true), // Vegetarian or Non-Vegetarian
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Additional Item Schema (Client-side with string IDs)
// These are additional package items with price - similar to package items but with price
export const additionalItemSchema = z.object({
  id: z.string().optional(),
  name: z.string(), // Package item name (e.g., "Soup", "Floating Starters", "Welcome Drinks")
  description: z.string().optional(),
  quantity: z.number().optional().default(1), // Number of items (e.g., 1 soup, 2 starters)
  price: z.number().min(1, "Price must be at least 1"), // Price per person
  isVeg: z.boolean().optional().default(true), // Vegetarian or Non-Vegetarian
  isActive: z.boolean().optional().default(true),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Room Type Schema (Client-side with string IDs)
export const roomTypeSchema = z.object({
  id: z.string().optional(),
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

// Venue Schema (Client-side with string IDs)
export const venueSchema = z.object({
  id: z.string().optional(),
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

// Package-Venue Mapping Schema (Client-side with string IDs)
export const packageVenueMappingSchema = z.object({
  id: z.string().optional(),
  packageName: z.string(), // e.g., "Silver Package", "Gold Package"
  venueId: z.string(), // Reference to venue
  minGuests: z.number(), // Minimum guests for this package-venue combination
  isActive: z.boolean().default(true),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// ============================================================================
// INSERT SCHEMAS (for API requests)
// ============================================================================

export const insertRoleSchema = roleSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserSchema = userSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const insertEnquirySessionSchema = enquirySessionSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const insertEnquirySchema = enquirySchema.omit({ id: true, createdAt: true, updatedAt: true });
export const insertEnquiryTransferSchema = enquiryTransferSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const insertBookingSchema = bookingSchema.omit({ id: true, bookingNumber: true, createdAt: true, updatedAt: true });
export const insertBeoSchema = beoSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const insertSystemAuditSchema = systemAuditSchema.omit({ id: true, createdAt: true });
export const insertDropdownOptionSchema = dropdownOptionSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const insertFollowUpHistorySchema = followUpHistorySchema.omit({ id: true, createdAt: true, updatedAt: true });

// Menu & Room Insert Schemas
export const insertMenuPackageSchema = menuPackageSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const insertMenuItemSchema = menuItemSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const insertAdditionalItemSchema = additionalItemSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const insertRoomTypeSchema = roomTypeSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const insertVenueSchema = venueSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const insertPackageVenueMappingSchema = packageVenueMappingSchema.omit({ id: true, createdAt: true, updatedAt: true });

// ============================================================================
// QUOTATION SCHEMAS
// ============================================================================

// Venue Rental Package Item
export const venueRentalItemSchema = z.object({
  eventDate: z.string().optional(), // Date in YYYY-MM-DD format or DD/MM/YYYY (optional for packages)
  venue: z.string(),
  venueSpace: z.string(), // e.g., "15000 Sq. ft."
  session: z.string(), // e.g., "All", "Morning", "Evening"
  sessionRate: z.number(),
});

// Room Package (simplified) - must be defined before quotationPackageSchema
export const roomPackageSchema = z.object({
  category: z.string(), // e.g., "Standard Room", "Deluxe Room"
  rate: z.number(), // Room rate
  numberOfRooms: z.union([z.number().min(1, "Number of rooms must be at least 1"), z.null()]).optional(), // Number of rooms
  totalOccupancy: z.union([z.number().min(1, "Total occupancy must be at least 1"), z.null()]).optional(), // Total occupancy (default: defaultOccupancy * numberOfRooms)
  defaultOccupancy: z.number().optional(), // Default occupancy per room from room type
  maxOccupancy: z.number().optional(), // Max occupancy per room from room type
  extraPersonRate: z.number().optional(), // Extra person rate from room type
});

// Quotation Package Schema - saved quotation templates that can be reused
export const quotationPackageSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Package name is required"), // e.g., "Wedding Package - Standard", "Corporate Event Package"
  description: z.string().optional(),
  
  // Venue Rental Package
  venueRentalItems: z.array(venueRentalItemSchema).default([]),
  
  // Room Quotation
  roomPackages: z.array(roomPackageSchema).default([]),
  
  // Menu Packages
  menuPackages: z.array(z.object({
    id: z.string().optional(),
    name: z.string(),
    type: z.string().default('non-veg'),
    price: z.number().default(0),
    gst: z.number().default(18),
    selectedItems: z.array(z.object({
      id: z.string().optional(),
      name: z.string(),
      price: z.number().default(0),
      additionalPrice: z.number().default(0),
      isPackageItem: z.boolean().default(true)
    })).default([]),
    customItems: z.array(z.object({
      name: z.string(),
      price: z.number().default(0)
    })).default([])
  })).default([]),
  
  // Default settings
  includeGST: z.boolean().default(false),
  defaultDiscountType: z.enum(['percentage', 'fixed']).optional(),
  defaultDiscountValue: z.number().default(0),
  
  // Terms & Conditions (defaults)
  checkInTime: z.string().default("14:00"),
  checkOutTime: z.string().default("11:00"),
  
  isActive: z.boolean().optional().default(true),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const insertQuotationPackageSchema = quotationPackageSchema.omit({ id: true, createdAt: true, updatedAt: true });

// Main Quotation Schema
export const quotationSchema = z.object({
  id: z.string().optional(),
  enquiryId: z.string(),
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
  
  // Menu Packages (for food quotations)
  menuPackages: z.array(z.object({
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
      isPackageItem: z.boolean().default(true), // True if from package, false if additional
      quantity: z.number().optional().default(1) // Quantity of this item
    })).default([]),
    customItems: z.array(z.object({
      name: z.string(),
      price: z.number().default(0)
    })).default([])
  })).default([]),
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
  createdBy: z.string(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const insertQuotationSchema = quotationSchema.omit({
  id: true,
  createdAt: true,
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
export type SystemAuditLog = z.infer<typeof systemAuditSchema>;
export type DropdownOption = z.infer<typeof dropdownOptionSchema>;
export type FollowUpHistory = z.infer<typeof followUpHistorySchema>;

export type InsertRole = z.infer<typeof insertRoleSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertEnquirySession = z.infer<typeof insertEnquirySessionSchema>;
export type InsertEnquiry = z.infer<typeof insertEnquirySchema>;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type InsertBeo = z.infer<typeof insertBeoSchema>;
export type InsertSystemAuditLog = z.infer<typeof insertSystemAuditSchema>;
export type InsertDropdownOption = z.infer<typeof insertDropdownOptionSchema>;
export type InsertFollowUpHistory = z.infer<typeof insertFollowUpHistorySchema>;

// Menu & Room Types
export type MenuPackage = z.infer<typeof menuPackageSchema>;
export type MenuItem = z.infer<typeof menuItemSchema>;
export type AdditionalItem = z.infer<typeof additionalItemSchema>;
export type RoomType = z.infer<typeof roomTypeSchema>;
export type Venue = z.infer<typeof venueSchema>;
export type PackageVenueMapping = z.infer<typeof packageVenueMappingSchema>;
export type VenueRentalItem = z.infer<typeof venueRentalItemSchema>;
export type RoomPackage = z.infer<typeof roomPackageSchema>;
export type Quotation = z.infer<typeof quotationSchema>;
export type QuotationPackage = z.infer<typeof quotationPackageSchema>;
export type InsertQuotationPackage = z.infer<typeof insertQuotationPackageSchema>;

export type InsertMenuPackage = z.infer<typeof insertMenuPackageSchema>;
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type InsertAdditionalItem = z.infer<typeof insertAdditionalItemSchema>;
export type InsertRoomType = z.infer<typeof insertRoomTypeSchema>;
export type InsertVenue = z.infer<typeof insertVenueSchema>;
export type InsertPackageVenueMapping = z.infer<typeof insertPackageVenueMappingSchema>;
export type InsertQuotation = z.infer<typeof insertQuotationSchema>;

// ============================================================================
// UPSERT TYPES
// ============================================================================

export type UpsertUser = User & { id?: string };
export type UpsertRole = Role & { id?: string };
export type UpsertEnquiry = Enquiry & { id?: string };
export type UpsertBooking = Booking & { id?: string };
export type UpsertBeo = Beo & { id?: string };

// ============================================================================
// USER MANAGEMENT TYPES
// ============================================================================

export type UserNew = User;