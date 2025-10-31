import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../../storage';
import { insertQuotationSchema as clientInsertQuotationSchema } from '@shared/schema-client';

const router = Router();

// ============================================================================
// QUOTATIONS ROUTES
// ============================================================================

// Get all quotations
router.get('/', async (req, res) => {
  try {
    const quotations = await storage.getQuotations();
    res.json(quotations);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch quotations' });
  }
});

// Get quotations by enquiry ID
router.get('/enquiry/:enquiryId', async (req, res) => {
  try {
    const quotations = await storage.getQuotationsByEnquiry(req.params.enquiryId);
    res.json(quotations);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch quotations' });
  }
});

// Get quotations that exceeded discount limit
router.get('/exceeded-discounts', async (req, res) => {
  try {
    console.log('🔍 Fetching quotations that exceeded discount limit');
    const quotations = await storage.getQuotationsExceededDiscount();
    console.log('✅ Found exceeded discount quotations:', quotations.length);
    console.log('📋 Quotations:', JSON.stringify(quotations, null, 2));
    res.json(quotations);
  } catch (error) {
    console.error('❌ Error fetching exceeded discount quotations:', error);
    res.status(500).json({ message: 'Failed to fetch quotations that exceeded discount limit' });
  }
});

// Get quotation by ID
router.get('/:id', async (req, res) => {
  try {
    const quotation = await storage.getQuotationById(req.params.id);
    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }
    res.json(quotation);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch quotation' });
  }
});

// Create new quotation
router.post('/', async (req, res) => {
  try {
    console.log('🔍 Creating quotation with data:', JSON.stringify(req.body, null, 2));
    const validatedData = clientInsertQuotationSchema.parse(req.body);
    console.log('✅ Validated quotation data:', JSON.stringify(validatedData, null, 2));
    const quotation = await storage.createQuotation(validatedData);
    console.log('✅ Created quotation:', JSON.stringify(quotation, null, 2));
    
    // Create quotation activity for history tracking
    const activityData = {
      enquiryId: quotation.enquiryId,
      quotationId: quotation.id,
      type: 'created',
      timestamp: new Date().toISOString(),
      user: {
        name: req.user?.firstName && req.user?.lastName 
          ? `${req.user.firstName} ${req.user.lastName}` 
          : req.user?.email || 'System',
        email: req.user?.email || 'system@example.com'
      },
      details: {
        quotationNumber: quotation.quotationNumber,
        totalAmount: quotation.grandTotal || quotation.totalAmount
      }
    };
    
    await storage.createQuotationActivity(activityData);
    
    // Audit logging for quotation creation
    if (req.audit) {
      await req.audit.logBusinessAction('quotation_generated', 'quotations', quotation.id, {
        enquiryId: quotation.enquiryId,
        quotationNumber: quotation.quotationNumber,
        clientName: quotation.clientName,
        grandTotal: quotation.grandTotal,
        discountAmount: quotation.discountAmount,
        finalTotal: quotation.finalTotal,
        businessContext: true
      }, req);
    }
    
    res.status(201).json(quotation);
  } catch (error) {
    console.error('❌ Error creating quotation:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: error.errors 
      });
    }
    res.status(500).json({ message: 'Failed to create quotation' });
  }
});

// Update quotation
router.patch('/:id', async (req, res) => {
  try {
    // Get old quotation for comparison
    const oldQuotation = await storage.getQuotationById(req.params.id);
    
    const validatedData = clientInsertQuotationSchema.partial().parse(req.body);
    const quotation = await storage.updateQuotation(req.params.id, validatedData);
    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }
    
    // Audit logging for quotation update
    if (req.audit) {
      await req.audit.logDataChange(oldQuotation, quotation, 'quotation_generated', 'quotations', quotation.id, req);
      
      // Log specific status changes
      if (req.body.status && oldQuotation?.status !== req.body.status) {
        await req.audit.logBusinessAction('quotation_generated', 'quotations', quotation.id, {
          enquiryId: quotation.enquiryId,
          quotationNumber: quotation.quotationNumber,
          fromStatus: oldQuotation?.status,
          toStatus: req.body.status,
          action: 'status_changed'
        }, req);
      }
    }
    
    res.json(quotation);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: error.errors 
      });
    }
    res.status(500).json({ message: 'Failed to update quotation' });
  }
});

