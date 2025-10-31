import { storage } from '../server/storage.js';

async function activateAdmin() {
  try {
    console.log('🔧 Activating admin user...\n');
    
    const adminEmail = 'md.palmspringsresort@gmail.com';
    const user = await storage.getUserByEmail(adminEmail);
    
    if (!user) {
      console.log('❌ Admin user not found');
      return;
    }
    
    console.log('Current status:', user.status);
    
    // Activate the admin user
    await storage.updateUser(user.id, { status: 'active' });
    
    // Verify the update
    const updatedUser = await storage.getUserByEmail(adminEmail);
    console.log('✅ Updated status:', updatedUser?.status);
    
    console.log('\n🎉 Admin user is now active!');
    console.log('\n📋 Login credentials:');
    console.log(`Email: ${adminEmail}`);
    console.log('Password: pass123');
    console.log('\nYou can now login as admin! 🚀');
    
  } catch (error) {
    console.error('❌ Error activating admin:', error);
  } finally {
    process.exit(0);
  }
}

activateAdmin();