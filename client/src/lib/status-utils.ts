// Centralized status color and label management

export type EnquiryStatus = 
  | 'new' 
  | 'quotation_sent' 
  | 'ongoing' 
  | 'converted' 
  | 'booked' 
  | 'closed' 
  | 'lost';

export type BookingStatus =
  | 'booked'
  | 'pending_beo'
  | 'beo_ready'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'closed';

export type BeoStatus = 
  | 'draft' 
  | 'pending_verification' 
  | 'approved' 
  | 'rejected';

// Centralized color mapping for all statuses
export const getStatusColor = (status: string): string => {
  switch (status) {
    // Enquiry statuses
    case 'new': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'quotation_sent': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'ongoing': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'converted': return 'bg-teal-100 text-teal-800 border-teal-200';
    case 'booked': return 'bg-green-100 text-green-800 border-green-200';
    case 'lost': return 'bg-red-100 text-red-800 border-red-200';
    
    // Booking statuses
    case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
    case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200';
    
    // BEO statuses
    case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'pending_verification': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'approved': return 'bg-green-100 text-green-800 border-green-200';
    case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
    
    // Default fallback
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

// Centralized label mapping for all statuses
export const getStatusLabel = (status: string): string => {
  switch (status) {
    // Enquiry statuses
    case 'new': return 'New';
    case 'quotation_sent': return 'Quotation Sent';
    case 'ongoing': return 'Ongoing';
    case 'converted': return 'Converted';
    case 'booked': return 'Booked';
    case 'closed': return 'Closed';
    case 'lost': return 'Lost';
    
    // Booking statuses
    case 'cancelled': return 'Cancelled';
    
    // BEO statuses
    case 'draft': return 'Draft';
    case 'pending_verification': return 'Pending Verification';
    case 'approved': return 'Approved';
    case 'rejected': return 'Rejected';
    
    // Default fallback
    default: return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
  }
};

// Status filter options for enquiries
export const enquiryStatusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'new', label: 'New' },
  { value: 'quotation_sent', label: 'Quotation Sent' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'converted', label: 'Converted' },
  { value: 'booked', label: 'Booked' },
  { value: 'closed', label: 'Closed' },
  { value: 'lost', label: 'Lost' },
];

// Status filter options for bookings - include all booking statuses
export const bookingStatusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'booked', label: 'Booked' },
  { value: 'pending_beo', label: 'Pending BEO' },
  { value: 'beo_ready', label: 'BEO Ready' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'closed', label: 'Closed' },
];

// Status update options for booking dialog - restricted to only closed and cancelled
export const bookingUpdateOptions = [
  { value: 'closed', label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' },
];

// Event type labels
export const getEventTypeLabel = (eventType: string): string => {
  switch (eventType) {
    case 'wedding': return 'Wedding';
    case 'corporate': return 'Corporate';
    case 'birthday': return 'Birthday';
    case 'anniversary': return 'Anniversary';
    case 'social': return 'Social';
    case 'conference': return 'Conference';
    case 'other': return 'Other';
    default: return 'Other';
  }
};

// Status transition rules
export const getValidNextStatuses = (currentStatus: string): string[] => {
  switch (currentStatus) {
    case 'new': return ['quotation_sent', 'ongoing', 'lost'];
    case 'quotation_sent': return ['ongoing', 'converted', 'lost'];
    case 'ongoing': return ['quotation_sent', 'converted', 'lost'];
    case 'converted': return ['booked'];
    case 'booked': return ['closed', 'cancelled'];
    case 'closed': return [];
    case 'cancelled': return [];
    case 'lost': return [];
    default: return [];
  }
};

// Check if status transition is valid
export const canTransitionToStatus = (currentStatus: string, targetStatus: string): boolean => {
  const validNext = getValidNextStatuses(currentStatus);
  return validNext.includes(targetStatus);
};