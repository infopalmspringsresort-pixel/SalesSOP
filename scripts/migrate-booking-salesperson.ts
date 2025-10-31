import { MongoClient } from 'mongodb';

async function migrateBookingSalesperson() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    const db = client.db('sales_sop_generator');
    
    console.log('Starting migration: Adding salespersonId to existing bookings...');
    
    // Get all bookings that don't have salespersonId
    const bookings = await db.collection('bookings').find({ 
      salespersonId: { $exists: false } 
    }).toArray();
    
    console.log(`Found ${bookings.length} bookings without salespersonId`);
    
    let updated = 0;
    
    for (const booking of bookings) {
      if (booking.enquiryId) {
        // Get the enquiry to find the salespersonId
        const enquiry = await db.collection('enquiries').findOne({ 
          _id: booking.enquiryId 
        });
        
        if (enquiry && enquiry.salespersonId) {
          // Update the booking with the salespersonId from the enquiry
          await db.collection('bookings').updateOne(
            { _id: booking._id },
            { $set: { salespersonId: enquiry.salespersonId } }
          );
          
          console.log(`Updated booking ${booking.bookingNumber} with salespersonId: ${enquiry.salespersonId}`);
          updated++;
        } else {
          console.log(`No salespersonId found for enquiry ${booking.enquiryId} (booking ${booking.bookingNumber})`);
        }
      } else {
        console.log(`Booking ${booking.bookingNumber} has no enquiryId, skipping`);
      }
    }
    
    console.log(`Migration completed. Updated ${updated} bookings.`);
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.close();
  }
}

migrateBookingSalesperson();

