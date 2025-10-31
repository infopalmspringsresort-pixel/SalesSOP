// Ensure this is only imported on server side
if (typeof window !== 'undefined') {
  throw new Error('Storage cannot be used on client side');
}

import { nowIST } from '@shared/utils/timezone';
import {
  type User,
  type UpsertUser,
  type Enquiry,
  type InsertEnquiry,
  type Quotation,
  type Booking,
  type InsertBooking,
  type Beo,
  type InsertBeo,
  type Approval,
  type Amendment,
  type Role,
  type InsertRole,
  type UserNew,
  type InsertUserNew,
  type PasswordResetToken,
  type InsertPasswordResetToken,
  type DropdownOption,
  type InsertDropdownOption,
  type SystemAuditLog,
  type InsertSystemAuditLog,
  type EnquiryTransfer,
  type InsertEnquiryTransfer,
} from "@shared/schema-client";

export interface IStorage {
  // Updated interface with all required methods - v2
  // User operations (mandatory for authentication)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  updateUserPassword(userId: string, passwordHash: string): Promise<void>;
  createPasswordResetToken(tokenData: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenUsed(tokenId: string): Promise<void>;
  getUsers(): Promise<User[]>;
  upsertUser(userData: UpsertUser): Promise<User>;

  // Role management
  getRoles(): Promise<Role[]>;
  getRoleById(id: string): Promise<Role | undefined>;
  createRole(role: InsertRole): Promise<Role>;
  updateRole(id: string, data: Partial<Role>): Promise<Role>;

  // User management with roles
  getUserWithRole(id: string): Promise<(User & { role?: Role }) | undefined>;
  getUsersWithRoles(): Promise<(User & { role?: Role })[]>;
  createUser(user: InsertUserNew): Promise<UserNew>;
  updateUser(id: string, data: Partial<UserNew>): Promise<UserNew>;
  deactivateUser(id: string): Promise<UserNew>;
  assignUserRole(userId: string, roleId: string): Promise<UserNew>;

  // Password reset
  createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenUsed(id: string): Promise<void>;

  // Dropdown management
  getDropdownOptions(category: string): Promise<DropdownOption[]>;
  createDropdownOption(option: InsertDropdownOption): Promise<DropdownOption>;
  updateDropdownOption(id: string, data: Partial<DropdownOption>): Promise<DropdownOption>;
  deactivateDropdownOption(id: string): Promise<DropdownOption>;

  // Enquiry operations
  createEnquiry(enquiry: InsertEnquiry): Promise<Enquiry>;
  getEnquiries(filters?: any): Promise<Enquiry[]>;
  getEnquiryById(id: string): Promise<Enquiry | undefined>;
  updateEnquiry(id: string, data: Partial<Enquiry>): Promise<Enquiry>;
  updateEnquiryWithStatusHistory(id: string, data: Partial<Enquiry>, changedById?: string): Promise<Enquiry>;
  getNextEnquiryNumber(): Promise<string>;
  checkEnquiryVenueConflicts(params: {
    enquiryId?: string;
    tentativeDates: Date[];
    venues: Array<{ venue: string; startTime: string; endTime: string }>;
  }): Promise<{ hasConflict: boolean; conflicts: any[]; warnings: any[] }>;

  // Enquiry Transfer operations
  createEnquiryTransfer(transfer: InsertEnquiryTransfer): Promise<EnquiryTransfer>;
  getEnquiryTransfers(filters?: any): Promise<EnquiryTransfer[]>;
  getEnquiryTransferById(id: string): Promise<EnquiryTransfer | undefined>;
  getEnquiryTransfersByEnquiry(enquiryId: string): Promise<EnquiryTransfer[]>;
  getEnquiryTransfersByUser(userId: string): Promise<EnquiryTransfer[]>;
  updateEnquiryTransfer(id: string, data: Partial<EnquiryTransfer>): Promise<EnquiryTransfer>;
  acceptEnquiryTransfer(transferId: string, responseNotes?: string): Promise<EnquiryTransfer>;
  declineEnquiryTransfer(transferId: string, responseNotes?: string): Promise<EnquiryTransfer>;
  cancelEnquiryTransfer(transferId: string): Promise<EnquiryTransfer>;

  // Status History operations
  createStatusHistory(history: any): Promise<any>;
  getStatusHistoryByEnquiry(enquiryId: string): Promise<any[]>;

  // Follow-up History operations
  createFollowUpHistory(followUp: any): Promise<any>;
  getFollowUpHistoryByEnquiry(enquiryId: string): Promise<any[]>;
  updateFollowUpHistory(id: string, data: any): Promise<any>;
  markFollowUpCompleted(id: string, completedById: string, completionNotes?: string): Promise<any>;
  getAllFollowUps(): Promise<any[]>;
  completeAllFollowUpsForEnquiry(enquiryId: string, completedById: string): Promise<number>;
  rescheduleFollowUp(id: string, data: { followUpDate: Date; followUpTime: string; notes?: string; setById: string }): Promise<any>;
  getOverdueFollowUps(): Promise<any[]>;
  getFollowUpStatsByEnquiry(enquiryId: string): Promise<{
    totalFollowUps: number;
    completedFollowUps: number;
    overdueFollowUps: number;
    lastFollowUpDate: Date | null;
    nextFollowUpDate: Date | null;
  }>;

  // Repeat follow-up operations
  scheduleNextRepeatFollowUp(enquiry: Enquiry): Promise<void>;

  // Audit Log operations
  createAuditLog(auditLog: any): Promise<any>;
  getAuditLogByEnquiry(enquiryId: string): Promise<any[]>;
  reopenEnquiry(enquiryId: string, reason: string, notes: string, userId: string): Promise<Enquiry>;

  // Booking Audit Log operations
  createBookingAuditLog(auditLog: any): Promise<any>;
  getBookingAuditLogByBooking(bookingId: string): Promise<any[]>;

  // Dashboard metrics
  getDashboardMetrics(): Promise<{
    activeEnquiries: number;
    bookedBookings: number;
    lostEnquiries: number;
    conversionRate: number;
    monthlyRevenue: number;
  }>;

  // Reporting methods
  getEnquiryPipelineReport(filters: any): Promise<any>;
  getFollowUpPerformanceReport(filters: any): Promise<any>;
  getBookingAnalyticsReport(filters: any): Promise<any>;
  getTeamPerformanceReport(filters: any): Promise<any>;
  getAuditTrackingReport(filters: any): Promise<any>;

  // Booking operations
  createBooking(booking: InsertBooking): Promise<Booking>;
  getBookings(filters?: any): Promise<any[]>;
  getBookingById(id: string): Promise<any>;
  updateBooking(id: string, data: Partial<Booking>): Promise<Booking>;
  checkVenueConflicts(booking: InsertBooking): Promise<{ hasConflict: boolean; conflicts: any[] }>;

  // Quotation operations
  createQuotation(quotation: any): Promise<any>;
  getQuotations(filters?: any): Promise<any[]>;
  getQuotationById(id: string): Promise<any>;
  updateQuotation(id: string, data: any): Promise<any>;

  // BEO operations
  createBeo(beo: InsertBeo): Promise<Beo>;
  getBeos(filters?: any): Promise<any[]>;
  getBeoById(id: string): Promise<any>;
  updateBeo(id: string, data: Partial<Beo>): Promise<Beo>;

  // Permission checking
  hasPermission(userId: string, module: string, action: string): Promise<boolean>;
  getUserPermissions(userId: string): Promise<any>;

  // Menu Package operations
  getMenuPackages(): Promise<any[]>;
  getMenuPackageById(id: string): Promise<any>;
  createMenuPackage(package_: any): Promise<any>;
  updateMenuPackage(id: string, data: any): Promise<any>;
  deleteMenuPackage(id: string): Promise<boolean>;

  // Menu Item operations
  getMenuItems(): Promise<any[]>;
  getMenuItemsByPackage(packageId: string): Promise<any[]>;
  getMenuItemById(id: string): Promise<any>;
  createMenuItem(item: any): Promise<any>;
  updateMenuItem(id: string, data: any): Promise<any>;
  deleteMenuItem(id: string): Promise<boolean>;

  // Additional Item operations
  getAdditionalItems(): Promise<any[]>;
  getAdditionalItemById(id: string): Promise<any>;
  createAdditionalItem(item: any): Promise<any>;
  updateAdditionalItem(id: string, data: any): Promise<any>;
  deleteAdditionalItem(id: string): Promise<boolean>;

  // Room Type operations
  getRoomTypes(): Promise<any[]>;
  getRoomTypeById(id: string): Promise<any>;
  createRoomType(roomType: any): Promise<any>;
  updateRoomType(id: string, data: any): Promise<any>;
  deleteRoomType(id: string): Promise<boolean>;

  // Venue operations
  getVenues(): Promise<any[]>;
  getVenueById(id: string): Promise<any>;
  createVenue(venue: any): Promise<any>;
  updateVenue(id: string, data: any): Promise<any>;
  deleteVenue(id: string): Promise<boolean>;

  // Quotation operations
  getQuotations(): Promise<any[]>;
  getQuotationsByEnquiry(enquiryId: string): Promise<any[]>;
  getQuotationById(id: string): Promise<any>;
  createQuotation(quotation: any): Promise<any>;
  updateQuotation(id: string, data: any): Promise<any>;
  deleteQuotation(id: string): Promise<boolean>;
  
  // Quotation activity tracking
  createQuotationActivity(activity: any): Promise<void>;
  getQuotationActivitiesByEnquiry(enquiryId: string): Promise<any[]>;

}

// DatabaseStorage class - Postgres implementation (not used when DB_PROVIDER=mongo)
class DatabaseStorage implements IStorage {
  // All methods throw errors since we're using MongoDB only
  async getUser(id: string): Promise<User | undefined> {
    throw new Error('Postgres storage not available - using MongoDB only');
  }
  async getUserByEmail(email: string): Promise<User | undefined> { throw new Error('Postgres not available'); }
  async updateUserPassword(userId: string, passwordHash: string): Promise<void> { throw new Error('Postgres not available'); }
  async createPasswordResetToken(tokenData: InsertPasswordResetToken): Promise<PasswordResetToken> { throw new Error('Postgres not available'); }
  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> { throw new Error('Postgres not available'); }
  async markPasswordResetTokenUsed(tokenId: string): Promise<void> { throw new Error('Postgres not available'); }
  async getUsers(): Promise<User[]> { throw new Error('Postgres not available'); }
  async upsertUser(userData: UpsertUser): Promise<User> { throw new Error('Postgres not available'); }
  async getRoles(): Promise<Role[]> { throw new Error('Postgres not available'); }
  async getRoleById(id: string): Promise<Role | undefined> { throw new Error('Postgres not available'); }
  async createRole(role: InsertRole): Promise<Role> { throw new Error('Postgres not available'); }
  async updateRole(id: string, data: Partial<Role>): Promise<Role> { throw new Error('Postgres not available'); }
  async getUserWithRole(id: string): Promise<(User & { role?: Role }) | undefined> { throw new Error('Postgres not available'); }
  async getUsersWithRoles(): Promise<(User & { role?: Role })[]> { throw new Error('Postgres not available'); }
  async createUser(user: InsertUserNew): Promise<UserNew> { throw new Error('Postgres not available'); }
  async updateUser(id: string, data: Partial<UserNew>): Promise<UserNew> { throw new Error('Postgres not available'); }
  async deactivateUser(id: string): Promise<UserNew> { throw new Error('Postgres not available'); }
  async assignUserRole(userId: string, roleId: string): Promise<UserNew> { throw new Error('Postgres not available'); }
  async hasPermission(userId: string, module: string, action: string): Promise<boolean> { throw new Error('Postgres not available'); }
  async getUserPermissions(userId: string): Promise<any> { throw new Error('Postgres not available'); }
  async createSystemAuditLog(log: InsertSystemAuditLog): Promise<SystemAuditLog> { throw new Error('Postgres not available'); }
  async getSystemAuditLogs(filters?: any): Promise<SystemAuditLog[]> { throw new Error('Postgres not available'); }
  async getDropdownOptions(category: string): Promise<DropdownOption[]> { throw new Error('Postgres not available'); }
  async createDropdownOption(option: InsertDropdownOption): Promise<DropdownOption> { throw new Error('Postgres not available'); }
  async updateDropdownOption(id: string, data: Partial<DropdownOption>): Promise<DropdownOption> { throw new Error('Postgres not available'); }
  async deactivateDropdownOption(id: string): Promise<DropdownOption> { throw new Error('Postgres not available'); }
  async createEnquiry(enquiry: InsertEnquiry): Promise<Enquiry> { throw new Error('Postgres not available'); }
  async getEnquiries(filters?: any): Promise<Enquiry[]> { throw new Error('Postgres not available'); }
  async getEnquiryById(id: string): Promise<Enquiry | undefined> { throw new Error('Postgres not available'); }
  async updateEnquiry(id: string, data: Partial<Enquiry>): Promise<Enquiry> { throw new Error('Postgres not available'); }
  async updateEnquiryWithStatusHistory(id: string, data: Partial<Enquiry>, changedById?: string): Promise<Enquiry> { throw new Error('Postgres not available'); }
  async getNextEnquiryNumber(): Promise<string> { throw new Error('Postgres not available'); }
  async createStatusHistory(history: any): Promise<any> { throw new Error('Postgres not available'); }
  async getStatusHistoryByEnquiry(enquiryId: string): Promise<any[]> { throw new Error('Postgres not available'); }
  async createFollowUpHistory(followUp: any): Promise<any> { throw new Error('Postgres not available'); }
  async getFollowUpHistoryByEnquiry(enquiryId: string): Promise<any[]> { throw new Error('Postgres not available'); }
  async updateFollowUpHistory(id: string, data: any): Promise<any> { throw new Error('Postgres not available'); }
  async markFollowUpCompleted(id: string, completedById: string, completionNotes?: string): Promise<any> { throw new Error('Postgres not available'); }
  async getAllFollowUps(): Promise<any[]> { throw new Error('Postgres not available'); }
  async completeAllFollowUpsForEnquiry(enquiryId: string, completedById: string): Promise<number> { throw new Error('Postgres not available'); }
  async rescheduleFollowUp(id: string, data: { followUpDate: Date; followUpTime: string; notes?: string; setById: string }): Promise<any> { throw new Error('Postgres not available'); }
  async getOverdueFollowUps(): Promise<any[]> { throw new Error('Postgres not available'); }
  async getFollowUpStatsByEnquiry(enquiryId: string): Promise<any> { throw new Error('Postgres not available'); }
  async createBooking(booking: InsertBooking): Promise<Booking> { throw new Error('Postgres not available'); }
  async getBookings(filters?: any): Promise<any[]> { throw new Error('Postgres not available'); }
  async getBookingById(id: string): Promise<any> { throw new Error('Postgres not available'); }
  async updateBooking(id: string, data: Partial<Booking>): Promise<Booking> { throw new Error('Postgres not available'); }
  async getNextBookingNumber(): Promise<string> { throw new Error('Postgres not available'); }
  async createBeo(beo: InsertBeo): Promise<Beo> { throw new Error('Postgres not available'); }
  async getBeos(filters?: any): Promise<any[]> { throw new Error('Postgres not available'); }
  async getBeoById(id: string): Promise<any> { throw new Error('Postgres not available'); }
  async updateBeo(id: string, data: Partial<Beo>): Promise<Beo> { throw new Error('Postgres not available'); }
  async getNextBeoNumber(): Promise<string> { throw new Error('Postgres not available'); }
  async getDashboardMetrics(): Promise<any> { throw new Error('Postgres not available'); }
  async getEnquiryPipelineReport(filters: any): Promise<any> { throw new Error('Postgres not available'); }
  async getFollowUpPerformanceReport(filters: any): Promise<any> { throw new Error('Postgres not available'); }
  async getBookingAnalyticsReport(filters: any): Promise<any> { throw new Error('Postgres not available'); }
  async getTeamPerformanceReport(filters: any): Promise<any> { throw new Error('Postgres not available'); }
  async getAuditTrackingReport(filters: any): Promise<any> { throw new Error('Postgres not available'); }
  async scheduleNextRepeatFollowUp(enquiry: Enquiry): Promise<void> { throw new Error('Postgres not available'); }
  async createAuditLog(auditLog: any): Promise<any> { throw new Error('Postgres not available'); }
  async getAuditLogByEnquiry(enquiryId: string): Promise<any[]> { throw new Error('Postgres not available'); }
  async reopenEnquiry(enquiryId: string, reason: string, notes: string, userId: string): Promise<Enquiry> { throw new Error('Postgres not available'); }
  async createBookingAuditLog(auditLog: any): Promise<any> { throw new Error('Postgres not available'); }
  async getBookingAuditLogByBooking(bookingId: string): Promise<any[]> { throw new Error('Postgres not available'); }
  
