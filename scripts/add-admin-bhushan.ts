import 'dotenv/config';
import { getMongoDb, closeMongo } from '../server/mongo';
import bcryptjs from 'bcryptjs';

interface User {
  _id?: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  authProvider: string;
  roleId?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Role {
  _id?: string;
  name: string;
  displayName: string;
}

async function addAdminBhushan() {
  console.log('🌱 Adding admin user: Bhushan Koshire...');
  
  try {
    const db = await getMongoDb();
    const usersCollection = db.collection<User>('users');
    const rolesCollection = db.collection<Role>('roles');

    // First, get the admin role
    const adminRole = await rolesCollection.findOne({ name: 'admin' });
    if (!adminRole) {
      console.error('❌ Admin role not found. Please run: npm run mongo:seed:roles');
      process.exit(1);
    }

    const email = 'md.palmspringsresort@gmail.com';
    
    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      // Update existing user to admin
      const passwordHash = await bcryptjs.hash('pass123', 10);
      await usersCollection.updateOne(
        { _id: existingUser._id },
        {
          $set: {
            firstName: 'Bhushan',
            lastName: 'Koshire',
            passwordHash,
            roleId: adminRole._id,
            status: 'active',
            authProvider: 'local',
            updatedAt: new Date(),
          },
        }
      );
      console.log('✅ Updated existing user to admin:');
      console.log('   ID:', existingUser._id);
      console.log('   Email:', email);
      console.log('   Name: Bhushan Koshire');
      console.log('   Password: pass123');
      console.log('   Role: Admin');
      return;
    }

    // Create new admin user
    const passwordHash = await bcryptjs.hash('pass123', 10);
    const adminUser: User = {
      email,
      firstName: 'Bhushan',
      lastName: 'Koshire',
      passwordHash,
      authProvider: 'local',
      roleId: adminRole._id,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await usersCollection.insertOne(adminUser);
    console.log('✅ Admin user created successfully!');
    console.log('   ID:', result.insertedId);
    console.log('   Email:', email);
    console.log('   Name: Bhushan Koshire');
    console.log('   Password: pass123');
    console.log('   Role: Admin');

  } catch (error) {
    console.error('❌ Failed to add admin user:', error);
    process.exit(1);
  } finally {
    await closeMongo();
  }
}

addAdminBhushan();

