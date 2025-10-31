import 'dotenv/config';
import { MongoClient } from 'mongodb';

async function listDatabases() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌ MONGODB_URI not set');
    process.exit(1);
  }

  console.log('🔍 Listing all databases in cluster...\n');

  const client = new MongoClient(uri);

  try {
    await client.connect();
    
    const adminDb = client.db().admin();
    const { databases } = await adminDb.listDatabases();
    
    console.log(`📊 Found ${databases.length} databases:\n`);
    
    for (const dbInfo of databases) {
      // Skip system databases
      if (['admin', 'config', 'local'].includes(dbInfo.name)) continue;
      
      console.log(`   📁 ${dbInfo.name} (${(dbInfo.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
      
      const db = client.db(dbInfo.name);
      const collections = await db.listCollections().toArray();
      
      for (const collection of collections) {
        const count = await db.collection(collection.name).countDocuments();
        console.log(`      - ${collection.name}: ${count} documents`);
      }
      console.log();
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

listDatabases();