  // Booking operations
  async createBooking(booking: InsertBooking): Promise<Booking> { throw new Error('Postgres not available'); }
  async getBookings(filters?: any): Promise<any[]> { throw new Error('Postgres not available'); }
  async getBookingById(id: string): Promise<any> { throw new Error('Postgres not available'); }
  async updateBooking(id: string, data: Partial<Booking>): Promise<Booking> { throw new Error('Postgres not available'); }
  async checkVenueConflicts(booking: InsertBooking): Promise<{ hasConflict: boolean; conflicts: any[] }> { throw new Error('Postgres not available'); }

  // Quotation operations
  async createQuotation(quotation: any): Promise<any> { throw new Error('Postgres not available'); }
  async getQuotations(filters?: any): Promise<any[]> { throw new Error('Postgres not available'); }
  async getQuotationById(id: string): Promise<any> { throw new Error('Postgres not available'); }
  async updateQuotation(id: string, data: any): Promise<any> { throw new Error('Postgres not available'); }

  // BEO operations
  async createBeo(beo: InsertBeo): Promise<Beo> { throw new Error('Postgres not available'); }
  async getBeos(filters?: any): Promise<any[]> { throw new Error('Postgres not available'); }
  async getBeoById(id: string): Promise<any> { throw new Error('Postgres not available'); }
  async updateBeo(id: string, data: Partial<Beo>): Promise<Beo> { throw new Error('Postgres not available'); }

