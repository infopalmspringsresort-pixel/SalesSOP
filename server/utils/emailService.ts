import * as nodemailer from 'nodemailer';

interface EmailConfig {
  service: string;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;
  private config: EmailConfig;

  constructor() {
    this.config = {
      service: process.env.EMAIL_SERVICE || 'gmail',
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
      from: process.env.MAIL_FROM || process.env.SMTP_USER || ''
    };

    this.transporter = nodemailer.createTransport({
      service: this.config.service,
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: {
        user: this.config.user,
        pass: this.config.pass
      }
    });
  }

  async sendPasswordResetEmail(email: string, verificationToken: string, userName: string): Promise<boolean> {
    try {
      const mailOptions = {
        from: this.config.from,
        to: email,
        subject: 'Password Reset OTP',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
              <h2 style="color: #333; margin-bottom: 20px;">Password Reset OTP</h2>
              
              <p style="color: #666; line-height: 1.6;">
                Hello ${userName},
              </p>
              
              <p style="color: #666; line-height: 1.6;">
                We received a request to reset your password. Please use the OTP below to verify your identity.
              </p>
              
              <div style="background-color: #fff; padding: 30px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #007bff; text-align: center;">
                <p style="margin: 0 0 15px 0; color: #333; font-weight: 500; font-size: 16px;">
                  Your OTP (One-Time Password) is:
                </p>
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; border: 2px dashed #007bff; margin: 20px 0;">
                  <span style="font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                    ${verificationToken}
                  </span>
                </div>
                <p style="margin: 15px 0 0 0; color: #666; font-size: 14px;">
                  Enter this OTP on the verification page to continue with password reset.
                </p>
              </div>
              
              <div style="background-color: #fff3cd; padding: 15px; border-radius: 6px; border-left: 4px solid #ffc107; margin: 20px 0;">
                <p style="margin: 0; color: #856404; font-size: 14px;">
                  <strong>Important:</strong> This OTP will expire in 10 minutes for security reasons.
                </p>
              </div>
              
              <p style="color: #666; line-height: 1.6; font-size: 14px;">
                If you didn't request this password reset, please ignore this email and the OTP. Your password will remain unchanged.
              </p>
              
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              <p style="color: #999; font-size: 12px; text-align: center;">
                This email was sent from Palm Springs Resort. Please do not reply to this email.
              </p>
            </div>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      return false;
    }
  }

  async sendQuotationEmail(quotation: any, recipientEmail: string, subject?: string, message?: string): Promise<boolean> {
    try {
      // Generate PDF using Puppeteer (same as download)
      const { generateQuotationPDF } = await import('./puppeteer-pdf');
      const pdfBuffer = await generateQuotationPDF(quotation);
      
      // Create email content
      const emailSubject = subject || `Quotation ${quotation.quotationNumber}`;
      const emailMessage = message || this.getDefaultQuotationEmailHTML(quotation);
      
      const mailOptions = {
        from: this.config.from,
        to: recipientEmail,
        subject: emailSubject,
        html: emailMessage,
        attachments: [{
          filename: `quotation-${quotation.quotationNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }]
      };

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Error sending quotation email:', error);
      return false;
    }
  }

  private getDefaultQuotationEmailHTML(quotation: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <!-- Header with Logo -->
          <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #f1f3f4;">
            <h1 style="color: #2980b9; margin: 0; font-size: 32px; font-weight: bold;">Palm Springs Resort</h1>
            <p style="color: #7f8c8d; margin: 8px 0 0 0; font-size: 18px; font-weight: 300;">Luxury Hotel & Banquet</p>
            <div style="margin-top: 15px;">
              <span style="background-color: #2980b9; color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 500;">
                QUOTATION
              </span>
            </div>
          </div>
          
          <!-- Quotation Number Badge -->
          <div style="text-align: center; margin-bottom: 25px;">
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; border: 2px solid #e9ecef; display: inline-block;">
              <h2 style="color: #2c3e50; margin: 0; font-size: 20px; font-weight: 600;">${quotation.quotationNumber}</h2>
              <p style="color: #6c757d; margin: 5px 0 0 0; font-size: 14px;">Generated on ${new Date(quotation.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
          
          <!-- Greeting -->
          <p style="color: #2c3e50; line-height: 1.6; font-size: 16px; margin-bottom: 20px;">
            Dear <strong>${quotation.clientName}</strong>,
          </p>
          
          <p style="color: #495057; line-height: 1.6; font-size: 16px; margin-bottom: 25px;">
            Thank you for your interest in our services. We are delighted to present you with a detailed quotation for your upcoming event.
          </p>
          
          <!-- Quotation Summary Card -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 25px; margin: 25px 0; border-radius: 12px; color: white;">
            <h3 style="color: white; margin-top: 0; font-size: 20px; font-weight: 600; margin-bottom: 20px;">
              📋 Quotation Summary
            </h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 14px;">
              <div style="background-color: rgba(255,255,255,0.1); padding: 12px; border-radius: 6px;">
                <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Quotation Number</p>
                <p style="margin: 5px 0 0 0; color: white; font-weight: 600; font-size: 16px;">${quotation.quotationNumber}</p>
              </div>
              <div style="background-color: rgba(255,255,255,0.1); padding: 12px; border-radius: 6px;">
                <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Date</p>
                <p style="margin: 5px 0 0 0; color: white; font-weight: 600; font-size: 16px;">${new Date(quotation.createdAt).toLocaleDateString()}</p>
              </div>
              <div style="background-color: rgba(255,255,255,0.1); padding: 12px; border-radius: 6px;">
                <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Expected Guests</p>
                <p style="margin: 5px 0 0 0; color: white; font-weight: 600; font-size: 16px;">${quotation.expectedGuests || 'Not specified'}</p>
              </div>
              <div style="background-color: rgba(255,255,255,0.1); padding: 12px; border-radius: 6px;">
                <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Grand Total</p>
                <p style="margin: 5px 0 0 0; color: white; font-weight: 600; font-size: 16px;">₹${(quotation.grandTotal || 0).toLocaleString()}</p>
              </div>
            </div>
            ${quotation.finalTotal && quotation.finalTotal !== quotation.grandTotal ? 
              `<div style="background-color: rgba(255,255,255,0.2); padding: 15px; margin-top: 15px; border-radius: 8px; text-align: center;">
                <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Final Total (After Discount)</p>
                <p style="margin: 8px 0 0 0; color: #ffd700; font-weight: bold; font-size: 24px;">₹${quotation.finalTotal.toLocaleString()}</p>
              </div>` : ''}
          </div>
          
          <!-- Important Notice -->
          <div style="background-color: #fff3cd; padding: 20px; margin: 25px 0; border-radius: 8px; border-left: 5px solid #ffc107;">
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
              <span style="font-size: 20px; margin-right: 10px;">⚠️</span>
              <h4 style="margin: 0; color: #856404; font-size: 16px; font-weight: 600;">Important Notice</h4>
            </div>
            <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.5;">
              This quotation is valid until <strong>${new Date(quotation.validUntil).toLocaleDateString()}</strong>. 
              Please review the attached PDF for complete details including venue, room, and menu packages.
            </p>
          </div>
          
          <!-- Main Message -->
          <div style="background-color: #f8f9fa; padding: 20px; margin: 25px 0; border-radius: 8px; border: 1px solid #e9ecef;">
            <p style="color: #495057; line-height: 1.6; font-size: 16px; margin: 0 0 15px 0;">
              Please review the attached quotation carefully and let us know if you have any questions or would like to make any modifications. 
              Our team is here to help make your event memorable and successful.
            </p>
            <p style="color: #495057; line-height: 1.6; font-size: 16px; margin: 0;">
              We look forward to the opportunity to serve you and create an unforgettable experience for your special occasion.
            </p>
          </div>
          
          <!-- Call to Action -->
          <div style="text-align: center; margin: 30px 0;">
            <div style="background-color: #28a745; color: white; padding: 15px 30px; border-radius: 25px; display: inline-block; text-decoration: none; font-weight: 600; font-size: 16px;">
              📄 View Attached Quotation
            </div>
          </div>
          
          <!-- Footer -->
          <div style="margin-top: 40px; padding-top: 25px; border-top: 2px solid #f1f3f4; text-align: center;">
            <p style="color: #2c3e50; font-size: 18px; margin: 0 0 10px 0; font-weight: 600;">
              Best regards,
            </p>
            <p style="color: #2980b9; font-size: 20px; margin: 0 0 15px 0; font-weight: bold;">
              Palm Springs Resort Team
            </p>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p style="margin: 0; color: #6c757d; font-size: 14px;">
                📞 <strong>Phone:</strong> +91 1234567890<br>
                ✉️ <strong>Email:</strong> info@palmsprings.com<br>
                🌐 <strong>Website:</strong> www.palmspringsresort.com
              </p>
            </div>
            <p style="color: #adb5bd; font-size: 12px; margin: 20px 0 0 0;">
              This email was sent from Palm Springs Resort. Please do not reply to this email.
            </p>
          </div>
        </div>
      </div>
    `;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      return false;
    }
  }
}

export const emailService = new EmailService();

