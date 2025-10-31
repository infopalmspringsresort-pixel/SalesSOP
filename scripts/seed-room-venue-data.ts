import { MongoClient, ObjectId } from 'mongodb';
import type { InsertRoomType, InsertVenue } from '@shared/schema-mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://bacancyinfo:1234567890@salesopcluster.dzobu.mongodb.net/?retryWrites=true&w=majority&appName=SalesOpCluster';
const DB_NAME = process.env.MONGODB_DB_NAME || 'sales_sop';

async function seedRoomVenueData() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    
    // Clear existing room and venue data
    console.log('🗑️ Clearing existing room and venue data...');
    await db.collection('room_types').deleteMany({});
    await db.collection('venues').deleteMany({});
    
    // Create room types based on your requirements and reference images
    const roomTypes: InsertRoomType[] = [
      {
        name: 'Standard Room',
        category: 'Standard',
        baseRate: 6000,
        extraPersonRate: 1500,
        currency: 'INR',
        maxOccupancy: 3,
        defaultOccupancy: 2,
        amenities: ['AC', 'WiFi', 'TV', 'Safe', 'Hair Dryer'],
        description: 'Comfortable standard accommodation with essential amenities',
        includesBreakfast: true,
        checkInTime: '14:00',
        checkOutTime: '11:00',
        isActive: true,
      },
      {
        name: 'Deluxe Room',
        category: 'Deluxe',
        baseRate: 7499,
        extraPersonRate: 1800,
        currency: 'INR',
        maxOccupancy: 3,
        defaultOccupancy: 2,
        amenities: ['AC', 'WiFi', 'TV', 'Mini Bar', 'Safe', 'Hair Dryer', 'Iron', 'Coffee Maker'],
        description: 'Spacious deluxe room with enhanced amenities and comfort',
        includesBreakfast: true,
        checkInTime: '14:00',
        checkOutTime: '11:00',
        isActive: true,
      },
      {
        name: 'Executive Room',
        category: 'Executive',
        baseRate: 7499,
        extraPersonRate: 1800,
        currency: 'INR',
        maxOccupancy: 3,
        defaultOccupancy: 2,
        amenities: ['AC', 'WiFi', 'TV', 'Mini Bar', 'Safe', 'Hair Dryer', 'Iron', 'Coffee Maker', 'Balcony'],
        description: 'Premium executive room with business amenities',
        includesBreakfast: true,
        checkInTime: '14:00',
        checkOutTime: '11:00',
        isActive: true,
      },
      {
        name: 'Junior Suite',
        category: 'Junior Suite',
        baseRate: 15000,
        extraPersonRate: 1800,
        currency: 'INR',
        maxOccupancy: 3,
        defaultOccupancy: 2,
        amenities: ['AC', 'WiFi', 'TV', 'Mini Bar', 'Safe', 'Hair Dryer', 'Iron', 'Coffee Maker', 'Balcony', 'Pool View'],
        description: 'Luxurious junior suite with separate living area',
        includesBreakfast: true,
        checkInTime: '14:00',
        checkOutTime: '11:00',
        isActive: true,
      },
      {
        name: 'Executive Suite',
        category: 'Executive Suite',
        baseRate: 12000,
        extraPersonRate: 1800,
        currency: 'INR',
        maxOccupancy: 3,
        defaultOccupancy: 2,
        amenities: ['AC', 'WiFi', 'TV', 'Mini Bar', 'Safe', 'Hair Dryer', 'Iron', 'Coffee Maker', 'Balcony', 'Garden View', 'Room Service'],
        description: 'Premium executive suite with separate bedroom and living area',
        includesBreakfast: true,
        checkInTime: '14:00',
        checkOutTime: '11:00',
        isActive: true,
      }
    ];
    
    console.log('🏨 Creating room types...');
    const roomTypeResults = await db.collection('room_types').insertMany(roomTypes);
    const roomTypeIds = Object.values(roomTypeResults.insertedIds);
    
    // Create venues based on your PDF data and reference images
    const venues: InsertVenue[] = [
      {
        name: 'Oasis The Lawns',
        area: 29000,
        minGuests: 1000,
        maxGuests: 2000,
        hiringCharges: 500000,
        sessionDuration: 5,
        currency: 'INR',
        amenities: ['AC', 'Sound System', 'Projector', 'Stage', 'Dance Floor', 'Lighting', 'WiFi', 'Parking', 'Garden View', 'Outdoor Space', 'Catering Kitchen', 'Power Backup'],
        description: 'Spacious outdoor lawn venue perfect for large events',
        isActive: true,
      },
      {
        name: 'Areca The Banquet',
        area: 12300,
        minGuests: 600,
        maxGuests: 800,
        hiringCharges: 250000,
        sessionDuration: 5,
        currency: 'INR',
        amenities: ['AC', 'Sound System', 'Projector', 'Stage', 'Dance Floor', 'Lighting', 'WiFi', 'Parking', 'Indoor Space', 'Catering Kitchen', 'Bridal Room', 'Groom Room', 'Power Backup'],
        description: 'Elegant indoor banquet hall with modern amenities',
        isActive: true,
      },
      {
        name: 'Pool Side Lawns',
        area: 6000,
        minGuests: 250,
        maxGuests: 400,
        hiringCharges: 100000,
        sessionDuration: 5,
        currency: 'INR',
        amenities: ['Sound System', 'Lighting', 'WiFi', 'Parking', 'Pool View', 'Outdoor Space', 'Garden View'],
        description: 'Intimate pool-side venue with scenic views',
        isActive: true,
      }
    ];
    
    console.log('🏛️ Creating venues...');
    const venueResults = await db.collection('venues').insertMany(venues);
    const venueIds = Object.values(venueResults.insertedIds);
    
    
    console.log('✅ Room and venue data seeded successfully!');
    console.log(`🏨 Created ${roomTypeResults.insertedCount} room types`);
    console.log(`🏛️ Created ${venueResults.insertedCount} venues`);
    
    // Display summary
    console.log('\n📋 Room Types Created:');
    roomTypes.forEach((room, index) => {
      console.log(`  ${index + 1}. ${room.name} - ₹${room.baseRate} (Extra: ₹${room.extraPersonRate})`);
    });
    
    console.log('\n🏛️ Venues Created:');
    venues.forEach((venue, index) => {
      console.log(`  ${index + 1}. ${venue.name} - ${venue.area.toLocaleString()} sq ft (₹${venue.hiringCharges.toLocaleString()})`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding room and venue data:', error);
  } finally {
    await client.close();
  }
}

// Run the seeding function
seedRoomVenueData().catch(console.error);
