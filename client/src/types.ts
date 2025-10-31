import type { Enquiry, User, Booking, Beo, Quotation, Approval, Payment, Amendment } from "@shared/schema-client";

export interface EnquiryWithRelations extends Enquiry {
  salesperson?: User;
  quotations?: Quotation[];
  bookings?: Booking[];
}

export interface BookingWithRelations extends Booking {
  enquiry?: Enquiry;
  quotation?: Quotation;
  beos?: Beo[];
  payments?: Payment[];
  amendments?: Amendment[];
}

export interface ApprovalWithRelations extends Approval {
  requestedBy?: User;
  approver?: User;
}

export interface PaymentWithRelations extends Payment {
  booking?: Booking;
  collectedBy?: User;
  verifiedBy?: User;
}

export interface BeoWithRelations extends Beo {
  booking?: Booking;
  createdBy?: User;
  verifiedBy?: User;
}