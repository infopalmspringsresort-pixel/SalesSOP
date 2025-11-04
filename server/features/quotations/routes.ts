import { Router } from 'express';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { storage } from '../../storage';
import { insertQuotationPackageSchema, insertQuotationSchema } from '@shared/schema-mongodb';
import { generateQuotationPDF } from '../../utils/puppeteer-pdf';

const router = Router();

// Helper function to create a schema that accepts string or ObjectId and converts to ObjectId
const objectIdStringSchema = z.union([
  z.string().transform((val) => {
    try {
      return new ObjectId(val);
    } catch {
      throw new z.ZodError([{
        code: z.ZodIssueCode.custom,
        message: 'Invalid ObjectId format',
        path: []
      }]);
    }
  }),
  z.instanceof(ObjectId)
]);

// Create a modified insertQuotationSchema that accepts strings for ObjectId fields
const insertQuotationSchemaWithStringIds = insertQuotationSchema.extend({
  enquiryId: objectIdStringSchema,
  createdBy: objectIdStringSchema,
  parentQuotationId: objectIdStringSchema.optional(),
});

// ============================================================================
// QUOTATION PACKAGES ROUTES (Must come before /:id routes)
// ============================================================================

// Get all quotation packages
router.get('/packages', async (req, res) => {
  try {
    const packages = await storage.getQuotationPackages();
    res.json(packages);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch quotation packages' });
  }
});

// Get quotation package by ID
router.get('/packages/:id', async (req, res) => {
  try {
    const package_ = await storage.getQuotationPackageById(req.params.id);
    if (!package_) {
      return res.status(404).json({ message: 'Quotation package not found' });
    }
    res.json(package_);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch quotation package' });
  }
});

// Create new quotation package
router.post('/packages', async (req, res) => {
  try {
    const validatedData = insertQuotationPackageSchema.parse(req.body);
    const package_ = await storage.createQuotationPackage(validatedData);
    res.status(201).json(package_);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: error.errors 
      });
    }
    res.status(500).json({ message: 'Failed to create quotation package' });
  }
});

// Update quotation package
router.patch('/packages/:id', async (req, res) => {
  try {
    const validatedData = insertQuotationPackageSchema.partial().parse(req.body);
    const package_ = await storage.updateQuotationPackage(req.params.id, validatedData);
    if (!package_) {
      return res.status(404).json({ message: 'Quotation package not found' });
    }
    res.json(package_);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: error.errors 
      });
    }
    res.status(500).json({ message: 'Failed to update quotation package' });
  }
});

// Delete quotation package
router.delete('/packages/:id', async (req, res) => {
  try {
    const success = await storage.deleteQuotationPackage(req.params.id);
    if (!success) {
      return res.status(404).json({ message: 'Quotation package not found' });
    }
    res.json({ message: 'Quotation package deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete quotation package' });
  }
});

// ============================================================================
// QUOTATION ROUTES
// ============================================================================

