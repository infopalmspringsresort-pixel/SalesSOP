import type { Express } from "express";
import { storage } from "../../storage";
import { z } from "zod";

// Schema for public enquiry submission
const publicEnquirySchema = z.object({
  clientName: z.string().min(1, "Name is required"),
  contactNumber: z.string().min(1, "Contact number is required"),
  email: z.string().email().optional().or(z.literal("")),
  city: z.string().optional(),
  eventType: z.string().min(1, "Event type is required"),
  source: z.string().default("social_media"),
  sourceNotes: z.string().optional(),
  enquiryDate: z.string(),
});

export function registerPublicRoutes(app: Express) {
  console.log("Registering public routes...");
  
  // Public enquiry submission (no authentication required)
  app.post("/api/public/enquiries", async (req, res) => {
    console.log("POST /api/public/enquiries received:", req.body);
    try {
      // Validate the incoming data
      const validatedData = publicEnquirySchema.parse(req.body);

      // Convert string dates to Date objects
      const enquiryData = {
        ...validatedData,
        enquiryDate: new Date(validatedData.enquiryDate),
        email: validatedData.email || null,
        city: validatedData.city || null,
        // Set default values for public enquiries
        assignmentStatus: 'unassigned' as const,
        status: 'new' as const,
        createdBy: 'public_form',
        salespersonId: null,
      };

      // Create the enquiry
      const enquiry = await storage.createEnquiry(enquiryData);

      res.status(201).json({
        success: true,
        message: "Enquiry submitted successfully",
        data: {
          enquiryNumber: enquiry.enquiryNumber,
          id: enquiry.id,
        },
      });
    } catch (error) {
      console.error("Public enquiry submission error:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Invalid data provided",
          errors: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to submit enquiry. Please try again later.",
      });
    }
  });

  // Get public enquiry status (optional - for tracking)
  app.get("/api/public/enquiries/:enquiryNumber", async (req, res) => {
    try {
      const { enquiryNumber } = req.params;
      
      // Get enquiry by enquiry number
      const enquiries = await storage.getEnquiries();
      const enquiry = enquiries.find(e => e.enquiryNumber === enquiryNumber);
      
      if (!enquiry) {
        return res.status(404).json({
          success: false,
          message: "Enquiry not found",
        });
      }

      // Return limited information for public access
      res.json({
        success: true,
        data: {
          enquiryNumber: enquiry.enquiryNumber,
          status: enquiry.status,
          enquiryDate: enquiry.enquiryDate,
          clientName: enquiry.clientName,
          eventType: enquiry.eventType,
          expectedPax: enquiry.expectedPax,
          eventDate: enquiry.eventDate,
        },
      });
    } catch (error) {
      console.error("Public enquiry lookup error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve enquiry information",
      });
    }
  });
}
