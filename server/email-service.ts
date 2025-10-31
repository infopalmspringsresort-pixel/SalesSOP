import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Create transporter (you'll need to configure this with your email provider)
const createTransporter = () => {
  // For development, use Ethereal Email (fake SMTP for testing)
  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: 'rbtg4mqd46nci5gd@ethereal.email',
      pass: 'gUF32KguAN4WqgwEhs'
    }
  });
  
  return transporter;
};

export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@yourcompany.com',
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments
    };

    const info = await transporter.sendMail(mailOptions);
    
    if (process.env.NODE_ENV === 'development') {
      }
    
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// For development testing
export async function createTestAccount() {
  try {
    const testAccount = await nodemailer.createTestAccount();
    return testAccount;
  } catch (error) {
    return null;
  }
}

