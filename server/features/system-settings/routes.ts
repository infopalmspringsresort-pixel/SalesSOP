import { Express, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getCollection } from '../../mongo';
import { isAuthenticated } from '../../auth';
import { requirePermission, loadUserPermissions } from '../../middleware/rbac';

export function registerSystemSettingsRoutes(app: Express) {
  
  // Get system settings (default or existing)
  app.get('/api/system-settings', isAuthenticated, loadUserPermissions, async (req: Request, res: Response) => {
    try {
      const collection = await getCollection('system_settings');
      let settings = await collection.findOne({});
      
      // If no settings exist, create default settings
      if (!settings) {
        const defaultSettings = {
          _id: new ObjectId(),
          maxDiscountPercentage: 10,
          updatedAt: new Date()
        };
        
        await collection.insertOne(defaultSettings);
        settings = defaultSettings;
      }
      
      res.json(settings);
    } catch (error: any) {
      console.error('Error fetching system settings:', error);
      // Return default settings if database error
      res.json({
        maxDiscountPercentage: 10
      });
    }
  });
  
  // Update system settings (admin only)
  app.put('/api/system-settings', 
    isAuthenticated, 
    loadUserPermissions,
    requirePermission('settings', 'update'),
    async (req: Request, res: Response) => {
      try {
        const { maxDiscountPercentage } = req.body;
        const userId = (req as any).user?.id;
        
        const collection = await getCollection('system_settings');
        
        const updateData = {
          maxDiscountPercentage,
          updatedBy: new ObjectId(userId),
          updatedAt: new Date()
        };
        
        // Find existing settings
        const existingSettings = await collection.findOne({});
        
        if (existingSettings) {
          // Update existing
          await collection.updateOne(
            { _id: existingSettings._id },
            { $set: updateData }
          );
        } else {
          // Create new with _id
          await collection.insertOne({
            _id: new ObjectId(),
            ...updateData
          });
        }
        
        const updatedSettings = await collection.findOne({});
        res.json(updatedSettings);
      } catch (error: any) {
        console.error('Error updating system settings:', error);
        res.status(500).json({ 
          message: 'Failed to update system settings', 
          error: error.message 
        });
      }
    }
  );
  
  // Check if discount exceeds limits (for notification)
  app.post('/api/system-settings/check-discount', 
    isAuthenticated, 
    loadUserPermissions,
    async (req: Request, res: Response) => {
      try {
        const { discountType, discountValue, grandTotal } = req.body;
        
        // Get current system settings
        const collection = await getCollection('system_settings');
        const settings = await collection.findOne({});
        const maxPercentage = settings?.maxDiscountPercentage || 10;
        
        const discountAmount = (grandTotal * discountValue) / 100;
        const exceedsLimit = discountValue > maxPercentage;
        
        const reason = exceedsLimit ? `Discount percentage (${discountValue}%) exceeds notification threshold (${maxPercentage}%)` : '';
        
        res.json({
          exceedsLimit,
          reason,
          discountAmount,
          maxDiscountPercentage: maxPercentage
        });
      } catch (error: any) {
        console.error('Error checking discount:', error);
        res.status(500).json({ 
          message: 'Failed to check discount', 
          error: error.message 
        });
      }
    }
  );
}

