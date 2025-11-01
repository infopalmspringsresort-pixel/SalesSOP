import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Send, User, Phone, Mail, MapPin, MessageSquare } from "lucide-react";
import { z } from "zod";
import { CityInputAutocomplete } from "@/components/ui/city-autocomplete";

// Simplified schema for public enquiry form
const publicEnquirySchema = z.object({
  clientName: z.string().min(2, "Name must be at least 2 characters"),
  contactNumber: z.string().min(10, "Please enter a valid phone number"),
  email: z.string().email("Please enter a valid email address").optional().or(z.literal("")),
  city: z.string().optional(),
  eventType: z.string().min(1, "Please select an event type"),
});

type PublicEnquiryData = z.infer<typeof publicEnquirySchema>;

interface PublicEnquiryFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function PublicEnquiryForm({ onSuccess, onError }: PublicEnquiryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<PublicEnquiryData>({
    resolver: zodResolver(publicEnquirySchema),
    defaultValues: {
      clientName: "",
      contactNumber: "",
      email: "",
      city: "",
      eventType: "",
    },
  });

  const onSubmit = async (data: PublicEnquiryData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/public/enquiries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          source: 'social_media',
          sourceNotes: 'Submitted via public enquiry form',
          enquiryDate: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to submit enquiry');
      }

      const result = await response.json();
      setIsSubmitted(true);
      onSuccess?.();
    } catch (error) {
      console.error('Enquiry submission error:', error);
      onError?.(error instanceof Error ? error.message : 'Failed to submit enquiry');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-900">Enquiry Submitted Successfully!</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Thank you for your interest! Our team will contact you within 24 hours to discuss your event requirements.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Event Enquiry Form
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Tell us about your upcoming event and we'll get back to you!
        </p>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Name */}
            <FormField
              control={form.control}
              name="clientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Full Name *
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Phone */}
            <FormField
              control={form.control}
              name="contactNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone Number *
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your phone number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email Address
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your email (optional)" type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* City */}
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    City
                  </FormLabel>
                  <FormControl>
                    <CityInputAutocomplete
                      value={field.value || ""}
                      onChange={field.onChange}
                      placeholder="Select or type city (optional)"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Event Type */}
            <FormField
              control={form.control}
              name="eventType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Type *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select event type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="wedding">Wedding</SelectItem>
                      <SelectItem value="corporate">Corporate Event</SelectItem>
                      <SelectItem value="birthday">Birthday Party</SelectItem>
                      <SelectItem value="anniversary">Anniversary</SelectItem>
                      <SelectItem value="conference">Conference</SelectItem>
                      <SelectItem value="exhibition">Exhibition</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />


            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Enquiry
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
