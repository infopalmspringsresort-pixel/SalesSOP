import { MongoClient } from 'mongodb';

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'sales_sop_generator';

// Sample enquiry data
const sampleEnquiries = [
  {
    enquiryNumber: 'ENQ-001',
    clientName: 'John Smith',
    email: 'john.smith@email.com',
    contactNumber: '+1-555-0101',
    city: 'New York',
    state: 'NY',
    enquiryDate: new Date('2024-12-15'),
    status: 'new',
    source: 'walk_in',
    eventType: 'wedding',
    eventDate: new Date('2025-06-15'),
    guestCount: 150,
    budget: 25000,
    notes: 'Looking for outdoor wedding venue',
    createdAt: new Date('2024-12-15'),
    updatedAt: new Date('2024-12-15')
  },
  {
    enquiryNumber: 'ENQ-002',
    clientName: 'Sarah Johnson',
    email: 'sarah.j@company.com',
    contactNumber: '+1-555-0102',
    city: 'Los Angeles',
    state: 'CA',
    enquiryDate: new Date('2024-12-20'),
    status: 'quotation_sent',
    source: 'phone_call',
    eventType: 'corporate',
    eventDate: new Date('2025-03-20'),
    guestCount: 200,
    budget: 50000,
    notes: 'Corporate annual meeting',
    createdAt: new Date('2024-12-20'),
    updatedAt: new Date('2024-12-22')
  },
  {
    enquiryNumber: 'ENQ-003',
    clientName: 'Michael Brown',
    email: 'mike.brown@gmail.com',
    contactNumber: '+1-555-0103',
    city: 'Chicago',
    state: 'IL',
    enquiryDate: new Date('2024-12-25'),
    status: 'converted',
    source: 'online_form',
    eventType: 'birthday',
    eventDate: new Date('2025-04-10'),
    guestCount: 75,
    budget: 15000,
    notes: '50th birthday celebration',
    createdAt: new Date('2024-12-25'),
    updatedAt: new Date('2024-12-28')
  },
  {
    enquiryNumber: 'ENQ-004',
    clientName: 'Emily Davis',
    email: 'emily.davis@yahoo.com',
    contactNumber: '+1-555-0104',
    city: 'Miami',
    state: 'FL',
    enquiryDate: new Date('2024-12-28'),
    status: 'booked',
    source: 'email',
    eventType: 'anniversary',
    eventDate: new Date('2025-05-20'),
    guestCount: 100,
    budget: 30000,
    notes: '25th wedding anniversary',
    createdAt: new Date('2024-12-28'),
    updatedAt: new Date('2024-12-30')
  },
  {
    enquiryNumber: 'ENQ-005',
    clientName: 'Robert Wilson',
    email: 'robert.wilson@business.com',
    contactNumber: '+1-555-0105',
    city: 'Seattle',
    state: 'WA',
    enquiryDate: new Date('2024-12-30'),
    status: 'lost',
    source: 'referral',
    eventType: 'conference',
    eventDate: new Date('2025-07-15'),
    guestCount: 300,
    budget: 75000,
    notes: 'Tech conference - went with competitor',
    createdAt: new Date('2024-12-30'),
    updatedAt: new Date('2025-01-05')
  },
  {
    enquiryNumber: 'ENQ-006',
    clientName: 'Lisa Anderson',
    email: 'lisa.anderson@email.com',
    contactNumber: '+1-555-0106',
    city: 'Boston',
    state: 'MA',
    enquiryDate: new Date('2025-01-02'),
    status: 'new',
    source: 'social_media',
    eventType: 'wedding',
    eventDate: new Date('2025-08-15'),
    guestCount: 120,
    budget: 35000,
    notes: 'Summer wedding, outdoor preferred',
    createdAt: new Date('2025-01-02'),
    updatedAt: new Date('2025-01-02')
  },
  {
    enquiryNumber: 'ENQ-007',
    clientName: 'David Martinez',
    email: 'david.martinez@company.com',
    contactNumber: '+1-555-0107',
    city: 'Phoenix',
    state: 'AZ',
    enquiryDate: new Date('2025-01-05'),
    status: 'quotation_sent',
    source: 'walk_in',
    eventType: 'corporate',
    eventDate: new Date('2025-02-20'),
    guestCount: 150,
    budget: 40000,
    notes: 'Product launch event',
    createdAt: new Date('2025-01-05'),
    updatedAt: new Date('2025-01-07')
  },
  {
    enquiryNumber: 'ENQ-008',
    clientName: 'Jennifer Taylor',
    email: 'jennifer.taylor@gmail.com',
    contactNumber: '+1-555-0108',
    city: 'Denver',
    state: 'CO',
    enquiryDate: new Date('2025-01-08'),
    status: 'converted',
    source: 'phone_call',
    eventType: 'birthday',
    eventDate: new Date('2025-03-25'),
    guestCount: 60,
    budget: 12000,
    notes: 'Sweet 16 birthday party',
    createdAt: new Date('2025-01-08'),
    updatedAt: new Date('2025-01-10')
  },
  {
    enquiryNumber: 'ENQ-009',
    clientName: 'Christopher Lee',
    email: 'chris.lee@business.com',
    contactNumber: '+1-555-0109',
    city: 'Atlanta',
    state: 'GA',
    enquiryDate: new Date('2025-01-10'),
    status: 'booked',
    source: 'online_form',
    eventType: 'anniversary',
    eventDate: new Date('2025-09-10'),
    guestCount: 80,
    budget: 20000,
    notes: '30th wedding anniversary',
    createdAt: new Date('2025-01-10'),
    updatedAt: new Date('2025-01-12')
  },
  {
    enquiryNumber: 'ENQ-010',
    clientName: 'Amanda White',
    email: 'amanda.white@email.com',
    contactNumber: '+1-555-0110',
    city: 'Portland',
    state: 'OR',
    enquiryDate: new Date('2025-01-12'),
    status: 'new',
    source: 'email',
    eventType: 'wedding',
    eventDate: new Date('2025-10-15'),
    guestCount: 200,
    budget: 45000,
    notes: 'Fall wedding, indoor venue preferred',
    createdAt: new Date('2025-01-12'),
    updatedAt: new Date('2025-01-12')
  },
  {
    enquiryNumber: 'ENQ-011',
    clientName: 'James Thompson',
    email: 'james.thompson@company.com',
    contactNumber: '+1-555-0111',
    city: 'Las Vegas',
    state: 'NV',
    enquiryDate: new Date('2025-01-15'),
    status: 'quotation_sent',
    source: 'referral',
    eventType: 'conference',
    eventDate: new Date('2025-04-30'),
    guestCount: 250,
    budget: 60000,
    notes: 'Sales conference with networking',
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-17')
  },
  {
    enquiryNumber: 'ENQ-012',
    clientName: 'Michelle Garcia',
    email: 'michelle.garcia@yahoo.com',
    contactNumber: '+1-555-0112',
    city: 'San Diego',
    state: 'CA',
    enquiryDate: new Date('2025-01-18'),
    status: 'converted',
    source: 'social_media',
    eventType: 'birthday',
    eventDate: new Date('2025-05-05'),
    guestCount: 90,
    budget: 18000,
    notes: 'Milestone birthday celebration',
    createdAt: new Date('2025-01-18'),
    updatedAt: new Date('2025-01-20')
  },
  {
    enquiryNumber: 'ENQ-013',
    clientName: 'Kevin Rodriguez',
    email: 'kevin.rodriguez@business.com',
    contactNumber: '+1-555-0113',
    city: 'Austin',
    state: 'TX',
    enquiryDate: new Date('2025-01-20'),
    status: 'booked',
    source: 'walk_in',
    eventType: 'anniversary',
    eventDate: new Date('2025-11-20'),
    guestCount: 110,
    budget: 25000,
    notes: '40th wedding anniversary',
    createdAt: new Date('2025-01-20'),
    updatedAt: new Date('2025-01-22')
  },
  {
    enquiryNumber: 'ENQ-014',
    clientName: 'Rachel Kim',
    email: 'rachel.kim@gmail.com',
    contactNumber: '+1-555-0114',
    city: 'Nashville',
    state: 'TN',
    enquiryDate: new Date('2025-01-22'),
    status: 'lost',
    source: 'phone_call',
    eventType: 'wedding',
    eventDate: new Date('2025-12-15'),
    guestCount: 180,
    budget: 40000,
    notes: 'Holiday wedding - chose different venue',
    createdAt: new Date('2025-01-22'),
    updatedAt: new Date('2025-01-25')
  },
  {
    enquiryNumber: 'ENQ-015',
    clientName: 'Thomas Clark',
    email: 'thomas.clark@company.com',
    contactNumber: '+1-555-0115',
    city: 'Orlando',
    state: 'FL',
    enquiryDate: new Date('2025-01-25'),
    status: 'new',
    source: 'online_form',
    eventType: 'corporate',
    eventDate: new Date('2025-06-30'),
    guestCount: 180,
    budget: 35000,
    notes: 'Company retreat and team building',
    createdAt: new Date('2025-01-25'),
    updatedAt: new Date('2025-01-25')
  }
];

