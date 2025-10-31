import 'dotenv/config';
import { getMongoDb, closeMongo, getCollection } from '../server/mongo';

async function verifyConnection() {
  console.log('🔍 Verifying MongoDB connection and collections...');
  
  try {
    const db = await getMongoDb();
    const dbName = db.databaseName;
    console.log(`✅ Connected to database: ${dbName}\n`);

    // List all collections
    const collections = await db.listCollections().toArray();
    console.log(`📊 Found ${collections.length} collections:\n`);
    
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      console.log(`   - ${collection.name}: ${count} documents`);
    }

    // Check for admin user
    console.log('\n👤 Checking admin user...');
    const usersCollection = await getCollection('users');
    const adminUser = await usersCollection.findOne({ email: 'md.palmspringsresort@gmail.com' });
    
    if (adminUser) {
      console.log(`✅ Admin user found:`);
      console.log(`   - Email: ${adminUser.email}`);
      console.log(`   - Name: ${adminUser.firstName} ${adminUser.lastName}`);
      console.log(`   - ID: ${adminUser._id}`);
    } else {
      console.log('❌ Admin user not found');
    }

    // Check for roles
    console.log('\n🔐 Checking roles...');
    const rolesCollection = await getCollection('roles');
    const roles = await rolesCollection.find({}).toArray();
    console.log(`   Found ${roles.length} roles:`);
    for (const role of roles) {
      console.log(`   - ${role.name} (${role.displayName})`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await closeMongo();
  }
}

verifyConnection();

