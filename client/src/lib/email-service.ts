import { apiRequest } from "@/lib/queryClient";
import { getWorkingQuotationPDFBlob, type WorkingQuotationPDFData } from "./working-pdf-generator";
import type { Quotation } from "@shared/schema-client";

export interface EmailQuotationRequest {
  quotationId: string;
  recipientEmail: string;
  subject?: string;
  message?: string;
  pdfData: WorkingQuotationPDFData;
}

export interface EmailQuotationResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendQuotationEmail(request: EmailQuotationRequest): Promise<EmailQuotationResponse> {
  try {
    const response = await apiRequest('POST', '/api/quotations/email/send-email', {
      quotationId: request.quotationId,
      recipientEmail: request.recipientEmail,
      subject: request.subject || `Quotation ${request.pdfData.quotationNumber}`
      // Don't pass message - let server use HTML template
    });
    
    return response;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

function getDefaultEmailMessage(quotationData: WorkingQuotationPDFData): string {
  return `
Dear ${quotationData.clientName},

Thank you for your interest in our services. Please find attached the quotation for your event.

Quotation Details:
- Quotation Number: ${quotationData.quotationNumber}
- Date: ${quotationData.quotationDate}
- Expected Guests: ${quotationData.expectedGuests || 'Not specified'}
- Grand Total: ₹${quotationData.grandTotal.toLocaleString()}
${quotationData.finalTotal && quotationData.finalTotal !== quotationData.grandTotal ? `- Final Total (After Discount): ₹${quotationData.finalTotal.toLocaleString()}` : ''}

Please review the attached quotation and let us know if you have any questions or would like to make any modifications.

We look forward to serving you and making your event memorable.

Best regards,
Palm Springs Resort
  `.trim();
}

export async function sendQuotationReminder(quotationId: string, recipientEmail: string): Promise<EmailQuotationResponse> {
  try {
    const response = await apiRequest('POST', '/api/quotations/email/send-reminder', {
      quotationId,
      recipientEmail,
    });
    
    return response;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function sendQuotationFollowUp(quotationId: string, recipientEmail: string, message: string): Promise<EmailQuotationResponse> {
  try {
    const response = await apiRequest('POST', '/api/quotations/email/send-followup', {
      quotationId,
      recipientEmail,
      message,
    });
    
    return response;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
