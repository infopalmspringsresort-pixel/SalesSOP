// Diagnostic script to check which .env is being loaded
import { resolve } from 'path';
import dotenv from 'dotenv';
import { existsSync } from 'fs';

console.log('\n' + '='.repeat(70));
console.log('🔍 ENVIRONMENT VARIABLE DIAGNOSTIC');
console.log('='.repeat(70) + '\n');

// Check .env file locations
const rootEnv = resolve(process.cwd(), '.env');
const serverEnv = resolve(process.cwd(), 'server', '.env');

console.log('📁 Checking .env file locations:');
console.log(`   Root .env: ${rootEnv}`);
console.log(`   Exists: ${existsSync(rootEnv) ? '✅' : '❌'}`);
console.log(`   Server .env: ${serverEnv}`);
console.log(`   Exists: ${existsSync(serverEnv) ? '✅' : '❌'}\n`);

// Load from root
dotenv.config({ path: rootEnv });

// Check what got loaded
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME;

console.log('📋 Environment Variables Loaded:');
console.log(`   MONGODB_URI: ${uri ? uri.substring(0, 80) + '...' : '❌ NOT SET'}`);
console.log(`   MONGODB_DB_NAME: ${dbName || '❌ NOT SET'}\n`);

// Identify which database
if (uri) {
  if (uri.includes('slaessop.u5uwkci.mongodb.net')) {
    console.log('✅ Database: NEW Atlas (slaessop.u5uwkci.mongodb.net)');
  } else if (uri.includes('palmsprings.nlxfz1k.mongodb.net')) {
    console.log('❌ Database: OLD Atlas (palmsprings.nlxfz1k.mongodb.net)');
  } else {
    console.log('❓ Database: Unknown connection');
  }
}

console.log('\n' + '='.repeat(70));
console.log('💡 If this shows OLD database, check:');
console.log('   1. .env file at project root');
console.log('   2. No .env files in server/ directory');
console.log('   3. Restart server after changing .env');
console.log('='.repeat(70) + '\n');

