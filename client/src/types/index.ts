export interface DashboardMetrics {
  activeEnquiries: number;
  bookedBookings: number;
  pendingApprovals: number;
  monthlyRevenue: number;
}

export interface EnquiryWithRelations {
  id: string;
  enquiryNumber: string;
  enquiryDate: string;
  clientName: string;
  contactNumber: string;
  email?: string;
  eventType: string;
  eventDate?: string;
  expectedPax?: number;
  source: string;
  status: string;
  notes?: string;
  followUpDate?: string;
  followUpTime?: string;
  followUpNotes?: string;
  repeatFollowUp?: boolean;
  repeatInterval?: number;
  repeatEndDate?: string;
  createdAt: string;
  updatedAt: string;
  salesperson?: {
    firstName?: string;
    lastName?: string;
  };
}

export interface BookingWithRelations {
  id: string;
  bookingNumber: string;
  clientName: string;
  contactNumber: string;
  email?: string;
  eventType: string;
  eventDate: string;
  eventEndDate?: string;
  eventStartTime?: string;
  eventEndTime?: string;
  confirmedPax: number;
  hall?: string;
  totalAmount: string;
  advanceAmount: string;
  balanceAmount: string;
  status: string | null;
  contractSigned: boolean;
  salesperson?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  enquiryNumber?: string;
  enquirySource?: string;
  sessions?: BookingSessionWithDetails[];
  enquiry?: {
    enquiryNumber: string;
  };
}

export interface BookingSessionWithDetails {
  id: string;
  bookingId: string;
  sessionName: string;
  sessionLabel?: string;
  venue: string;
  startTime: string;
  endTime: string;
  sessionDate: string;
  paxCount?: number;
  specialInstructions?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BeoWithRelations {
  id: string;
  beoNumber: string;
  menuItems?: any;
  serviceRequirements?: string;
  avRequirements?: string;
  setupInstructions?: string;
  specialInstructions?: string;
  status: string;
  createdAt: string;
  verifiedAt?: string;
  booking?: {
    bookingNumber: string;
    clientName: string;
    eventDate: string;
  };
  createdBy?: {
    firstName?: string;
    lastName?: string;
  };
  verifiedBy?: {
    firstName?: string;
    lastName?: string;
  };
}