  // Menu Package operations
  async getMenuPackages(): Promise<any[]> { throw new Error('Postgres not available'); }
  async getMenuPackageById(id: string): Promise<any> { throw new Error('Postgres not available'); }
  async createMenuPackage(package_: any): Promise<any> { throw new Error('Postgres not available'); }
  async updateMenuPackage(id: string, data: any): Promise<any> { throw new Error('Postgres not available'); }
  async deleteMenuPackage(id: string): Promise<boolean> { throw new Error('Postgres not available'); }

  // Menu Item operations
  async getMenuItems(): Promise<any[]> { throw new Error('Postgres not available'); }
  async getMenuItemsByPackage(packageId: string): Promise<any[]> { throw new Error('Postgres not available'); }
  async getMenuItemById(id: string): Promise<any> { throw new Error('Postgres not available'); }
  async createMenuItem(item: any): Promise<any> { throw new Error('Postgres not available'); }
  async updateMenuItem(id: string, data: any): Promise<any> { throw new Error('Postgres not available'); }
  async deleteMenuItem(id: string): Promise<boolean> { throw new Error('Postgres not available'); }

  // Additional Item operations
  async getAdditionalItems(): Promise<any[]> { throw new Error('Postgres not available'); }
  async getAdditionalItemById(id: string): Promise<any> { throw new Error('Postgres not available'); }
  async createAdditionalItem(item: any): Promise<any> { throw new Error('Postgres not available'); }
  async updateAdditionalItem(id: string, data: any): Promise<any> { throw new Error('Postgres not available'); }
  async deleteAdditionalItem(id: string): Promise<boolean> { throw new Error('Postgres not available'); }

