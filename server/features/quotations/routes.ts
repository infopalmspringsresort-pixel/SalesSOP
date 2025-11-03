import { Router } from 'express';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { storage } from '../../storage';
import { insertQuotationPackageSchema, insertQuotationSchema } from '@shared/schema-mongodb';

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

// Get all quotations
router.get('/', async (req, res) => {
  try {
    const quotations = await storage.getQuotations();
    res.json(quotations);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch quotations' });
  }
});

// Create new quotation
router.post('/', async (req, res) => {
  try {
    // Log incoming request for debugging
    console.log('📥 Received quotation data:', JSON.stringify({
      ...req.body,
      menuPackages: req.body.menuPackages?.map((pkg: any) => ({
        id: pkg.id,
        name: pkg.name,
        selectedItemsCount: pkg.selectedItems?.length || 0,
        customItemsCount: pkg.customItems?.length || 0,
        selectedItems: pkg.selectedItems,
        customItems: pkg.customItems
      }))
    }, null, 2));
    
    // Use the modified schema that accepts strings and transforms them to ObjectIds
    const validatedData = insertQuotationSchemaWithStringIds.parse(req.body);
    
    // Log validated data to ensure menuPackages arrays are preserved
    console.log('✅ Validated data menuPackages:', JSON.stringify({
      menuPackages: validatedData.menuPackages?.map((pkg: any) => ({
        id: pkg.id,
        name: pkg.name,
        selectedItemsCount: pkg.selectedItems?.length || 0,
        customItemsCount: pkg.customItems?.length || 0,
        selectedItems: pkg.selectedItems,
        customItems: pkg.customItems
      }))
    }, null, 2));
    
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