async function seedEnquiryData() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('🔌 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    const enquiriesCollection = db.collection('enquiries');
    
    // Check if enquiries already exist
    const existingCount = await enquiriesCollection.countDocuments();
    console.log(`📊 Existing enquiries: ${existingCount}`);
    
    if (existingCount > 0) {
      console.log('⚠️  Enquiries already exist. Do you want to add more? (This will add to existing data)');
    }
    
    // Insert sample enquiries
    console.log('📝 Inserting sample enquiry data...');
    const result = await enquiriesCollection.insertMany(sampleEnquiries);
    console.log(`✅ Successfully inserted ${result.insertedCount} enquiries`);
    
    // Verify the data
    const totalCount = await enquiriesCollection.countDocuments();
    console.log(`📊 Total enquiries in database: ${totalCount}`);
    
    // Show sample data
    const sampleData = await enquiriesCollection.find().limit(3).toArray();
    console.log('📋 Sample enquiry data:');
    sampleData.forEach((enquiry, index) => {
      console.log(`${index + 1}. ${enquiry.clientName} - ${enquiry.email} - ${enquiry.city}`);
    });
    
    console.log('🎉 Enquiry data seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding enquiry data:', error);
  } finally {
    await client.close();
    console.log('🔌 MongoDB connection closed');
  }
}

// Run the seeding function
seedEnquiryData();
