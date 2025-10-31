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

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function generateRandomTime() {
  const hour = Math.floor(Math.random() * (22 - 9 + 1)) + 9; // 9 AM to 10 PM
  const minute = Math.random() < 0.5 ? '00' : '30';
  const start = `${String(hour).padStart(2, '0')}:${minute}`;
  const endHour = hour + Math.floor(Math.random() * 3) + 1; // 1 to 3 hours duration
  const end = `${String(Math.min(endHour, 23)).padStart(2, '0')}:${minute}`; // Max 11 PM
  return { startTime: start, endTime: end };
}

function generateBookingNumber(year, index) {
  return `BOOK-${year}-${String(index).padStart(3, '0')}`;
}

async function seedOctoberBookings() {
  let client;
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection('bookings');

    console.log('Clearing existing bookings...');
    await collection.deleteMany({});
    console.log('Existing bookings cleared.');

    const bookings = [];
    const october2025 = new Date(2025, 9, 1); // October 2025 (month is 0-indexed)
    
    // Generate 15 bookings for October 2025, avoiding conflicts
    const usedDates = new Set();
    const usedVenueTimes = new Map(); // venue -> Set of time slots
    
    for (let i = 1; i <= 15; i++) {
      let attempts = 0;
      let booking;
      
      do {
        // Pick a random date in October 2025
        const dayInOctober = Math.floor(Math.random() * 31) + 1; // 1-31
        const eventDate = new Date(2025, 9, dayInOctober); // October 2025
        
        // Pick a random venue
        const venue = getRandomItem(VENUES);
        const { startTime, endTime } = generateRandomTime();
        
        // Check for conflicts
        const dateKey = eventDate.toISOString().split('T')[0];
        const venueTimeKey = `${venue}-${dateKey}-${startTime}-${endTime}`;
        
        if (!usedVenueTimes.has(venue)) {
          usedVenueTimes.set(venue, new Set());
        }
        
        const venueTimes = usedVenueTimes.get(venue);
        
        // Check if this time slot conflicts with existing bookings for this venue
        let hasConflict = false;
        for (const existingTime of venueTimes) {
          const [existingDate, existingStart, existingEnd] = existingTime.split('-');
          if (existingDate === dateKey) {
            // Check time overlap
            if (startTime < existingEnd && endTime > existingStart) {
              hasConflict = true;
              break;
            }
          }
        }
        
        if (!hasConflict) {
          // Add this time slot to used times
          venueTimes.add(`${dateKey}-${startTime}-${endTime}`);
          
          // Generate sessions for this booking
          const numSessions = Math.floor(Math.random() * 3) + 1; // 1-3 sessions
          const sessions = [];
          
          for (let j = 0; j < numSessions; j++) {
            const sessionDate = addDays(eventDate, j); // Sessions can be on consecutive days
            const { startTime: sessionStart, endTime: sessionEnd } = generateRandomTime();
            
            sessions.push({
              _id: new ObjectId(),
              sessionName: getRandomItem(SESSION_NAMES),
              sessionLabel: j === 0 ? 'Main Event' : `Day ${j + 1}`,
              venue: venue,
              startTime: sessionStart,
              endTime: sessionEnd,
              sessionDate: sessionDate,
              paxCount: Math.floor(Math.random() * 100) + 50,
              specialInstructions: j === 0 ? 'Main event with special requirements' : `Day ${j + 1} session`
            });
          }
          
          booking = {
            _id: new ObjectId(),
            bookingNumber: generateBookingNumber(2025, i),
            enquiryId: new ObjectId(),
            quotationId: new ObjectId(),
            clientName: `Client ${i} - ${getRandomItem(['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'])}`,
            contactNumber: `+91 ${Math.floor(Math.random() * 9000000000) + 1000000000}`,
            email: `client${i}@example.com`,
            eventType: getRandomItem(EVENT_TYPES),
            eventDate: eventDate,
            eventEndDate: addDays(eventDate, numSessions - 1),
            eventDuration: numSessions,
            eventDates: Array.from({ length: numSessions }, (_, idx) => addDays(eventDate, idx)),
            eventStartTime: sessions[0].startTime,
            eventEndTime: sessions[sessions.length - 1].endTime,
            confirmedPax: Math.floor(Math.random() * 200) + 50,
            hall: venue,
            totalAmount: Math.floor(Math.random() * 100000) + 50000,
            advanceAmount: Math.floor(Math.random() * 50000) + 25000,
            balanceAmount: 0, // Will be calculated
            status: getRandomItem(STATUSES),
            statusChanged: false,
            cancellationReason: null,
            cancellationReasonNotes: null,
            contractSigned: Math.random() < 0.7, // 70% chance
            contractSignedAt: Math.random() < 0.7 ? new Date() : null,
            sessions: sessions,
            amendments: [],
            statusHistory: [],
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          // Calculate balance amount
          booking.balanceAmount = booking.totalAmount - booking.advanceAmount;
          
          break; // Successfully created booking
        }
        
        attempts++;
      } while (attempts < 50); // Max 50 attempts to avoid infinite loop
      
      if (booking) {
        bookings.push(booking);
        console.log(`Created booking ${i}: ${booking.clientName} - ${booking.venue} on ${booking.eventDate.toISOString().split('T')[0]}`);
      } else {
        console.log(`Failed to create booking ${i} after 50 attempts (too many conflicts)`);
      }
    }

    console.log(`Inserting ${bookings.length} sample bookings for October 2025...`);
    await collection.insertMany(bookings);
    console.log('Sample bookings seeded successfully!');

    const count = await collection.countDocuments();
    console.log(`Total bookings in DB: ${count}`);

    // Show summary
    console.log('\n=== BOOKING SUMMARY ===');
    const venueCounts = {};
    const statusCounts = {};
    
    bookings.forEach(booking => {
      // Count by venue
      const venue = booking.hall;
      venueCounts[venue] = (venueCounts[venue] || 0) + 1;
      
      // Count by status
      const status = booking.status;
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    console.log('Bookings by venue:');
    Object.entries(venueCounts).forEach(([venue, count]) => {
      console.log(`  ${venue}: ${count}`);
    });
    
    console.log('\nBookings by status:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

  } catch (error) {
    console.error('Error seeding bookings:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

seedOctoberBookings();
