import 'dotenv/config';
import { getMongoDb, getCollection, closeMongo } from '../server/mongo';

async function verifyServerConnection() {
  console.log('🔍 Verifying server MongoDB connection...\n');
  
  try {
    const db = await getMongoDb();
    const dbName = db.databaseName;
    console.log(`✅ Connected to database: ${dbName}\n`);

    // List collections
    const collections = await db.listCollections().toArray();
    console.log(`📊 Found ${collections.length} collections:\n`);
    
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      console.log(`   - ${collection.name}: ${count} documents`);
    }

    // Check admin user
    console.log('\n👤 Checking admin user...');
    const usersCollection = await getCollection('users');
    const adminUser = await usersCollection.findOne({ email: 'md.palmspringsresort@gmail.com' });
    
    if (adminUser) {
      console.log(`✅ Admin user found:`);
      console.log(`   - Email: ${adminUser.email}`);
      console.log(`   - Name: ${adminUser.firstName} ${adminUser.lastName}`);
      console.log(`   - Database: ${dbName}`);
    } else {
      console.log('❌ Admin user not found in this database');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await closeMongo();
  }
}

verifyServerConnection();

