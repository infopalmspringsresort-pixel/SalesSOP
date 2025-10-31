import 'dotenv/config';
import { storage } from '../server/storage.js';

async function seedAllRoles() {
  console.log('🌱 Seeding all required roles...\n');

  try {
    // Get existing roles
    const existingRoles = await storage.getRoles();
    console.log('📊 Current roles:', existingRoles.map(r => r.name));

    // Define all required roles with their permissions
    const requiredRoles = [
      {
        name: 'admin' as const,
        displayName: 'Admin',
        description: 'Super admin with full access to all modules',
        permissions: {
          enquiries: { create: true, read: true, update: true, delete: true },
          bookings: { create: true, read: true, update: true, delete: true },
          reports: { view: true },
          settings: { manage: true },
          audit: { view: true },
          users: { create: true, read: true, update: true, delete: true }
        }
      },
      {
        name: 'manager' as const,
        displayName: 'Manager',
        description: 'Manager with access to team data and reports',
        permissions: {
          enquiries: { create: true, read: true, update: true, delete: false },
          bookings: { create: false, read: true, update: true, delete: false },
          reports: { view: true },
          settings: { manage: false },
          audit: { view: true },
          users: { create: false, read: true, update: false, delete: false }
        }
      },
      {
        name: 'salesperson' as const,
        displayName: 'Salesperson',
        description: 'Sales team member with access to own enquiries and bookings',
        permissions: {
          enquiries: { create: true, read: true, update: true, delete: false },
          bookings: { create: true, read: true, update: true, delete: false },
          reports: { view: true },
          settings: { manage: false },
          audit: { view: false },
          users: { create: false, read: false, update: false, delete: false }
        }
      },
      {
        name: 'accounts' as const,
        displayName: 'Accounts',
        description: 'Accounts team with access to booking approvals and payments',
        permissions: {
          enquiries: { create: false, read: true, update: false, delete: false },
          bookings: { create: false, read: true, update: true, delete: false },
          reports: { view: true },
          settings: { manage: false },
          audit: { view: false },
          users: { create: false, read: false, update: false, delete: false }
        }
      },
      {
        name: 'staff' as const,
        displayName: 'Staff',
        description: 'Basic staff member with limited access',
        permissions: {
          enquiries: { create: true, read: false, update: false, delete: false },
          bookings: { create: false, read: false, update: false, delete: false },
          reports: { view: false },
          settings: { manage: false },
          audit: { view: false },
          users: { create: false, read: false, update: false, delete: false }
        }
      }
    ];

    // Create or update each role
    for (const roleData of requiredRoles) {
      const existing = existingRoles.find(r => r.name === roleData.name);
      
      if (existing) {
        await storage.updateRole(existing.id, {
          displayName: roleData.displayName,
          description: roleData.description,
          permissions: roleData.permissions,
        });
        console.log(`✅ Updated existing ${roleData.name} role`);
      } else {
        await storage.createRole(roleData as any);
        console.log(`✅ Created new ${roleData.name} role`);
      }
    }

    // Check final results
    console.log('\n🎉 All roles seeded successfully!');
    const finalRoles = await storage.getRoles();
    console.log('\n📊 Final roles in database:');
    finalRoles.forEach((role, index) => {
      console.log(`${index + 1}. ${role.name} (${role.displayName})`);
    });

  } catch (error) {
    console.error('❌ Error seeding roles:', error);
    process.exit(1);
  }

  process.exit(0);
}

seedAllRoles();