#!/usr/bin/env npx tsx

/**
 * Database Cleanup Script - Remove Unused Fields
 * 
 * This script removes fields that were removed from forms but still exist in the database:
 * 
 * From Menu Packages:
 * - currency (default to INR)
 * - minGuests 
 * - maxGuests
 * - isActive
 * 
 * From Menu Items:
 * - sortOrder
 * - isVeg
 * - isOptional
 * - isActive
 * 
 * From Room Types:
 * - includesBreakfast
 * - isActive
 * - amenities
 * - checkInTime
 * - checkOutTime
 * 
 * From Venues:
 * - amenities
 * - isActive
 * 
 * From Additional Items:
 * - isActive
 */

import { MongoClient } from 'mongodb';
import { config } from 'dotenv';

// Load environment variables
config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DB_NAME || 'palmsprings';

async function cleanupDatabase() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    
    console.log('\n🧹 Starting database cleanup...\n');
    
    // 1. Clean up Menu Packages
    console.log('📦 Cleaning up Menu Packages...');
    const menuPackagesResult = await db.collection('menuPackages').updateMany(
      {},
      {
        $unset: {
          currency: "",
          minGuests: "",
          maxGuests: "",
          isActive: ""
        }
      }
    );
    console.log(`   ✅ Removed fields from ${menuPackagesResult.modifiedCount} menu packages`);
    
    // 2. Clean up Menu Items
    console.log('🍽️ Cleaning up Menu Items...');
    const menuItemsResult = await db.collection('menuItems').updateMany(
      {},
      {
        $unset: {
          sortOrder: "",
          isVeg: "",
          isOptional: "",
          isActive: ""
        }
      }
    );
    console.log(`   ✅ Removed fields from ${menuItemsResult.modifiedCount} menu items`);
    
    // 3. Clean up Room Types
    console.log('🏨 Cleaning up Room Types...');
    const roomTypesResult = await db.collection('roomTypes').updateMany(
      {},
      {
        $unset: {
          includesBreakfast: "",
          isActive: "",
          amenities: "",
          checkInTime: "",
          checkOutTime: ""
        }
      }
    );
    console.log(`   ✅ Removed fields from ${roomTypesResult.modifiedCount} room types`);
    
    // 4. Clean up Venues
    console.log('🏛️ Cleaning up Venues...');
    const venuesResult = await db.collection('venues').updateMany(
      {},
      {
        $unset: {
          amenities: "",
          isActive: ""
        }
      }
    );
    console.log(`   ✅ Removed fields from ${venuesResult.modifiedCount} venues`);
    
    // 5. Clean up Additional Items
    console.log('➕ Cleaning up Additional Items...');
    const additionalItemsResult = await db.collection('additionalItems').updateMany(
      {},
      {
        $unset: {
          isActive: ""
        }
      }
    );
    console.log(`   ✅ Removed fields from ${additionalItemsResult.modifiedCount} additional items`);
    
    // 6. Clean up Package-Venue Mappings
    console.log('🔗 Cleaning up Package-Venue Mappings...');
    const packageVenueResult = await db.collection('packageVenueMappings').updateMany(
      {},
      {
        $unset: {
          minGuests: "",
          isActive: ""
        }
      }
    );
    console.log(`   ✅ Removed fields from ${packageVenueResult.modifiedCount} package-venue mappings`);
    
    console.log('\n🎉 Database cleanup completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • Menu Packages: ${menuPackagesResult.modifiedCount} updated`);
    console.log(`   • Menu Items: ${menuItemsResult.modifiedCount} updated`);
    console.log(`   • Room Types: ${roomTypesResult.modifiedCount} updated`);
    console.log(`   • Venues: ${venuesResult.modifiedCount} updated`);
    console.log(`   • Additional Items: ${additionalItemsResult.modifiedCount} updated`);
    console.log(`   • Package-Venue Mappings: ${packageVenueResult.modifiedCount} updated`);
    
    console.log('\n✨ All unused fields have been removed from the database!');
    
  } catch (error) {
    console.error('❌ Error during database cleanup:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the cleanup
cleanupDatabase().catch(console.error);

