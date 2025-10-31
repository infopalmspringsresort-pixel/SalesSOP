import { MongoClient, Db, Collection, ObjectId } from 'mongodb';
import { COLLECTIONS } from "@shared/schema-mongodb";
import type {
  Role,
  User,
  Enquiry,
  Quotation,
  Booking,
  Beo,
  SystemAudit,
  DropdownOption,
  Approval,
  Counter,
  SystemSettings
} from "@shared/schema-mongodb";

const dbStartTime = Date.now();
// MongoDB connection URL - supports both local and MongoDB Atlas
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "MONGODB_URI or DATABASE_URL must be set. Please configure your MongoDB connection string.",
  );
}
// MongoDB Client Configuration
const clientOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4 // Use IPv4
};

export const mongoClient = new MongoClient(MONGODB_URI, clientOptions);

// Database instance
export let db: Db;

// Collection exports
export let rolesCollection: Collection<Role>;
export let usersCollection: Collection<User>;
export let enquiriesCollection: Collection<Enquiry>;
export let quotationsCollection: Collection<Quotation>;
export let quotationActivitiesCollection: Collection<any>;
export let bookingsCollection: Collection<Booking>;
export let beosCollection: Collection<Beo>;
export let systemAuditCollection: Collection<SystemAudit>;
export let dropdownOptionsCollection: Collection<DropdownOption>;
export let approvalsCollection: Collection<Approval>;
export let countersCollection: Collection<Counter>;
export let systemSettingsCollection: Collection<SystemSettings>;

// Connection function
export async function connectToDatabase() {
  try {
    await mongoClient.connect();
    // Get database instance
    const dbName = process.env.MONGODB_DB_NAME || 'PALMSPRINGDB';
    db = mongoClient.db(dbName);
    // Initialize collections
    rolesCollection = db.collection<Role>(COLLECTIONS.ROLES);
    usersCollection = db.collection<User>(COLLECTIONS.USERS);
    enquiriesCollection = db.collection<Enquiry>(COLLECTIONS.ENQUIRIES);
    quotationsCollection = db.collection<Quotation>(COLLECTIONS.QUOTATIONS);
    quotationActivitiesCollection = db.collection<any>('quotation_activities');
    bookingsCollection = db.collection<Booking>(COLLECTIONS.BOOKINGS);
    beosCollection = db.collection<Beo>(COLLECTIONS.BEOS);
    systemAuditCollection = db.collection<SystemAudit>(COLLECTIONS.SYSTEM_AUDIT);
    dropdownOptionsCollection = db.collection<DropdownOption>(COLLECTIONS.DROPDOWN_OPTIONS);
    approvalsCollection = db.collection<Approval>(COLLECTIONS.APPROVALS);
    countersCollection = db.collection<Counter>('counters');
    systemSettingsCollection = db.collection<SystemSettings>(COLLECTIONS.SYSTEM_SETTINGS);
    
    // Create indexes for performance
    await createIndexes();
    
    } catch (error) {
    throw error;
  }
}

// Create database indexes for optimal performance
async function createIndexes() {
  try {
    // Users indexes
    await usersCollection.createIndex({ email: 1 }, { unique: true, sparse: true });
    await usersCollection.createIndex({ roleId: 1 });
    await usersCollection.createIndex({ authProvider: 1, googleId: 1 });
    await usersCollection.createIndex({ authProvider: 1, githubId: 1 });
    
    // Enquiries indexes
    await enquiriesCollection.createIndex({ enquiryNumber: 1 }, { unique: true });
    await enquiriesCollection.createIndex({ salespersonId: 1 });
    await enquiriesCollection.createIndex({ status: 1 });
    await enquiriesCollection.createIndex({ enquiryDate: -1 });
    await enquiriesCollection.createIndex({ eventDate: 1 });
    await enquiriesCollection.createIndex({ followUpDate: 1 });
    await enquiriesCollection.createIndex({ clientName: "text", contactNumber: "text" });
    
    // Quotations indexes
    await quotationsCollection.createIndex({ quotationNumber: 1 }, { unique: true });
    await quotationsCollection.createIndex({ enquiryId: 1 });
    await quotationsCollection.createIndex({ createdAt: -1 });
    
    // Quotation Activities indexes
    await quotationActivitiesCollection.createIndex({ enquiryId: 1 });
    await quotationActivitiesCollection.createIndex({ quotationId: 1 });
    await quotationActivitiesCollection.createIndex({ timestamp: -1 });
    
    // Bookings indexes
    await bookingsCollection.createIndex({ bookingNumber: 1 }, { unique: true });
    await bookingsCollection.createIndex({ enquiryId: 1 });
    await bookingsCollection.createIndex({ quotationId: 1 });
    await bookingsCollection.createIndex({ status: 1 });
    await bookingsCollection.createIndex({ eventDate: 1 });
    await bookingsCollection.createIndex({ createdAt: -1 });
    await bookingsCollection.createIndex({ clientName: "text", contactNumber: "text" });
    
    // BEOs indexes  
    await beosCollection.createIndex({ beoNumber: 1 }, { unique: true });
    await beosCollection.createIndex({ bookingId: 1 });
    await beosCollection.createIndex({ status: 1 });
    await beosCollection.createIndex({ createdAt: -1 });
    
    // System Audit indexes
    await systemAuditCollection.createIndex({ userId: 1, createdAt: -1 });
    await systemAuditCollection.createIndex({ module: 1, action: 1 });
    await systemAuditCollection.createIndex({ resourceType: 1, resourceId: 1 });
    await systemAuditCollection.createIndex({ createdAt: -1 });
    
    // Dropdown Options indexes
    await dropdownOptionsCollection.createIndex({ category: 1, sortOrder: 1 });
    await dropdownOptionsCollection.createIndex({ isActive: 1 });
    
    // Approvals indexes
    await approvalsCollection.createIndex({ referenceNumber: 1 });
    await approvalsCollection.createIndex({ referenceType: 1, referenceId: 1 });
    await approvalsCollection.createIndex({ status: 1 });
    await approvalsCollection.createIndex({ requestedById: 1 });
    await approvalsCollection.createIndex({ approverId: 1 });
    await approvalsCollection.createIndex({ createdAt: -1 });
    
    // Counters indexes
    await countersCollection.createIndex({ _id: 1 }, { unique: true });
    
    } catch (error) {
    }
}

// Graceful shutdown
export async function closeDatabaseConnection() {
  try {
    await mongoClient.close();
    } catch (error) {
    }
}

// Utility functions
export { ObjectId } from 'mongodb';

// Auto-connect disabled - using server/mongo.ts instead
// The db.ts file is kept for backward compatibility but should not auto-connect
// if (process.env.NODE_ENV !== 'test') {
//   connectToDatabase().catch(console.error);
// }