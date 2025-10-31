import { Router } from "express";
import multer from "multer";
import { storage } from "../../storage";
import { emailService } from "../../utils/emailService";

const router = Router();

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Send quotation email with PDF attachment
router.post('/send-email', async (req, res) => {
  try {
    const { quotationId, recipientEmail, subject, message } = req.body;
    
    if (!quotationId || !recipientEmail) {
      return res.status(400).json({ 
        success: false, 
        error: 'Quotation ID and recipient email are required' 
      });
    }

    // Get quotation details
    const quotation = await storage.getQuotationById(quotationId);
    if (!quotation) {
      return res.status(404).json({ 
        success: false, 
        error: 'Quotation not found' 
      });
    }

    // Send email with PDF using the new email service method
    const success = await emailService.sendQuotationEmail(quotation, recipientEmail, subject, message);
    
    if (!success) {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to send email' 
      });
    }

    // Update quotation status to 'sent'
    await storage.updateQuotation(quotationId, { 
      status: 'sent',
      sentAt: new Date()
    });

    // Log the email activity
    await storage.createQuotationActivity({
      quotationId,
      type: 'sent',
      timestamp: new Date(),
      user: req.user ? {
        name: req.user.name,
        email: req.user.email
      } : undefined,
      details: {
        emailRecipient: recipientEmail
      }
    });

    res.json({ 
      success: true, 
      message: 'Email sent successfully' 
    });
  } catch (error) {
    console.error('Error sending quotation email:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send email' 
    });
  }
});

// Send quotation reminder
router.post('/send-reminder', async (req, res) => {
  try {
    const { quotationId, recipientEmail } = req.body;
    
    if (!quotationId || !recipientEmail) {
      return res.status(400).json({ 
        success: false, 
        error: 'Quotation ID and recipient email are required' 
      });
    }

    const quotation = await storage.getQuotationById(quotationId);
    if (!quotation) {
      return res.status(404).json({ 
        success: false, 
        error: 'Quotation not found' 
      });
    }

    const mailOptions = {
      from: process.env.MAIL_FROM || process.env.SMTP_USER || 'noreply@yourcompany.com',
      to: recipientEmail,
      subject: `Reminder: Quotation ${quotation.quotationNumber}`,
      html: getReminderEmailHTML(quotation)
    };

    const info = await emailService.transporter.sendMail(mailOptions);
    // Log the reminder activity
    await storage.createQuotationActivity({
      quotationId,
      type: 'reminder_sent',
      timestamp: new Date(),
      user: req.user ? {
        name: req.user.name,
        email: req.user.email
      } : undefined,
      details: {
        emailRecipient: recipientEmail,
        reminderCount: 1
      }
    });

    res.json({ 
      success: true, 
      messageId: info.messageId 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send reminder' 
    });
  }
});

// Send quotation follow-up
router.post('/send-followup', async (req, res) => {
  try {
    const { quotationId, recipientEmail, message } = req.body;
    
    if (!quotationId || !recipientEmail || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Quotation ID, recipient email, and message are required' 
      });
    }

    const quotation = await storage.getQuotationById(quotationId);
    if (!quotation) {
      return res.status(404).json({ 
        success: false, 
        error: 'Quotation not found' 
      });
    }

    const mailOptions = {
      from: process.env.MAIL_FROM || process.env.SMTP_USER || 'noreply@yourcompany.com',
      to: recipientEmail,
      subject: `Follow-up: Quotation ${quotation.quotationNumber}`,
      html: getFollowUpEmailHTML(quotation, message)
    };

    const info = await emailService.transporter.sendMail(mailOptions);
    // Log the follow-up activity
    await storage.createQuotationActivity({
      quotationId,
      type: 'followup_sent',
      timestamp: new Date(),
      user: req.user ? {
        name: req.user.name,
        email: req.user.email
      } : undefined,
      details: {
        emailRecipient: recipientEmail,
        message
      }
    });

    res.json({ 
      success: true, 
      messageId: info.messageId 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send follow-up' 
    });
  }
});


function getDefaultEmailHTML(quotation: any): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Quotation ${quotation.quotationNumber}</h2>
      <p>Dear ${quotation.clientName},</p>
      <p>Thank you for your interest in our services. Please find attached the quotation for your ${quotation.eventType} event.</p>
      
      <div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
        <h3 style="margin-top: 0;">Quotation Summary</h3>
        <p><strong>Event Date:</strong> ${quotation.eventDate ? new Date(quotation.eventDate).toLocaleDateString() : 'N/A'}</p>
        <p><strong>Expected Guests:</strong> ${quotation.expectedGuests}</p>
        <p><strong>Total Amount:</strong> ₹${(quotation.totalAmount || 0).toLocaleString()}</p>
        <p><strong>Valid Until:</strong> ${new Date(quotation.validUntil).toLocaleDateString()}</p>
      </div>
      
      <p>Please review the attached quotation and let us know if you have any questions or would like to make any modifications.</p>
      <p>We look forward to serving you and making your event memorable.</p>
      
      <p>Best regards,<br>Your Company Name</p>
    </div>
  `;
}

function getReminderEmailHTML(quotation: any): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Reminder: Quotation ${quotation.quotationNumber}</h2>
      <p>Dear ${quotation.clientName},</p>
      <p>This is a friendly reminder about your quotation for the ${quotation.eventType} event.</p>
      
      <div style="background: #fff3cd; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #ffc107;">
        <p><strong>Important:</strong> This quotation is valid until ${new Date(quotation.validUntil).toLocaleDateString()}</p>
        <p><strong>Total Amount:</strong> ₹${(quotation.totalAmount || 0).toLocaleString()}</p>
      </div>
      
      <p>Please let us know if you have any questions or if you'd like to proceed with the booking.</p>
      <p>We're here to help make your event a success!</p>
      
      <p>Best regards,<br>Your Company Name</p>
    </div>
  `;
}

function getFollowUpEmailHTML(quotation: any, message: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Follow-up: Quotation ${quotation.quotationNumber}</h2>
      <p>Dear ${quotation.clientName},</p>
      <p>${message}</p>
      
      <div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
        <h3 style="margin-top: 0;">Quotation Details</h3>
        <p><strong>Quotation Number:</strong> ${quotation.quotationNumber}</p>
        <p><strong>Event Date:</strong> ${quotation.eventDate ? new Date(quotation.eventDate).toLocaleDateString() : 'N/A'}</p>
        <p><strong>Total Amount:</strong> ₹${(quotation.totalAmount || 0).toLocaleString()}</p>
      </div>
      
      <p>Please don't hesitate to contact us if you need any clarification or assistance.</p>
      <p>Best regards,<br>Your Company Name</p>
    </div>
  `;
}

export default router;
