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

async function seedAdmin() {
  console.log('🌱 Seeding admin user into MongoDB...');
  
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

    // Check if admin already exists
    const existingAdmin = await usersCollection.findOne({ email: 'admin@palmsprings.com' });
    if (existingAdmin) {
      console.log('✅ Admin user already exists:', existingAdmin.email);
      console.log('   ID:', existingAdmin._id);
      console.log('   Name:', existingAdmin.firstName, existingAdmin.lastName);
      return;
    }

    // Create admin user
    const passwordHash = await bcryptjs.hash('admin123', 10);
    const adminUser: User = {
      email: 'admin@palmsprings.com',
      firstName: 'Admin',
      lastName: 'User',
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
    console.log('   Email: admin@palmsprings.com');
    console.log('   Password: admin123');
    console.log('   Role: Admin');

  } catch (error) {
    console.error('❌ Failed to seed admin user:', error);
    process.exit(1);
  } finally {
    await closeMongo();
  }
}

seedAdmin();