  // Room Type operations
  async getRoomTypes(): Promise<any[]> { throw new Error('Postgres not available'); }
  async getRoomTypeById(id: string): Promise<any> { throw new Error('Postgres not available'); }
  async createRoomType(roomType: any): Promise<any> { throw new Error('Postgres not available'); }
  async updateRoomType(id: string, data: any): Promise<any> { throw new Error('Postgres not available'); }
  async deleteRoomType(id: string): Promise<boolean> { throw new Error('Postgres not available'); }

  // Venue operations
  async getVenues(): Promise<any[]> { throw new Error('Postgres not available'); }
  async getVenueById(id: string): Promise<any> { throw new Error('Postgres not available'); }
  async createVenue(venue: any): Promise<any> { throw new Error('Postgres not available'); }
  async updateVenue(id: string, data: any): Promise<any> { throw new Error('Postgres not available'); }
  async deleteVenue(id: string): Promise<boolean> { throw new Error('Postgres not available'); }

  // Quotation operations
  async getQuotations(): Promise<any[]> { throw new Error('Postgres not available'); }
  async getQuotationsByEnquiry(enquiryId: string): Promise<any[]> { throw new Error('Postgres not available'); }
  async getQuotationById(id: string): Promise<any> { throw new Error('Postgres not available'); }
  async createQuotation(quotation: any): Promise<any> { throw new Error('Postgres not available'); }
  async updateQuotation(id: string, data: any): Promise<any> { throw new Error('Postgres not available'); }
  async deleteQuotation(id: string): Promise<boolean> { throw new Error('Postgres not available'); }
  
  // Quotation activity tracking
  async createQuotationActivity(activity: any): Promise<void> { throw new Error('Postgres not available'); }
  async getQuotationActivitiesByEnquiry(enquiryId: string): Promise<any[]> { throw new Error('Postgres not available'); }

}

import { MongoStorage } from './storage-mongo';

const provider = (process.env.DB_PROVIDER || 'postgres').toLowerCase();
let storage: IStorage;

if (provider === 'mongo') {
  storage = new MongoStorage();
} else {
  storage = new DatabaseStorage();
}

export { storage };