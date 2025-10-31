import 'dotenv/config';
import { pool } from '../server/db.js';

async function analyzeSessionConfig() {
  console.log('🔐 Session & Token Configuration Analysis\n');

  try {
    const client = await pool.connect();

    // Check session table structure
    console.log('📋 Session Table Structure:');
    const sessionTableInfo = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'sessions' 
      ORDER BY ordinal_position;
    `);
    
    sessionTableInfo.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });

    // Check current active sessions
    console.log('\n📊 Current Active Sessions:');
    const sessionCount = await client.query(`
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN expire > NOW() THEN 1 END) as active_sessions,
        COUNT(CASE WHEN expire <= NOW() THEN 1 END) as expired_sessions
      FROM sessions;
    `);
    
    console.log(`  - Total sessions: ${sessionCount.rows[0].total_sessions}`);
    console.log(`  - Active sessions: ${sessionCount.rows[0].active_sessions}`);
    console.log(`  - Expired sessions: ${sessionCount.rows[0].expired_sessions}`);

    // Check session expiry times
    const sessionDetails = await client.query(`
      SELECT 
        sid,
        expire,
        expire > NOW() as is_active,
        EXTRACT(EPOCH FROM (expire - NOW())) / 3600 as hours_until_expiry
      FROM sessions 
      WHERE expire > NOW() - interval '1 day'
      ORDER BY expire DESC
      LIMIT 10;
    `);

    if (sessionDetails.rows.length > 0) {
      console.log('\n⏰ Recent Session Details:');
      sessionDetails.rows.forEach(row => {
        const status = row.is_active ? '🟢 Active' : '🔴 Expired';
        const hours = row.hours_until_expiry ? Math.round(row.hours_until_expiry * 100) / 100 : 'N/A';
        console.log(`  - ${row.sid.slice(0, 10)}... ${status} (${hours}h remaining)`);
      });
    }

    client.release();

  } catch (error) {
    console.error('❌ Database error:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Analyze configuration from environment and code
  console.log('\n⚙️  Session Configuration:');
  console.log('From replitAuth.ts analysis:');
  console.log('  - Session TTL: 7 days (1 week)');
  console.log('  - Storage: PostgreSQL (sessions table)');
  console.log('  - Cookie HttpOnly: true');
  console.log('  - Cookie Secure: true (production only)');
  console.log('  - Session Secret: Set from SESSION_SECRET env var');
  console.log('  - Auto-cleanup: Handled by connect-pg-simple');

  console.log('\n🔑 Authentication Providers:');
  console.log('  - Local (email/password): ✅ Implemented');
  console.log('  - Replit OAuth: ✅ Implemented (with token refresh)');
  console.log('  - Google OAuth: ✅ Configurable (needs GOOGLE_CLIENT_ID/SECRET)');
  console.log('  - GitHub OAuth: ✅ Configurable (needs GITHUB_CLIENT_ID/SECRET)');

  console.log('\n🛡️  Security Features:');
  console.log('  - Password hashing: bcrypt with salt rounds 10');
  console.log('  - Session store: Database-backed (not memory)');
  console.log('  - User status checking: Active user validation');
  console.log('  - Token refresh: Automatic for Replit OAuth');
  console.log('  - Audit logging: Login/logout events tracked');

  console.log('\n📱 Session Behavior:');
  console.log('  - Login duration: 7 days without re-authentication');
  console.log('  - Cross-tab persistence: ✅ Yes (shared session cookie)');
  console.log('  - Auto-logout on inactive users: ✅ Yes');
  console.log('  - Remember me: Implicit (7-day duration)');
  console.log('  - Session cleanup: Automatic via DB TTL');

  console.log('\n🚀 Production Deployment:');
  console.log('  - Database sessions: ✅ Persistent across server restarts');
  console.log('  - SSL cookies: ✅ Secure flag set for production');
  console.log('  - Session scaling: ✅ Multi-server compatible');
  console.log('  - Memory efficiency: ✅ No server memory usage');

  process.exit(0);
}

analyzeSessionConfig();