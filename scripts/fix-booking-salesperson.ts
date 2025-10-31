// Fix script to update bookings with valid salesperson IDs
import { MongoClient, ObjectId } from 'mongodb';

async function fixBookingSalesperson() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB_NAME || 'sales_sop_generator';
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db(dbName);
    
    console.log('Fixing booking salesperson references...');
    
    // Get all users to see available salesperson IDs
    const users = await db.collection('users').find({}).toArray();
    console.log('Available users:', users.map(u => ({ id: u._id.toString(), name: `${u.firstName} ${u.lastName}`, role: u.role })));
    
    // Find a salesperson user
    const salesperson = users.find(u => u.role === 'salesperson' || u.role?.name === 'salesperson');
    if (!salesperson) {
      console.log('No salesperson found, using first user');
      const firstUser = users[0];
      if (firstUser) {
        console.log(`Using user: ${firstUser.firstName} ${firstUser.lastName} (${firstUser._id})`);
        
        // Update all bookings with invalid salespersonId
        const result = await db.collection('bookings').updateMany(
          { salespersonId: { $exists: true } },
          { $set: { salespersonId: firstUser._id } }
        );
        
        console.log(`Updated ${result.modifiedCount} bookings with valid salespersonId`);
      }
    } else {
      console.log(`Using salesperson: ${salesperson.firstName} ${salesperson.lastName} (${salesperson._id})`);
      
      // Update all bookings with invalid salespersonId
      const result = await db.collection('bookings').updateMany(
        { salespersonId: { $exists: true } },
        { $set: { salespersonId: salesperson._id } }
      );
      
      console.log(`Updated ${result.modifiedCount} bookings with valid salespersonId`);
    }
    
    // Test the fix by getting a booking
    const booking = await db.collection('bookings').findOne({});
    if (booking) {
      console.log(`\nTesting booking: ${booking.bookingNumber}`);
      console.log(`SalespersonId: ${booking.salespersonId}`);
      
      const salesperson = await db.collection('users').findOne({ _id: booking.salespersonId });
      if (salesperson) {
        console.log(`✅ Salesperson found: ${salesperson.firstName} ${salesperson.lastName}`);
      } else {
        console.log('❌ Salesperson still not found');
      }
    }
    
  } catch (error) {
    console.error('Fix failed:', error);
  } finally {
    await client.close();
  }
}

fixBookingSalesperson();