// Delete quotation
router.delete('/:id', async (req, res) => {
  try {
    // Get quotation before deletion for audit
    const quotation = await storage.getQuotationById(req.params.id);
    
    const success = await storage.deleteQuotation(req.params.id);
    if (!success) {
      return res.status(404).json({ message: 'Quotation not found' });
    }
    
    // Audit logging for quotation deletion
    if (req.audit && quotation) {
      await req.audit.logBusinessAction('deleted', 'quotations', req.params.id, {
        quotationNumber: quotation.quotationNumber,
        enquiryId: quotation.enquiryId,
        clientName: quotation.clientName,
        reason: 'Deleted via API'
      }, req);
    }
    
    res.json({ message: 'Quotation deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete quotation' });
  }
});

// Send quotation (update status to 'sent')
router.post('/:id/send', async (req, res) => {
  try {
    const quotation = await storage.updateQuotation(req.params.id, {
      status: 'sent',
      sentAt: new Date(),
    });
    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }
    
    // Create quotation activity for history tracking
    await storage.createQuotationActivity({
      enquiryId: quotation.enquiryId,
      quotationId: quotation.id,
      type: 'sent',
      timestamp: new Date().toISOString(),
      user: {
        name: req.user?.firstName && req.user?.lastName 
          ? `${req.user.firstName} ${req.user.lastName}` 
          : req.user?.email || 'System',
        email: req.user?.email || 'system@example.com'
      },
      details: {
        emailRecipient: req.body.emailRecipient || quotation.clientEmail
      }
    });
    
    // Audit logging for quotation sent
    if (req.audit) {
      await req.audit.logBusinessAction('updated', 'quotations', quotation.id, {
        action: 'quotation_sent',
        quotationNumber: quotation.quotationNumber,
        enquiryId: quotation.enquiryId,
        emailRecipient: req.body.emailRecipient || quotation.clientEmail
      }, req);
    }
    
    res.json(quotation);
  } catch (error) {
    res.status(500).json({ message: 'Failed to send quotation' });
  }
});

// Accept quotation (update status to 'accepted')
router.post('/:id/accept', async (req, res) => {
  try {
    const quotation = await storage.updateQuotation(req.params.id, {
      status: 'accepted',
      acceptedAt: new Date(),
    });
    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }
    
    // Create quotation activity for history tracking
    await storage.createQuotationActivity({
      enquiryId: quotation.enquiryId,
      quotationId: quotation.id,
      type: 'accepted',
      timestamp: new Date().toISOString(),
      user: {
        name: req.user?.firstName && req.user?.lastName 
          ? `${req.user.firstName} ${req.user.lastName}` 
          : req.user?.email || 'System',
        email: req.user?.email || 'system@example.com'
      }
    });
    
    // Audit logging for quotation accepted
    if (req.audit) {
      await req.audit.logBusinessAction('approved', 'quotations', quotation.id, {
        action: 'quotation_accepted',
        quotationNumber: quotation.quotationNumber,
        enquiryId: quotation.enquiryId
      }, req);
    }
    
    res.json(quotation);
  } catch (error) {
    res.status(500).json({ message: 'Failed to accept quotation' });
  }
});

// Reject quotation (update status to 'rejected')
router.post('/:id/reject', async (req, res) => {
  try {
    const quotation = await storage.updateQuotation(req.params.id, {
      status: 'rejected',
      rejectedAt: new Date(),
    });
    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }
    
    // Create quotation activity for history tracking
    await storage.createQuotationActivity({
      enquiryId: quotation.enquiryId,
      quotationId: quotation.id,
      type: 'rejected',
      timestamp: new Date().toISOString(),
      user: {
        name: req.user?.firstName && req.user?.lastName 
          ? `${req.user.firstName} ${req.user.lastName}` 
          : req.user?.email || 'System',
        email: req.user?.email || 'system@example.com'
      }
    });
    
    // Audit logging for quotation rejected
    if (req.audit) {
      await req.audit.logBusinessAction('rejected', 'quotations', quotation.id, {
        action: 'quotation_rejected',
        quotationNumber: quotation.quotationNumber,
        enquiryId: quotation.enquiryId,
        rejectionReason: req.body.rejectionReason
      }, req);
    }
    
    res.json(quotation);
  } catch (error) {
    res.status(500).json({ message: 'Failed to reject quotation' });
  }
});

// Get quotation activities
router.get('/activities/:enquiryId', async (req, res) => {
  try {
    const { enquiryId } = req.params;
    const activities = await storage.getQuotationActivitiesByEnquiry(enquiryId);
    res.json(activities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch activities' 
    });
  }
});

export default router;

