import 'dotenv/config';
import { getMongoDb, closeMongo } from '../server/mongo';
import { Collection } from 'mongodb';
import bcryptjs from 'bcryptjs';

interface User {
  _id?: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  roleId: string;
  status: 'active' | 'inactive';
  authProvider: 'local';
  createdAt?: Date;
  updatedAt?: Date;
}

interface Role {
  _id: string;
  name: string;
}

async function updateAdmin() {
  console.log('🔄 Updating admin user in MongoDB...');
  try {
    const db = await getMongoDb();
    const usersCollection: Collection<User> = db.collection('users');
    const rolesCollection: Collection<Role> = db.collection('roles');

    // Get admin role
    const adminRole = await rolesCollection.findOne({ name: 'admin' });

    if (!adminRole) {
      console.error('❌ Admin role not found. Please run `npm run mongo:seed:roles` first.');
      process.exit(1);
    }

    // Delete existing admin user
    const oldAdmin = await usersCollection.findOne({ email: 'admin@palmsprings.com' });
    if (oldAdmin) {
      await usersCollection.deleteOne({ _id: oldAdmin._id });
      console.log('🗑️ Deleted old admin user: admin@palmsprings.com');
    }

    // Create new admin user
    const newAdminEmail = 'md.palmspringsresort@gmail.com';
    const newAdminPassword = 'pass123';
    const hashedPassword = await bcryptjs.hash(newAdminPassword, 10);

    // Check if new admin already exists
    const existingNewAdmin = await usersCollection.findOne({ email: newAdminEmail });

    if (existingNewAdmin) {
      // Update existing user to admin
      await usersCollection.updateOne(
        { _id: existingNewAdmin._id },
        {
          $set: {
            passwordHash: hashedPassword,
            roleId: adminRole._id.toString(),
            status: 'active',
            authProvider: 'local',
            firstName: 'Admin',
            lastName: 'User',
            updatedAt: new Date(),
          },
        }
      );
      console.log(`🔄 Updated existing user to admin: ${newAdminEmail}`);
    } else {
      // Create new admin user
      await usersCollection.insertOne({
        email: newAdminEmail,
        passwordHash: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        roleId: adminRole._id.toString(),
        status: 'active',
        authProvider: 'local',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`➕ Created new admin user: ${newAdminEmail}`);
    }

    console.log('✅ Admin user updated successfully!');
    console.log(`   Email: ${newAdminEmail}`);
    console.log(`   Password: ${newAdminPassword}`);
    console.log(`   Role: Admin`);

  } catch (error) {
    console.error('❌ Failed to update admin user:', error);
    process.exit(1);
  } finally {
    await closeMongo();
  }
}

updateAdmin();
