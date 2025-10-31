import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema-client";

const dbStartTime = Date.now();
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});
export const db = drizzle({ client: pool, schema });
// Export tables for direct use
export const {
  users,
  roles,
  passwordResetTokens,
  dropdownOptions,
  systemAuditLog,
  enquiries,
  enquiryStatusHistory,
  followUpHistory,
  quotations,
  bookings,
  bookingSessions,
  beos,
  approvals,
  amendments,
  functionProspects,
  enquiryAuditLog,
  bookingAuditLog,
} = schema;