import { Router } from 'express';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { storage } from '../../storage';
import { insertMenuPackageSchema, insertMenuItemSchema, insertAdditionalItemSchema } from '@shared/schema-mongodb';

const router = Router();

// ============================================================================
// MENU PACKAGES ROUTES
// ============================================================================

// Get all menu packages
router.get('/packages', async (req, res) => {
  try {
    const packages = await storage.getMenuPackages();
    res.json(packages);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch menu packages' });
  }
});

// Get menu package by ID
router.get('/packages/:id', async (req, res) => {
  try {
    const package_ = await storage.getMenuPackageById(req.params.id);
    if (!package_) {
      return res.status(404).json({ message: 'Menu package not found' });
    }
    res.json(package_);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch menu package' });
  }
});

// Create new menu package
router.post('/packages', async (req, res) => {
  try {
    const validatedData = insertMenuPackageSchema.parse(req.body);
    // Price is now manually set by the user
    const package_ = await storage.createMenuPackage(validatedData);
    res.status(201).json(package_);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: error.errors 
      });
    }
    res.status(500).json({ message: 'Failed to create menu package' });
  }
});

// Update menu package
router.patch('/packages/:id', async (req, res) => {
  try {
    const validatedData = insertMenuPackageSchema.partial().parse(req.body);
    const package_ = await storage.updateMenuPackage(req.params.id, validatedData);
    if (!package_) {
      return res.status(404).json({ message: 'Menu package not found' });
    }
    res.json(package_);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: error.errors 
      });
    }
    res.status(500).json({ message: 'Failed to update menu package' });
  }
});

// Delete menu package
router.delete('/packages/:id', async (req, res) => {
  try {
    const success = await storage.deleteMenuPackage(req.params.id);
    if (!success) {
      return res.status(404).json({ message: 'Menu package not found' });
    }
    res.json({ message: 'Menu package deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete menu package' });
  }
});


// ============================================================================
// MENU ITEMS ROUTES
// ============================================================================

// Get all menu items
router.get('/items', async (req, res) => {
  try {
    const items = await storage.getMenuItems();
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch menu items' });
  }
});

// Get menu items by package ID
router.get('/items/package/:packageId', async (req, res) => {
  try {
    const items = await storage.getMenuItemsByPackage(req.params.packageId);
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch menu items' });
  }
});

// Get menu item by ID
router.get('/items/:id', async (req, res) => {
  try {
    const item = await storage.getMenuItemById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Menu item not found' });
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch menu item' });
  }
});

// Create new menu item
router.post('/items', async (req, res) => {
  try {
    // Convert string packageId to ObjectId before validation
    const dataToValidate = {
      ...req.body,
      packageId: new ObjectId(req.body.packageId)
    };
    
    const validatedData = insertMenuItemSchema.parse(dataToValidate);

    // Enforce veg-only items for veg packages
    if (validatedData.packageId) {
      const pkg = await storage.getMenuPackageById(validatedData.packageId.toString());
      if (pkg && pkg.type === 'veg' && validatedData.isVeg === false) {
        return res.status(400).json({ message: 'Cannot add non-veg item to a veg package' });
      }
    }
    const item = await storage.createMenuItem(validatedData);
    res.status(201).json(item);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: error.errors 
      });
    }
    res.status(500).json({ message: 'Failed to create menu item' });
  }
});

// Update menu item
router.patch('/items/:id', async (req, res) => {
  try {
    // Convert string packageId to ObjectId if it exists in the request
    const dataToValidate = { ...req.body };
    if (req.body.packageId) {
      dataToValidate.packageId = new ObjectId(req.body.packageId);
    }
    
    const validatedData = insertMenuItemSchema.partial().parse(dataToValidate);
    // Enforce veg-only items for veg packages on update
    const targetPackageId = (validatedData as any).packageId || (await storage.getMenuItemById(req.params.id))?.packageId;
    if (targetPackageId) {
      const pkg = await storage.getMenuPackageById(targetPackageId.toString());
      const isVegFlag = (validatedData as any).isVeg;
      if (pkg && pkg.type === 'veg' && isVegFlag === false) {
        return res.status(400).json({ message: 'Cannot set item to non-veg in a veg package' });
      }
    }
    const item = await storage.updateMenuItem(req.params.id, validatedData);
    if (!item) {
      return res.status(404).json({ message: 'Menu item not found' });
    }
    res.json(item);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: error.errors 
      });
    }
    res.status(500).json({ message: 'Failed to update menu item' });
  }
});

// Delete menu item
router.delete('/items/:id', async (req, res) => {
  try {
    const success = await storage.deleteMenuItem(req.params.id);
    if (!success) {
      return res.status(404).json({ message: 'Menu item not found' });
    }
    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete menu item' });
  }
});

// ============================================================================
// ADDITIONAL ITEMS ROUTES
// ============================================================================

// Get all additional items
router.get('/additional-items', async (req, res) => {
  try {
    const items = await storage.getAdditionalItems();
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch additional items' });
  }
});

// Get additional item by ID
router.get('/additional-items/:id', async (req, res) => {
  try {
    const item = await storage.getAdditionalItemById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Additional item not found' });
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch additional item' });
  }
});

// Create new additional item
router.post('/additional-items', async (req, res) => {
  try {
    const validatedData = insertAdditionalItemSchema.parse(req.body);
    const item = await storage.createAdditionalItem(validatedData);
    res.status(201).json(item);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: error.errors 
      });
    }
    res.status(500).json({ message: 'Failed to create additional item' });
  }
});

// Update additional item
router.patch('/additional-items/:id', async (req, res) => {
  try {
    const validatedData = insertAdditionalItemSchema.partial().parse(req.body);
    const item = await storage.updateAdditionalItem(req.params.id, validatedData);
    if (!item) {
      return res.status(404).json({ message: 'Additional item not found' });
    }
    res.json(item);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: error.errors 
      });
    }
    res.status(500).json({ message: 'Failed to update additional item' });
  }
});

// Delete additional item
router.delete('/additional-items/:id', async (req, res) => {
  try {
    const success = await storage.deleteAdditionalItem(req.params.id);
    if (!success) {
      return res.status(404).json({ message: 'Additional item not found' });
    }
    res.json({ message: 'Additional item deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete additional item' });
  }
});

export default router;

