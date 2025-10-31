import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sales-sop-generator';
const DB_NAME = process.env.MONGODB_DB_NAME || 'sales-sop-generator';

const EVENT_TYPES = ['wedding', 'corporate', 'birthday', 'conference', 'anniversary', 'product_launch', 'charity_gala', 'family_reunion'];
const ENQUIRY_STATUSES = ['new', 'quotation_sent', 'follow_up_required', 'ongoing', 'converted', 'booked', 'closed', 'lost'];
const SOURCES = ['walk_in', 'phone_call', 'online_form', 'email', 'referral', 'social_media'];
const LOST_REASONS = ['price_too_high', 'found_competitor', 'date_not_available', 'no_response', 'budget_cut', 'other'];
const SALESPERSON_NAMES = ['John Smith', 'Sarah Johnson', 'Mike Davis', 'Lisa Wilson', 'David Brown'];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function seedReportsData() {
  let client;
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);

    console.log('Seeding reports data...');

    // 1. Create sample enquiries
    const enquiriesCollection = db.collection('enquiries');
    console.log('Creating sample enquiries...');
    
    const enquiries = [];
    const startDate = new Date(2025, 8, 1); // September 2025
    const endDate = new Date(2025, 9, 30); // October 2025
    
    for (let i = 1; i <= 50; i++) {
      const enquiryDate = getRandomDate(startDate, endDate);
      const status = getRandomItem(ENQUIRY_STATUSES);
      
      enquiries.push({
        _id: new ObjectId(),
        enquiryNumber: `ENQ-2025-${String(i).padStart(3, '0')}`,
        clientName: `Client ${i} - ${getRandomItem(['Smith', 'Johnson', 'Williams', 'Brown', 'Jones'])}`,
        contactNumber: `+91 ${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        email: `client${i}@example.com`,
        eventType: getRandomItem(EVENT_TYPES),
        eventDate: getRandomDate(new Date(2025, 10, 1), new Date(2025, 11, 31)), // Nov-Dec 2025
        expectedPax: Math.floor(Math.random() * 200) + 50,
        source: getRandomItem(SOURCES),
        status: status,
        lostReason: status === 'lost' ? getRandomItem(LOST_REASONS) : null,
        salespersonId: new ObjectId(), // Will be assigned to a user
        createdAt: enquiryDate,
        updatedAt: enquiryDate
      });
    }
    
    await enquiriesCollection.insertMany(enquiries);
    console.log(`Created ${enquiries.length} enquiries`);

    // 2. Create sample follow-up history
    const followUpCollection = db.collection('follow_up_history');
    console.log('Creating sample follow-up history...');
    
    const followUps = [];
    for (let i = 0; i < 30; i++) {
      const enquiry = enquiries[Math.floor(Math.random() * enquiries.length)];
      const followUpDate = getRandomDate(startDate, endDate);
      const isCompleted = Math.random() < 0.7; // 70% completion rate
      const isOverdue = Math.random() < 0.2; // 20% overdue rate
      
      followUps.push({
        _id: new ObjectId(),
        enquiryId: enquiry._id,
        followUpDate: followUpDate,
        followUpTime: `${Math.floor(Math.random() * 12) + 9}:00`, // 9 AM to 8 PM
        notes: `Follow-up for ${enquiry.clientName}`,
        completed: isCompleted,
        completedAt: isCompleted ? new Date(followUpDate.getTime() + Math.random() * 86400000) : null,
        isOverdue: isOverdue,
        setById: new ObjectId(), // Salesperson
        createdAt: followUpDate,
        updatedAt: followUpDate
      });
    }
    
    await followUpCollection.insertMany(followUps);
    console.log(`Created ${followUps.length} follow-ups`);

    // 3. Create sample audit logs
    const auditCollection = db.collection('system_audit_log');
    console.log('Creating sample audit logs...');
    
    const auditLogs = [];
    for (let i = 0; i < 100; i++) {
      const logDate = getRandomDate(startDate, endDate);
      const actions = ['login', 'logout', 'created', 'updated', 'deleted', 'viewed', 'access_denied'];
      const modules = ['auth', 'enquiries', 'bookings', 'reports', 'users'];
      const users = ['admin', 'manager', 'salesperson'];
      
      auditLogs.push({
        _id: new ObjectId(),
        userId: `user-${Math.floor(Math.random() * 5) + 1}`,
        userRole: getRandomItem(users),
        action: getRandomItem(actions),
        module: getRandomItem(modules),
        resourceType: 'enquiry',
        resourceId: enquiries[Math.floor(Math.random() * enquiries.length)]._id,
        details: {
          success: Math.random() < 0.9, // 90% success rate
          timestamp: logDate.toISOString(),
          path: `/api/${getRandomItem(modules)}`,
          method: getRandomItem(['GET', 'POST', 'PUT', 'DELETE'])
        },
        ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        createdAt: logDate
      });
    }
    
    await auditCollection.insertMany(auditLogs);
    console.log(`Created ${auditLogs.length} audit logs`);

    // 4. Create sample users for team performance
    const usersCollection = db.collection('users');
    console.log('Creating sample users...');
    
    const users = [];
    for (let i = 0; i < 5; i++) {
      users.push({
        _id: new ObjectId(),
        firstName: SALESPERSON_NAMES[i].split(' ')[0],
        lastName: SALESPERSON_NAMES[i].split(' ')[1],
        email: `salesperson${i + 1}@example.com`,
        role: 'salesperson',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    await usersCollection.insertMany(users);
    console.log(`Created ${users.length} users`);

    // 5. Update enquiries with salesperson assignments
    console.log('Assigning salespersons to enquiries...');
    for (let i = 0; i < enquiries.length; i++) {
      const randomUser = users[Math.floor(Math.random() * users.length)];
      await enquiriesCollection.updateOne(
        { _id: enquiries[i]._id },
        { $set: { salespersonId: randomUser._id } }
      );
    }

    // 6. Update follow-ups with salesperson assignments
    console.log('Assigning salespersons to follow-ups...');
    for (let i = 0; i < followUps.length; i++) {
      const randomUser = users[Math.floor(Math.random() * users.length)];
      await followUpCollection.updateOne(
        { _id: followUps[i]._id },
        { $set: { setById: randomUser._id } }
      );
    }

    console.log('\n=== REPORTS DATA SUMMARY ===');
    console.log(`✅ Enquiries: ${enquiries.length}`);
    console.log(`✅ Follow-ups: ${followUps.length}`);
    console.log(`✅ Audit logs: ${auditLogs.length}`);
    console.log(`✅ Users: ${users.length}`);
    console.log(`✅ Bookings: ${(await db.collection('bookings').countDocuments())} (existing)`);
    
    console.log('\n=== STATUS BREAKDOWN ===');
    const statusCounts = {};
    enquiries.forEach(enquiry => {
      statusCounts[enquiry.status] = (statusCounts[enquiry.status] || 0) + 1;
    });
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    console.log('\n=== SOURCE BREAKDOWN ===');
    const sourceCounts = {};
    enquiries.forEach(enquiry => {
      sourceCounts[enquiry.source] = (sourceCounts[enquiry.source] || 0) + 1;
    });
    Object.entries(sourceCounts).forEach(([source, count]) => {
      console.log(`  ${source}: ${count}`);
    });

    console.log('\n🎉 Reports data seeded successfully!');
    console.log('You can now view the Reports section with real data.');

  } catch (error) {
    console.error('Error seeding reports data:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

seedReportsData();
