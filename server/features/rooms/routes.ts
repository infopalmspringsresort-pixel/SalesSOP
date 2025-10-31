import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../../storage';
import { insertRoomTypeSchema, insertVenueSchema } from '@shared/schema-mongodb';

const router = Router();

// ============================================================================
// ROOM TYPES ROUTES
// ============================================================================

// Get all room types
router.get('/types', async (req, res) => {
  try {
    const roomTypes = await storage.getRoomTypes();
    res.json(roomTypes);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch room types' });
  }
});

// Get room type by ID
router.get('/types/:id', async (req, res) => {
  try {
    const roomType = await storage.getRoomTypeById(req.params.id);
    if (!roomType) {
      return res.status(404).json({ message: 'Room type not found' });
    }
    res.json(roomType);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch room type' });
  }
});

// Create new room type
router.post('/types', async (req, res) => {
  try {
    const validatedData = insertRoomTypeSchema.parse(req.body);
    const roomType = await storage.createRoomType(validatedData);
    res.status(201).json(roomType);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: error.errors 
      });
    }
    res.status(500).json({ message: 'Failed to create room type' });
  }
});

// Update room type
router.patch('/types/:id', async (req, res) => {
  try {
    const validatedData = insertRoomTypeSchema.partial().parse(req.body);
    const roomType = await storage.updateRoomType(req.params.id, validatedData);
    if (!roomType) {
      return res.status(404).json({ message: 'Room type not found' });
    }
    res.json(roomType);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: error.errors 
      });
    }
    res.status(500).json({ message: 'Failed to update room type' });
  }
});

// Delete room type
router.delete('/types/:id', async (req, res) => {
  try {
    const success = await storage.deleteRoomType(req.params.id);
    if (!success) {
      return res.status(404).json({ message: 'Room type not found' });
    }
    res.json({ message: 'Room type deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete room type' });
  }
});

// ============================================================================
// VENUES ROUTES
// ============================================================================

// Get all venues
router.get('/venues', async (req, res) => {
  try {
    const venues = await storage.getVenues();
    res.json(venues);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch venues' });
  }
});

// Get venue by ID
router.get('/venues/:id', async (req, res) => {
  try {
    const venue = await storage.getVenueById(req.params.id);
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }
    res.json(venue);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch venue' });
  }
});

// Create new venue
router.post('/venues', async (req, res) => {
  try {
    const validatedData = insertVenueSchema.parse(req.body);
    const venue = await storage.createVenue(validatedData);
    res.status(201).json(venue);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: error.errors 
      });
    }
    res.status(500).json({ message: 'Failed to create venue' });
  }
});

// Update venue
router.patch('/venues/:id', async (req, res) => {
  try {
    const validatedData = insertVenueSchema.partial().parse(req.body);
    const venue = await storage.updateVenue(req.params.id, validatedData);
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }
    res.json(venue);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: error.errors 
      });
    }
    res.status(500).json({ message: 'Failed to update venue' });
  }
});

// Delete venue
router.delete('/venues/:id', async (req, res) => {
  try {
    const success = await storage.deleteVenue(req.params.id);
    if (!success) {
      return res.status(404).json({ message: 'Venue not found' });
    }
    res.json({ message: 'Venue deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete venue' });
  }
});

export default router;
