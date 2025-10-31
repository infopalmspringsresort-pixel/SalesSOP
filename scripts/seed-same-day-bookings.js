import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sales-sop-generator';
const DB_NAME = process.env.MONGODB_DB_NAME || 'sales-sop-generator';

// Venue options
const VENUES = [
  'Areca I - The Banquet Hall',
  'Areca II',
  'Oasis - The Lawn',
  'Pool-side Lawn',
  '3rd floor Lounge',
  'Board Room',
  'Amber Restaurant',
  'Sway Lounge Bar'
];

const EVENT_TYPES = ['wedding', 'corporate', 'birthday', 'conference', 'anniversary', 'product_launch', 'charity_gala', 'family_reunion'];
const STATUSES = ['confirmed', 'tentative', 'booked'];
const SESSION_NAMES = ['Breakfast', 'Lunch', 'Hi-Tea', 'Dinner', 'Cocktail', 'Conference Morning', 'Conference Afternoon', 'Reception'];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateBookingNumber(year, index) {
  return `BOOK-${year}-${String(index).padStart(3, '0')}`;
}

function generateTimeSlot(index) {
  // Generate different time slots to avoid conflicts
  const timeSlots = [
    { start: '09:00', end: '11:00' },  // Morning
    { start: '12:00', end: '14:00' },  // Lunch
    { start: '15:00', end: '17:00' },  // Afternoon
    { start: '18:00', end: '20:00' },  // Evening
    { start: '20:30', end: '23:00' }   // Night
  ];
  
  return timeSlots[index % timeSlots.length];
}

async function seedSameDayBookings() {
  let client;
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection('bookings');

    console.log('Adding 5 bookings for same client on same day...');

    // Pick a specific date in October 2025
    const eventDate = new Date(2025, 9, 15); // October 15, 2025
    const clientName = 'Mr. Rajesh Kumar - Multi-Venue Event';
    
    const bookings = [];
    
    // Create 5 bookings for the same client on the same day
    for (let i = 1; i <= 5; i++) {
      const venue = VENUES[i - 1]; // Use different venue for each booking
      const timeSlot = generateTimeSlot(i - 1);
      
      // Generate sessions for this booking
      const sessions = [{
        _id: new ObjectId(),
        sessionName: getRandomItem(SESSION_NAMES),
        sessionLabel: `Session ${i}`,
        venue: venue,
        startTime: timeSlot.start,
        endTime: timeSlot.end,
        sessionDate: eventDate,
        paxCount: Math.floor(Math.random() * 50) + 20, // 20-70 pax
        specialInstructions: `Special requirements for ${venue} session`
      }];
      
      const booking = {
        _id: new ObjectId(),
        bookingNumber: generateBookingNumber(2025, 100 + i), // Start from BOOK-2025-101
        enquiryId: new ObjectId(),
        quotationId: new ObjectId(),
        clientName: clientName,
        contactNumber: '+91 9876543210',
        email: 'rajesh.kumar@example.com',
        eventType: getRandomItem(EVENT_TYPES),
        eventDate: eventDate,
        eventEndDate: eventDate,
        eventDuration: 1,
        eventDates: [eventDate],
        eventStartTime: timeSlot.start,
        eventEndTime: timeSlot.end,
        confirmedPax: sessions[0].paxCount,
        hall: venue,
        totalAmount: Math.floor(Math.random() * 50000) + 30000, // 30k-80k
        advanceAmount: Math.floor(Math.random() * 20000) + 15000, // 15k-35k
        balanceAmount: 0, // Will be calculated
        status: getRandomItem(STATUSES),
        statusChanged: false,
        cancellationReason: null,
        cancellationReasonNotes: null,
        contractSigned: Math.random() < 0.8, // 80% chance
        contractSignedAt: Math.random() < 0.8 ? new Date() : null,
        sessions: sessions,
        amendments: [],
        statusHistory: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Calculate balance amount
      booking.balanceAmount = booking.totalAmount - booking.advanceAmount;
      
      bookings.push(booking);
      
      console.log(`Created booking ${i}: ${clientName} - ${venue} on ${eventDate.toISOString().split('T')[0]} (${timeSlot.start}-${timeSlot.end})`);
    }

    console.log(`Inserting ${bookings.length} same-day bookings...`);
    await collection.insertMany(bookings);
    console.log('Same-day bookings seeded successfully!');

    const count = await collection.countDocuments();
    console.log(`Total bookings in DB: ${count}`);

    // Show summary
    console.log('\n=== SAME-DAY BOOKING SUMMARY ===');
    console.log(`Client: ${clientName}`);
    console.log(`Date: ${eventDate.toISOString().split('T')[0]}`);
    console.log('\nBookings:');
    
    bookings.forEach((booking, index) => {
      console.log(`  ${index + 1}. ${booking.venue} - ${booking.eventStartTime} to ${booking.eventEndTime} (${booking.status}) - ₹${booking.totalAmount.toLocaleString()}`);
    });

  } catch (error) {
    console.error('Error seeding same-day bookings:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

seedSameDayBookings();