// Get quotation activities by enquiry ID (must come before /:id routes)
router.get('/activities/:enquiryId', async (req, res) => {
  try {
    const { enquiryId } = req.params;
    let activities = await storage.getQuotationActivitiesByEnquiry(enquiryId);
    
    // If no activities found, generate them from quotations
    if (!activities || activities.length === 0) {
      const quotations = await storage.getQuotationsByEnquiry(enquiryId);
      
      // Transform quotations into activity objects
      activities = [];
      
      for (const quotation of quotations) {
        // Get user info if createdBy exists
        let userInfo = undefined;
        if (quotation.createdBy) {
          try {
            const user = await storage.getUser(String(quotation.createdBy));
            if (user) {
              userInfo = {
                name: user.name || user.email || 'Unknown',
                email: user.email || ''
              };
            }
          } catch (err) {
            // Ignore user fetch errors
          }
        }
        
        // Activity for creation
        if (quotation.createdAt) {
          activities.push({
            id: `${quotation.id || quotation._id}-created`,
            type: 'created',
            timestamp: quotation.createdAt,
            user: userInfo,
            quotation: {
              discountAmount: quotation.discountAmount || 0,
              discountReason: quotation.discountReason,
              discountApprovalStatus: quotation.discountExceedsLimit ? 'pending' : undefined
            }
          });
        }
        
        // Activity for sending
        if (quotation.sentAt) {
          activities.push({
            id: `${quotation.id || quotation._id}-sent`,
            type: 'sent',
            timestamp: quotation.sentAt,
            details: {
              emailRecipient: quotation.clientEmail
            }
          });
        }
        
        // Activity for acceptance
        if (quotation.acceptedAt) {
          activities.push({
            id: `${quotation.id || quotation._id}-accepted`,
            type: 'accepted',
            timestamp: quotation.acceptedAt
          });
        }
        
        // Activity for rejection
        if (quotation.rejectedAt) {
          activities.push({
            id: `${quotation.id || quotation._id}-rejected`,
            type: 'rejected',
            timestamp: quotation.rejectedAt
          });
        }
        
        // Activity for expiration
        if (quotation.validUntil && new Date(quotation.validUntil) < new Date() && quotation.status === 'expired') {
          activities.push({
            id: `${quotation.id || quotation._id}-expired`,
            type: 'expired',
            timestamp: quotation.validUntil
          });
        }
        
        // Activity for discount approval pending
        if (quotation.discountExceedsLimit && quotation.discountAmount > 0) {
          activities.push({
            id: `${quotation.id || quotation._id}-discount-pending`,
            type: 'discount_approval_pending',
            timestamp: quotation.createdAt || new Date(),
            details: {
              discountAmount: quotation.discountAmount,
              discountReason: quotation.discountReason
            }
          });
        }
      }
      
      // Sort by timestamp descending
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    
    res.json(activities);
  } catch (error) {
    console.error('Error fetching quotation activities:', error);
    res.status(500).json({ message: 'Failed to fetch quotation activities' });
  }
});

// Get all quotations (optionally filter by enquiryId)
router.get('/', async (req, res) => {
  try {
    const { enquiryId } = req.query;
    if (enquiryId) {
      const quotations = await storage.getQuotationsByEnquiry(enquiryId as string);
      res.json(quotations);
    } else {
      const quotations = await storage.getQuotations();
      res.json(quotations);
    }
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch quotations' });
  }
});

// Create new quotation
router.post('/', async (req, res) => {
  try {
    // Use the modified schema that accepts strings and transforms them to ObjectIds
    const validatedData = insertQuotationSchemaWithStringIds.parse(req.body);
    
    const quotation = await storage.createQuotation(validatedData);
    res.status(201).json(quotation);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Zod validation error:', JSON.stringify(error.errors, null, 2));
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: error.errors 
      });
    }
    console.error('❌ Error creating quotation:', error);
    res.status(500).json({ message: 'Failed to create quotation' });
  }
});

// Generate PDF for quotation (must come before /:id routes)
router.post('/:id/pdf', async (req, res) => {
  try {
    const quotationId = req.params.id;
    
    // Get quotation from database
    const quotation = await storage.getQuotationById(quotationId);
    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    // Generate PDF using Puppeteer
    const pdfBuffer = await generateQuotationPDF(quotation);

    // Send PDF as response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="quotation-${quotation.quotationNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ message: 'Failed to generate PDF', error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Mark quotation as sent (must come before /:id routes)
router.post('/:id/send', async (req, res) => {
  try {
    const quotation = await storage.updateQuotation(req.params.id, {
      status: 'sent',
      sentAt: new Date()
    });
    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }
    res.json({ message: 'Quotation marked as sent', quotation });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update quotation status' });
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

// Update quotation
router.patch('/:id', async (req, res) => {
  try {
    // Use the modified schema that accepts strings and transforms them to ObjectIds (partial for updates)
    const validatedData = insertQuotationSchemaWithStringIds.partial().parse(req.body);
    const quotation = await storage.updateQuotation(req.params.id, validatedData);
    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
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
    const success = await storage.deleteQuotation(req.params.id);
    if (!success) {
      return res.status(404).json({ message: 'Quotation not found' });
    }
    res.json({ message: 'Quotation deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete quotation' });
  }
});

export default router;
