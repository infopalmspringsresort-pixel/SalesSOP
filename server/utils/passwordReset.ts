import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

export interface PasswordResetToken {
  userId: string;
  email: string;
  token: string;
  expiresAt: Date;
}

// In-memory storage for verification tokens (in production, use Redis or database)
const verificationTokens = new Map<string, { userId: string; email: string; expiresAt: Date }>();

export function generatePasswordResetToken(userId: string, email: string): string {
  const payload = {
    userId,
    email,
    type: 'password_reset',
    iat: Math.floor(Date.now() / 1000)
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyPasswordResetToken(token: string): { userId: string; email: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    if (decoded.type !== 'password_reset') {
      return null;
    }

    return {
      userId: decoded.userId,
      email: decoded.email
    };
  } catch (error) {
    return null;
  }
}

export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Generate 6-digit verification token
export function generateVerificationToken(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Store verification token
export function storeVerificationToken(token: string, userId: string, email: string): void {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  verificationTokens.set(token, { userId, email, expiresAt });
}

// Verify and consume verification token
export function verifyAndConsumeToken(token: string): { userId: string; email: string } | null {
  const tokenData = verificationTokens.get(token);
  
  if (!tokenData) {
    return null;
  }
  
  if (new Date() > tokenData.expiresAt) {
    verificationTokens.delete(token);
    return null;
  }
  
  // Consume the token (remove it after use)
  verificationTokens.delete(token);
  return { userId: tokenData.userId, email: tokenData.email };
}

