import { MongoClient, ObjectId } from 'mongodb';
import type { InsertMenuPackage, InsertMenuItem, InsertAdditionalItem } from '@shared/schema-mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://bacancyinfo:1234567890@salesopcluster.dzobu.mongodb.net/?retryWrites=true&w=majority&appName=SalesOpCluster';
const DB_NAME = process.env.MONGODB_DB_NAME || 'sales_sop';

async function seedMenuData() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    
    // Clear existing menu data
    console.log('🗑️ Clearing existing menu data...');
    await db.collection('menu_packages').deleteMany({});
    await db.collection('menu_items').deleteMany({});
    await db.collection('additional_items').deleteMany({});
    
    // Create menu packages
    const menuPackages: InsertMenuPackage[] = [
      // Non-Veg Packages
      {
        name: 'Royal',
        type: 'non-veg',
        price: 1750,
        currency: 'INR',
        gstIncluded: false,
        gstRate: 18,
        description: 'Premium non-vegetarian package with variety of dishes',
        isActive: true,
      },
      {
        name: 'Platinum',
        type: 'non-veg',
        price: 2000,
        currency: 'INR',
        gstIncluded: false,
        gstRate: 18,
        description: 'Luxury non-vegetarian package with live counters',
        isActive: true,
      },
      {
        name: 'Diamond',
        type: 'non-veg',
        price: 2400,
        currency: 'INR',
        gstIncluded: false,
        gstRate: 18,
        description: 'Ultimate non-vegetarian package with premium offerings',
        isActive: true,
      },
      // Veg Packages
      {
        name: 'Royal',
        type: 'veg',
        price: 1500,
        currency: 'INR',
        gstIncluded: false,
        gstRate: 18,
        description: 'Premium vegetarian package with variety of dishes',
        isActive: true,
      },
      {
        name: 'Platinum',
        type: 'veg',
        price: 1800,
        currency: 'INR',
        gstIncluded: false,
        gstRate: 18,
        description: 'Luxury vegetarian package with live counters',
        isActive: true,
      },
      {
        name: 'Diamond',
        type: 'veg',
        price: 2000,
        currency: 'INR',
        gstIncluded: false,
        gstRate: 18,
        description: 'Ultimate vegetarian package with premium offerings',
        isActive: true,
      },
    ];
    
    console.log('📦 Creating menu packages...');
    const packageResults = await db.collection('menu_packages').insertMany(menuPackages);
    const packageIds = Object.values(packageResults.insertedIds);
    
    // Create menu items for each package
    const menuItems: InsertMenuItem[] = [];
    
    // Royal Non-Veg Package Items
    const royalNonVegId = packageIds[0];
    menuItems.push(
      { packageId: royalNonVegId, category: 'Welcome Drinks', name: 'Welcome Drinks', quantity: 1, isVeg: true, sortOrder: 1 },
      { packageId: royalNonVegId, category: 'Soup Station', name: 'Soup Station', quantity: 2, isVeg: true, sortOrder: 2 },
      { packageId: royalNonVegId, category: 'Veg Floating Starters', name: 'Veg Floating Starters', quantity: 2, isVeg: true, sortOrder: 3 },
      { packageId: royalNonVegId, category: 'Non-Veg Floating Starters', name: 'Non-Veg Floating Starters (Chicken)', quantity: 1, isVeg: false, sortOrder: 4 },
      { packageId: royalNonVegId, category: 'Salad Bar', name: 'Salad Bar with Dressing, Accompaniments & Lettuce Bar', quantity: 3, isVeg: true, sortOrder: 5 },
      { packageId: royalNonVegId, category: 'Curd Raita', name: 'Curd Raita', quantity: 1, isVeg: true, sortOrder: 6 },
      { packageId: royalNonVegId, category: 'Speciality Main Course', name: 'Speciality Main Course', quantity: 1, isVeg: true, sortOrder: 7 },
      { packageId: royalNonVegId, category: 'Veg Main Course', name: 'Veg Main Course', quantity: 1, isVeg: true, sortOrder: 8 },
      { packageId: royalNonVegId, category: 'Non-Veg Main Course', name: 'Non-Veg Main Course (Chicken)', quantity: 1, isVeg: false, sortOrder: 9 },
      { packageId: royalNonVegId, category: 'Dal Preparation', name: 'Dal or Kadhi Preparation', quantity: 1, isVeg: true, sortOrder: 10 },
      { packageId: royalNonVegId, category: 'Rice Preparation', name: 'Rice Preparation', quantity: 2, isVeg: true, sortOrder: 11 },
      { packageId: royalNonVegId, category: 'Assorted Indian Breads', name: 'Assorted Indian Breads', quantity: 3, isVeg: true, sortOrder: 12 },
      { packageId: royalNonVegId, category: 'Papad Pickle Chutney Bar', name: 'Papad Pickle Chutney Bar', quantity: 1, isVeg: true, sortOrder: 13 },
      { packageId: royalNonVegId, category: 'Indian Dessert', name: 'Indian Dessert', quantity: 1, isVeg: true, sortOrder: 14 },
      { packageId: royalNonVegId, category: 'Western Dessert', name: 'Western Dessert', quantity: 1, isVeg: true, sortOrder: 15 },
      { packageId: royalNonVegId, category: 'Ice Cream', name: 'Ice Cream', quantity: 1, isVeg: true, sortOrder: 16 }
    );
    
    // Platinum Non-Veg Package Items
    const platinumNonVegId = packageIds[1];
    menuItems.push(
      { packageId: platinumNonVegId, category: 'Welcome Drinks', name: 'Welcome Drinks', quantity: 1, isVeg: true, sortOrder: 1 },
      { packageId: platinumNonVegId, category: 'Soup Station', name: 'Soup Station with Accompaniments', quantity: 1, isVeg: true, sortOrder: 2 },
      { packageId: platinumNonVegId, category: 'Salad Bar', name: 'Salad Bar with Dressings', quantity: 1, isVeg: true, sortOrder: 3 },
      { packageId: platinumNonVegId, category: 'Veg Floating Starters', name: 'Veg Floating Starters', quantity: 2, isVeg: true, sortOrder: 4 },
      { packageId: platinumNonVegId, category: 'Non-Veg Floating Starters', name: 'Non-Veg Floating Starters (Fish/Chicken)', quantity: 3, isVeg: false, sortOrder: 5 },
      { packageId: platinumNonVegId, category: 'Farsan', name: 'Farsan', quantity: 2, isVeg: true, sortOrder: 6 },
      { packageId: platinumNonVegId, category: 'Live Chaat Station', name: 'Live Chaat Station', quantity: 1, isVeg: true, sortOrder: 7 },
      { packageId: platinumNonVegId, category: 'Specialty Live Counter', name: 'Specialty Live Counter', quantity: 2, isVeg: true, sortOrder: 8 },
      { packageId: platinumNonVegId, category: 'Curd Raita', name: 'Curd Raita', quantity: 1, isVeg: true, sortOrder: 9 },
      { packageId: platinumNonVegId, category: 'Veg Main Course', name: 'Veg Main Course', quantity: 1, isVeg: true, sortOrder: 10 },
      { packageId: platinumNonVegId, category: 'Non-Veg Main Course', name: 'Non-Veg Main Course (Fish/Chicken)', quantity: 3, isVeg: false, sortOrder: 11 },
      { packageId: platinumNonVegId, category: 'Dal Preparation', name: 'Dal Preparation', quantity: 1, isVeg: true, sortOrder: 12 },
      { packageId: platinumNonVegId, category: 'Rice Preparation', name: 'Rice Preparation', quantity: 2, isVeg: true, sortOrder: 13 },
      { packageId: platinumNonVegId, category: 'Assorted Indian Breads', name: 'Assorted Indian Breads', quantity: 4, isVeg: true, sortOrder: 14 },
      { packageId: platinumNonVegId, category: 'Papad Chutney Pickle Station', name: 'Papad Chutney Pickle Station', quantity: 1, isVeg: true, sortOrder: 15 },
      { packageId: platinumNonVegId, category: 'Indian Dessert', name: 'Indian Dessert', quantity: 2, isVeg: true, sortOrder: 16 },
      { packageId: platinumNonVegId, category: 'Western Dessert', name: 'Western Dessert', quantity: 1, isVeg: true, sortOrder: 17 },
      { packageId: platinumNonVegId, category: 'Ice Cream', name: 'Ice Cream', quantity: 1, isVeg: true, sortOrder: 18 }
    );
    
    // Diamond Non-Veg Package Items
    const diamondNonVegId = packageIds[2];
    menuItems.push(
      { packageId: diamondNonVegId, category: 'Welcome Drinks', name: 'Welcome Drinks & Bar Display', quantity: 4, isVeg: true, sortOrder: 1 },
      { packageId: diamondNonVegId, category: 'Soup Station', name: 'Soup Station with Accompaniments', quantity: 1, isVeg: true, sortOrder: 2 },
      { packageId: diamondNonVegId, category: 'Non-Veg Floating Starters', name: 'Non-Veg Floating Starter (Fish/Chicken)', quantity: 2, isVeg: false, sortOrder: 3 },
      { packageId: diamondNonVegId, category: 'Veg Floating Starters', name: 'Veg Floating Starters', quantity: 3, isVeg: true, sortOrder: 4 },
      { packageId: diamondNonVegId, category: 'Farsan', name: 'Farsan', quantity: 3, isVeg: true, sortOrder: 5 },
      { packageId: diamondNonVegId, category: 'Salad Bar', name: 'Salad Bar with Presentation & Lettuce Bar', quantity: 2, isVeg: true, sortOrder: 6 },
      { packageId: diamondNonVegId, category: 'Dahi Wada', name: 'Dahi Wada', quantity: 5, isVeg: true, sortOrder: 7 },
      { packageId: diamondNonVegId, category: 'Live Chaat Station', name: 'Live Chaat Station', quantity: 1, isVeg: true, sortOrder: 8 },
      { packageId: diamondNonVegId, category: 'Specialty Live Counter', name: 'One Specialty Live Counter of Four Dishes', quantity: 3, isVeg: true, sortOrder: 9 },
      { packageId: diamondNonVegId, category: 'Curd Raita', name: 'Curd Raita', quantity: 2, isVeg: true, sortOrder: 10 },
      { packageId: diamondNonVegId, category: 'Veg Main Course', name: 'Veg Main Course', quantity: 1, isVeg: true, sortOrder: 11 },
      { packageId: diamondNonVegId, category: 'Non-Veg Main Course', name: 'Non-Veg Main Course (Fish/Mutton/Chicken)', quantity: 3, isVeg: false, sortOrder: 12 },
      { packageId: diamondNonVegId, category: 'Dal Preparation', name: 'Dal Preparation', quantity: 2, isVeg: true, sortOrder: 13 },
      { packageId: diamondNonVegId, category: 'Rice Preparation', name: 'Rice Preparation', quantity: 2, isVeg: true, sortOrder: 14 },
      { packageId: diamondNonVegId, category: 'Assorted Indian Breads', name: 'Assorted Indian Breads (Including Live Phulka)', quantity: 5, isVeg: true, sortOrder: 15 },
      { packageId: diamondNonVegId, category: 'Papad Chutney Pickle Station', name: 'Papad Chutney Pickle Station', quantity: 1, isVeg: true, sortOrder: 16 },
      { packageId: diamondNonVegId, category: 'Indian Dessert', name: 'Indian Dessert', quantity: 3, isVeg: true, sortOrder: 17 },
      { packageId: diamondNonVegId, category: 'Western Dessert', name: 'Western Dessert', quantity: 2, isVeg: true, sortOrder: 18 },
      { packageId: diamondNonVegId, category: 'Ice Cream', name: 'Ice Cream', quantity: 1, isVeg: true, sortOrder: 19 },
      { packageId: diamondNonVegId, category: 'Kulfi', name: 'Kulfi', quantity: 1, isVeg: true, sortOrder: 20 },
      { packageId: diamondNonVegId, category: 'Paan', name: 'Paan', quantity: 1, isVeg: true, sortOrder: 21 }
    );
    
    // Royal Veg Package Items
    const royalVegId = packageIds[3];
    menuItems.push(
      { packageId: royalVegId, category: 'Welcome Drinks', name: 'Welcome Drinks', quantity: 1, isVeg: true, sortOrder: 1 },
      { packageId: royalVegId, category: 'Soup Station', name: 'Soup Station', quantity: 1, isVeg: true, sortOrder: 2 },
      { packageId: royalVegId, category: 'Floating Starters', name: 'Floating Starters', quantity: 2, isVeg: true, sortOrder: 3 },
      { packageId: royalVegId, category: 'Salad Bar', name: 'Salad Bar with Dressings & Accompaniments', quantity: 3, isVeg: true, sortOrder: 4 },
      { packageId: royalVegId, category: 'Curd Raita', name: 'Curd Raita', quantity: 1, isVeg: true, sortOrder: 5 },
      { packageId: royalVegId, category: 'Speciality Main Course', name: 'Speciality Main Course', quantity: 1, isVeg: true, sortOrder: 6 },
      { packageId: royalVegId, category: 'Main Course', name: 'Main Course', quantity: 1, isVeg: true, sortOrder: 7 },
      { packageId: royalVegId, category: 'Dal Preparation', name: 'Dal or Kadhi Preparation', quantity: 1, isVeg: true, sortOrder: 8 },
      { packageId: royalVegId, category: 'Rice Preparation', name: 'Rice Preparation', quantity: 2, isVeg: true, sortOrder: 9 },
      { packageId: royalVegId, category: 'Assorted Indian Breads', name: 'Assorted Indian Breads', quantity: 3, isVeg: true, sortOrder: 10 },
      { packageId: royalVegId, category: 'Papad Pickle Chutney Bar', name: 'Papad Pickle Chutney Bar', quantity: 1, isVeg: true, sortOrder: 11 },
      { packageId: royalVegId, category: 'Indian Dessert', name: 'Indian Dessert', quantity: 1, isVeg: true, sortOrder: 12 },
      { packageId: royalVegId, category: 'Western Dessert', name: 'Western Dessert', quantity: 1, isVeg: true, sortOrder: 13 },
      { packageId: royalVegId, category: 'Ice Cream', name: 'Ice Cream', quantity: 1, isVeg: true, sortOrder: 14 }
    );
    
    // Platinum Veg Package Items
    const platinumVegId = packageIds[4];
    menuItems.push(
      { packageId: platinumVegId, category: 'Welcome Drinks', name: 'Welcome Drinks', quantity: 1, isVeg: true, sortOrder: 1 },
      { packageId: platinumVegId, category: 'Soup Station', name: 'Soup Station with Accompaniments', quantity: 1, isVeg: true, sortOrder: 2 },
      { packageId: platinumVegId, category: 'Salad Bar', name: 'Salad Bar with Dressings & Accompaniments', quantity: 1, isVeg: true, sortOrder: 3 },
      { packageId: platinumVegId, category: 'Floating Starters', name: 'Floating Starters', quantity: 2, isVeg: true, sortOrder: 4 },
      { packageId: platinumVegId, category: 'Farsan', name: 'Farsan', quantity: 1, isVeg: true, sortOrder: 5 },
      { packageId: platinumVegId, category: 'Live Chaat Station', name: 'Live Chaat Station', quantity: 2, isVeg: true, sortOrder: 6 },
      { packageId: platinumVegId, category: 'Specialty Live Counter', name: 'Specialty Live Counter', quantity: 1, isVeg: true, sortOrder: 7 },
      { packageId: platinumVegId, category: 'Curd Raita', name: 'Curd Raita', quantity: 1, isVeg: true, sortOrder: 8 },
      { packageId: platinumVegId, category: 'Main Course', name: 'Main Course', quantity: 3, isVeg: true, sortOrder: 9 },
      { packageId: platinumVegId, category: 'Dal Preparation', name: 'Dal Preparation', quantity: 1, isVeg: true, sortOrder: 10 },
      { packageId: platinumVegId, category: 'Rice Preparation', name: 'Rice Preparation', quantity: 2, isVeg: true, sortOrder: 11 },
      { packageId: platinumVegId, category: 'Assorted Indian Breads', name: 'Assorted Indian Breads', quantity: 4, isVeg: true, sortOrder: 12 },
      { packageId: platinumVegId, category: 'Papad Chutney Pickle Station', name: 'Papad Chutney Pickle Station', quantity: 1, isVeg: true, sortOrder: 13 },
      { packageId: platinumVegId, category: 'Indian Dessert', name: 'Indian Dessert', quantity: 2, isVeg: true, sortOrder: 14 },
      { packageId: platinumVegId, category: 'Western Dessert', name: 'Western Dessert', quantity: 1, isVeg: true, sortOrder: 15 },
      { packageId: platinumVegId, category: 'Ice Cream', name: 'Ice Cream', quantity: 1, isVeg: true, sortOrder: 16 }
    );
    
    // Diamond Veg Package Items
    const diamondVegId = packageIds[5];
    menuItems.push(
      { packageId: diamondVegId, category: 'Welcome Drinks', name: 'Welcome Drinks & Bar Display', quantity: 3, isVeg: true, sortOrder: 1 },
      { packageId: diamondVegId, category: 'Soup Station', name: 'Soup Station with Accompaniments', quantity: 1, isVeg: true, sortOrder: 2 },
      { packageId: diamondVegId, category: 'Floating Starters', name: 'Floating Starters', quantity: 2, isVeg: true, sortOrder: 3 },
      { packageId: diamondVegId, category: 'Farsan', name: 'Farsan', quantity: 4, isVeg: true, sortOrder: 4 },
      { packageId: diamondVegId, category: 'Salad Bar', name: 'Salad Bar with Presentation Lettuce Bar', quantity: 2, isVeg: true, sortOrder: 5 },
      { packageId: diamondVegId, category: 'Dahi Wada', name: 'Dahi Wada', quantity: 5, isVeg: true, sortOrder: 6 },
      { packageId: diamondVegId, category: 'Live Chaat Station', name: 'Live Chaat Station', quantity: 3, isVeg: true, sortOrder: 7 },
      { packageId: diamondVegId, category: 'Specialty Live Counter', name: 'Specialty Live Counter', quantity: 2, isVeg: true, sortOrder: 8 },
      { packageId: diamondVegId, category: 'Curd Raita', name: 'Curd Raita', quantity: 1, isVeg: true, sortOrder: 9 },
      { packageId: diamondVegId, category: 'Main Course', name: 'Main Course', quantity: 4, isVeg: true, sortOrder: 10 },
      { packageId: diamondVegId, category: 'Dal Preparation', name: 'Dal Preparation', quantity: 2, isVeg: true, sortOrder: 11 },
      { packageId: diamondVegId, category: 'Rice Preparation', name: 'Rice Preparation', quantity: 2, isVeg: true, sortOrder: 12 },
      { packageId: diamondVegId, category: 'Assorted Indian Breads', name: 'Assorted Indian Breads (Including Live Phulka)', quantity: 5, isVeg: true, sortOrder: 13 },
      { packageId: diamondVegId, category: 'Papad Chutney Pickle Station', name: 'Papad Chutney Pickle Station', quantity: 1, isVeg: true, sortOrder: 14 },
      { packageId: diamondVegId, category: 'Indian Dessert', name: 'Indian Dessert', quantity: 3, isVeg: true, sortOrder: 15 },
      { packageId: diamondVegId, category: 'Western Dessert', name: 'Western Dessert', quantity: 2, isVeg: true, sortOrder: 16 },
      { packageId: diamondVegId, category: 'Ice Cream', name: 'Ice Cream', quantity: 1, isVeg: true, sortOrder: 17 },
      { packageId: diamondVegId, category: 'Kulfi', name: 'Kulfi', quantity: 1, isVeg: true, sortOrder: 18 },
      { packageId: diamondVegId, category: 'Paan', name: 'Paan', quantity: 1, isVeg: true, sortOrder: 19 }
    );
    
    console.log('🍽️ Creating menu items...');
    await db.collection('menu_items').insertMany(menuItems);
    
    // Create additional items
    const additionalItems: InsertAdditionalItem[] = [
      { name: 'Juice Mocktail', price: 70, currency: 'INR', category: 'Beverages', isVeg: true, isActive: true },
      { name: 'Soup', price: 70, currency: 'INR', category: 'Starters', isVeg: true, isActive: true },
      { name: 'Starter Snacks', price: 100, currency: 'INR', category: 'Starters', isVeg: true, isActive: true },
      { name: 'Chaat Station', price: 150, currency: 'INR', category: 'Live Counters', isVeg: true, isActive: true },
      { name: 'Paneer Main Course', price: 150, currency: 'INR', category: 'Main Course', isVeg: true, isActive: true },
      { name: 'Vegetable Main Course', price: 140, currency: 'INR', category: 'Main Course', isVeg: true, isActive: true },
      { name: 'Specialty Live Counter', price: 225, currency: 'INR', category: 'Live Counters', isVeg: true, isActive: true },
      { name: 'Fruit Counter Indian', price: 250, currency: 'INR', category: 'Fruit Counters', isVeg: true, isActive: true },
      { name: 'Mixed Fruit Counter', price: 350, currency: 'INR', category: 'Fruit Counters', description: '05 Imported & 05 Domestic Types', isVeg: true, isActive: true },
      { name: 'Dessert Sweets', price: 140, currency: 'INR', category: 'Desserts', isVeg: true, isActive: true },
      { name: 'Fruit Stuffed Kulfi', price: 100, currency: 'INR', category: 'Desserts', isVeg: true, isActive: true },
      { name: 'Tea Coffee', price: 200, currency: 'INR', category: 'Tea & Coffee', isVeg: true, isActive: true },
      { name: 'Coffee Bar', price: 140, currency: 'INR', category: 'Tea & Coffee', isVeg: true, isActive: true },
      { name: 'Live Kesariya Kadai Milk', price: 0, currency: 'INR', category: 'Beverages', isVeg: true, isActive: true },
    ];
    
    console.log('➕ Creating additional items...');
    await db.collection('additional_items').insertMany(additionalItems);
    
    console.log('✅ Menu data seeded successfully!');
    console.log(`📦 Created ${packageResults.insertedCount} menu packages`);
    console.log(`🍽️ Created ${menuItems.length} menu items`);
    console.log(`➕ Created ${additionalItems.length} additional items`);
    
  } catch (error) {
    console.error('❌ Error seeding menu data:', error);
  } finally {
    await client.close();
  }
}

// Run the seeding function
seedMenuData().catch(console.error);



