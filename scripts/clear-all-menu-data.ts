#!/usr/bin/env npx tsx

/**
 * Clear All Menu Data Script
 * 
 * This script removes ALL data from:
 * - Menu Packages
 * - Package Items (Menu Items)
 * - Additional Items
 * 
 * ⚠️ WARNING: This will permanently delete all menu-related data!
 */

import { MongoClient } from 'mongodb';
import { config } from 'dotenv';

// Load environment variables
config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DB_NAME || 'PALMSPRINGDB';

async function clearAllMenuData() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    
    // Clear Menu Packages
    console.log('\n📦 Clearing Menu Packages...');
    const menuPackagesCollection = db.collection('menu_packages');
    const menuPackagesResult = await menuPackagesCollection.deleteMany({});
    console.log(`   ✅ Deleted ${menuPackagesResult.deletedCount} menu packages`);
    
    // Clear Package Items (Menu Items)
    console.log('\n🍽️ Clearing Package Items (Menu Items)...');
    const menuItemsCollection = db.collection('menu_items');
    const menuItemsResult = await menuItemsCollection.deleteMany({});
    console.log(`   ✅ Deleted ${menuItemsResult.deletedCount} package items`);
    
    // Clear Additional Items
    console.log('\n➕ Clearing Additional Items...');
    const additionalItemsCollection = db.collection('additional_items');
    const additionalItemsResult = await additionalItemsCollection.deleteMany({});
    console.log(`   ✅ Deleted ${additionalItemsResult.deletedCount} additional items`);
    
    console.log('\n✅ All menu data cleared successfully!');
    console.log('\nSummary:');
    console.log(`   • Menu Packages: ${menuPackagesResult.deletedCount} deleted`);
    console.log(`   • Package Items: ${menuItemsResult.deletedCount} deleted`);
    console.log(`   • Additional Items: ${additionalItemsResult.deletedCount} deleted`);
    
  } catch (error) {
    console.error('❌ Error clearing menu data:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✅ Database connection closed');
  }
}

// Run the cleanup
clearAllMenuData();

