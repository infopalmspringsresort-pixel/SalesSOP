import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sales-sop-generator';
const DB_NAME = process.env.MONGODB_DB_NAME || 'PALMSPRINGDB';

async function clearQuotations() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const quotationsCollection = db.collection('quotations');
    
    // Delete all quotations
    const result = await quotationsCollection.deleteMany({});
    
    console.log(`✅ Deleted ${result.deletedCount} quotations`);
    
    // Also clear quotation activities if they exist
    const activitiesCollection = db.collection('quotation_activities');
    const activitiesResult = await activitiesCollection.deleteMany({});
    
    console.log(`✅ Deleted ${activitiesResult.deletedCount} quotation activities`);
    
  } catch (error) {
    console.error('❌ Error clearing quotations:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

clearQuotations();

