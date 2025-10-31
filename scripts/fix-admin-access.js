// Script to fix admin access for audit logs
import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sales-sop-generator';

async function fixAdminAccess() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('🔍 Fixing admin access for audit logs...\n');
    
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    
    // Check if admin role exists
    let adminRole = await db.collection('roles').findOne({ name: 'admin' });
    if (!adminRole) {
      console.log('📝 Creating admin role...');
      adminRole = {
        _id: new ObjectId(),
        name: 'admin',
        displayName: 'Administrator',
        permissions: {
          users: { create: true, read: true, update: true, delete: true },
          enquiries: { create: true, read: true, update: true, delete: true },
          bookings: { create: true, read: true, update: true, delete: true },
          reports: { create: true, read: true, update: true, delete: true, export: true },
          settings: { create: true, read: true, update: true, delete: true },
          audit: { read: true, export: true }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await db.collection('roles').insertOne(adminRole);
      console.log('✅ Admin role created');
    } else {
      console.log('✅ Admin role exists');
    }
    
    // Check if admin user exists
    let adminUser = await db.collection('users').findOne({ email: 'admin@example.com' });
    if (!adminUser) {
      console.log('📝 Creating admin user...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      adminUser = {
        _id: new ObjectId(),
        email: 'admin@example.com',
        passwordHash: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: {
          _id: adminRole._id,
          name: 'admin',
          displayName: 'Administrator'
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await db.collection('users').insertOne(adminUser);
      console.log('✅ Admin user created');
    } else {
      console.log('✅ Admin user exists');
      // Update role if needed
      if (adminUser.role?.name !== 'admin') {
        console.log('📝 Updating user role to admin...');
        await db.collection('users').updateOne(
          { _id: adminUser._id },
          { 
            $set: { 
              role: {
                _id: adminRole._id,
                name: 'admin',
                displayName: 'Administrator'
              },
              updatedAt: new Date()
            }
          }
        );
        console.log('✅ User role updated to admin');
      }
    }
    
    // Check audit logs
    const auditCount = await db.collection('system_audit_log').countDocuments();
    console.log(`\n📊 Audit logs: ${auditCount}`);
    
    if (auditCount === 0) {
      console.log('📝 Creating sample audit logs...');
      const sampleLogs = [
        {
          _id: new ObjectId(),
          userId: adminUser._id,
          userRole: 'admin',
          action: 'login',
          module: 'auth',
          resourceType: 'user',
          resourceId: adminUser._id.toString(),
          details: {
            success: true,
            loginMethod: 'password',
            timestamp: new Date().toISOString()
          },
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
        },
        {
          _id: new ObjectId(),
          userId: adminUser._id,
          userRole: 'admin',
          action: 'viewed',
          module: 'reports',
          resourceType: 'audit_log',
          details: {
            success: true,
            filters: { module: 'auth' },
            resultCount: 1,
            timestamp: new Date().toISOString()
          },
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000) // 1 hour ago
        }
      ];
      
      await db.collection('system_audit_log').insertMany(sampleLogs);
      console.log('✅ Sample audit logs created');
    }
    
    console.log('\n🎉 Admin access fixed!');
    console.log('📧 Login with: admin@example.com');
    console.log('🔑 Password: admin123');
    console.log('👤 Role: Administrator');
    console.log('\n💡 Now you should be able to access the audit trail!');
    
  } catch (error) {
    console.error('❌ Error fixing admin access:', error);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 MongoDB is not running. Please start MongoDB first.');
    }
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

fixAdminAccess();
