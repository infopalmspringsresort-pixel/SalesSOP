import 'dotenv/config';
import { getMongoDb, closeMongo } from '../server/mongo';

async function ensureIndexes() {
  const db = await getMongoDb();

  // users
  await db.collection('users').createIndexes([
    { key: { email: 1 }, name: 'uniq_user_email', unique: true, sparse: true },
    { key: { roleId: 1 }, name: 'idx_user_role' },
    { key: { status: 1 }, name: 'idx_user_status' },
  ]);

  // roles
  await db.collection('roles').createIndexes([
    { key: { name: 1 }, name: 'uniq_role_name', unique: true },
  ]);

  // sessions (created by connect-mongodb-session)
  // optional: ensure TTL if desired (connect-mongodb-session manages cleanup)

  // enquiries
  await db.collection('enquiries').createIndexes([
    { key: { enquiryNumber: 1 }, name: 'uniq_enquiry_number', unique: true },
    { key: { createdAt: -1 }, name: 'idx_enquiry_createdAt' },
    { key: { status: 1 }, name: 'idx_enquiry_status' },
    { key: { salespersonId: 1 }, name: 'idx_enquiry_salesperson' },
  ]);

  // bookings
  await db.collection('bookings').createIndexes([
    { key: { bookingNumber: 1 }, name: 'uniq_booking_number', unique: true },
    { key: { createdAt: -1 }, name: 'idx_booking_createdAt' },
    { key: { status: 1 }, name: 'idx_booking_status' },
    { key: { enquiryId: 1 }, name: 'idx_booking_enquiry' },
  ]);

  // audit logs
  await db.collection('system_audit_log').createIndexes([
    { key: { userId: 1, createdAt: -1 }, name: 'idx_sys_audit_user_created' },
    { key: { module: 1, createdAt: -1 }, name: 'idx_sys_audit_module_created' },
  ]);

  // dropdown options
  await db.collection('dropdown_options').createIndexes([
    { key: { category: 1, isActive: 1, sortOrder: 1 }, name: 'idx_dropdown_category_active_sort' },
  ]);

  // follow-up history
  await db.collection('follow_up_history').createIndexes([
    { key: { enquiryId: 1 }, name: 'idx_follow_up_history_enquiryId' },
    { key: { setById: 1 }, name: 'idx_follow_up_history_setById' },
    { key: { completed: 1 }, name: 'idx_follow_up_history_completed' },
    { key: { followUpDate: 1 }, name: 'idx_follow_up_history_followUpDate' },
    { key: { isOverdue: 1 }, name: 'idx_follow_up_history_isOverdue' },
    { key: { createdAt: -1 }, name: 'idx_follow_up_history_createdAt_desc' },
  ]);

  // enquiry status history
  await db.collection('enquiry_status_history').createIndexes([
    { key: { enquiryId: 1 }, name: 'idx_enquiry_status_history_enquiryId' },
    { key: { changedById: 1 }, name: 'idx_enquiry_status_history_changedById' },
    { key: { createdAt: -1 }, name: 'idx_enquiry_status_history_createdAt_desc' },
  ]);

  // bookings
  await db.collection('bookings').createIndexes([
    { key: { bookingNumber: 1 }, unique: true, name: 'idx_bookings_bookingNumber_unique' },
    { key: { enquiryId: 1 }, name: 'idx_bookings_enquiryId' },
    { key: { salespersonId: 1 }, name: 'idx_bookings_salespersonId' },
    { key: { status: 1 }, name: 'idx_bookings_status' },
    { key: { clientName: 1 }, name: 'idx_bookings_clientName' },
    { key: { eventDate: 1 }, name: 'idx_bookings_eventDate' },
    { key: { createdAt: -1 }, name: 'idx_bookings_createdAt_desc' },
  ]);

  // beos
  await db.collection('beos').createIndexes([
    { key: { beoNumber: 1 }, unique: true, name: 'idx_beos_beoNumber_unique' },
    { key: { bookingId: 1 }, name: 'idx_beos_bookingId' },
    { key: { status: 1 }, name: 'idx_beos_status' },
    { key: { clientName: 1 }, name: 'idx_beos_clientName' },
    { key: { eventDate: 1 }, name: 'idx_beos_eventDate' },
    { key: { createdAt: -1 }, name: 'idx_beos_createdAt_desc' },
  ]);

  // audit logs for reports
  await db.collection('enquiry_audit_log').createIndexes([
    { key: { enquiryId: 1 }, name: 'idx_enquiry_audit_log_enquiryId' },
    { key: { userId: 1 }, name: 'idx_enquiry_audit_log_userId' },
    { key: { createdAt: -1 }, name: 'idx_enquiry_audit_log_createdAt_desc' },
  ]);

  await db.collection('booking_audit_log').createIndexes([
    { key: { bookingId: 1 }, name: 'idx_booking_audit_log_bookingId' },
    { key: { userId: 1 }, name: 'idx_booking_audit_log_userId' },
    { key: { createdAt: -1 }, name: 'idx_booking_audit_log_createdAt_desc' },
  ]);

  // password reset tokens
  await db.collection('password_reset_tokens').createIndexes([
    { key: { token: 1 }, name: 'uniq_reset_token', unique: true },
    { key: { expiresAt: 1 }, name: 'ttl_reset_token', expireAfterSeconds: 0 },
  ]);

  // counters (for number generators) - _id is already unique by default
  await db.collection('counters').createIndexes([
    { key: { _id: 1 }, name: 'pk_counters' },
  ]);
}

async function main() {
  try {
    console.log('🔧 Creating MongoDB indexes...');
    await ensureIndexes();
    console.log('✅ Indexes ensured.');
  } catch (err) {
    console.error('❌ Failed to create indexes:', err);
    process.exitCode = 1;
  } finally {
    await closeMongo();
  }
}

main();


