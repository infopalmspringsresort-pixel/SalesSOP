import 'dotenv/config';
import { storage } from '../server/storage';

async function seedStaffRole() {
  try {
    const roles = await storage.getRoles();
    const existing = roles.find((r: any) => r.name === 'staff');

    const staffPermissions = {
      enquiries: { create: true, read: true, update: false, delete: false },
      bookings: { read: false, create: false, update: false, delete: false },
      reports: { view: false },
      settings: { manage: false },
      audit: { view: false },
    } as any;

    if (existing) {
      await storage.updateRole(existing.id, {
        displayName: 'Staff',
        description: 'Can create and view enquiries',
        permissions: staffPermissions,
      });
      console.log('✅ Updated existing Staff role');
    } else {
      await storage.createRole({
        name: 'staff' as any,
        displayName: 'Staff',
        description: 'Can create and view enquiries',
        permissions: staffPermissions,
      } as any);
      console.log('✅ Created Staff role');
    }
  } catch (err) {
    console.error('❌ Failed to seed Staff role:', err);
    process.exit(1);
  }

  process.exit(0);
}

seedStaffRole();



