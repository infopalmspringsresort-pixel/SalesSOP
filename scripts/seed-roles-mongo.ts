import 'dotenv/config';
import { getMongoDb, closeMongo } from '../server/mongo';

async function upsertRole(name: string, displayName: string, description: string, permissions: any) {
  const db = await getMongoDb();
  await db.collection('roles').updateOne(
    { name },
    {
      $set: {
        name,
        displayName,
        description,
        permissions,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );
}

async function main() {
  try {
    console.log('🌱 Seeding roles in Mongo...');
    // Admin: full access
    await upsertRole('admin', 'Admin', 'Full access to all modules', { '*': { '*': true } });
    // Manager: broad access (example skeleton)
    await upsertRole('manager', 'Manager', 'Manage team and operations', {
      enquiries: { create: true, read: true, update: true, delete: true },
      bookings: { create: true, read: true, update: true, delete: true },
      reports: { view: true },
      settings: { manage: true },
      audit: { view: true },
    });
    // Salesperson: typical sales
    await upsertRole('salesperson', 'Salesperson', 'Sales operations', {
      enquiries: { create: true, read: true, update: true, delete: false },
      bookings: { create: true, read: true, update: true, delete: false },
      reports: { view: false },
      settings: { manage: false },
      audit: { view: false },
    });
    // Accounts: finance
    await upsertRole('accounts', 'Accounts', 'Accounts and billing', {
      enquiries: { create: false, read: true, update: false, delete: false },
      bookings: { create: false, read: true, update: false, delete: false },
      reports: { view: true },
      settings: { manage: false },
      audit: { view: false },
    });
    // Staff: create enquiry only
    await upsertRole('staff', 'Staff', 'Can create enquiries only', {
      enquiries: { create: true, read: false, update: false, delete: false },
      bookings: { create: false, read: false, update: false, delete: false },
      reports: { view: false },
      settings: { manage: false },
      audit: { view: false },
    });
    console.log('✅ Roles seeded/updated.');
  } catch (err) {
    console.error('❌ Role seeding failed:', err);
    process.exitCode = 1;
  } finally {
    await closeMongo();
  }
}

main();


