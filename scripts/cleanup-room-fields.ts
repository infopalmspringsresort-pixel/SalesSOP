import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'sales_sop_generator';

async function cleanupRoomFields() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    
    // Clean up quotations collection
    console.log('Cleaning up quotations collection...');
    const quotationsResult = await db.collection('quotations').updateMany(
      {},
      {
        $unset: {
          roomPackages: "",
          roomTotal: "",
          roomQuotationItems: "",
          roomQuotationTotal: ""
        }
      }
    );
    console.log(`Updated ${quotationsResult.modifiedCount} quotations`);
    
    // Clean up any other collections that might have room-related fields
    console.log('Cleaning up any other collections...');
    
    // Check if there are any other collections with room fields
    const collections = await db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));
    
    console.log('Room fields cleanup completed successfully!');
    
  } catch (error) {
    console.error('Error cleaning up room fields:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

// Run the cleanup
cleanupRoomFields().catch(console.error);
