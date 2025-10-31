// Timezone utilities for consistent IST handling across the application

export const INDIAN_TIMEZONE = 'Asia/Kolkata';

/**
 * Convert a UTC date to Indian Standard Time
 */
export function toIST(date: Date | string): Date {
  const utcDate = typeof date === 'string' ? new Date(date) : date;
  return new Date(utcDate.toLocaleString('en-US', { timeZone: INDIAN_TIMEZONE }));
}

/**
 * Format a date in Indian timezone
 */
export function formatIST(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const utcDate = typeof date === 'string' ? new Date(date) : date;
  return utcDate.toLocaleString('en-IN', {
    timeZone: INDIAN_TIMEZONE,
    ...options
  });
}

/**
 * Get current time in IST
 */
export function nowIST(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: INDIAN_TIMEZONE }));
}

/**
 * Create a date with time in IST timezone
 */
export function createISTDateTime(date: Date, timeString: string): Date {
  const [hours, minutes] = timeString.split(':').map(Number);
  const istDate = new Date(date.toLocaleString('en-US', { timeZone: INDIAN_TIMEZONE }));
  istDate.setHours(hours, minutes, 0, 0);
  return istDate;
}

/**
 * Check if a follow-up time is overdue in IST
 */
export function isFollowUpOverdue(followUpDate: Date | string, followUpTime: string): boolean {
  const followUpDateObj = typeof followUpDate === 'string' ? new Date(followUpDate) : followUpDate;
  const currentIST = nowIST();
  const todayDate = new Date(currentIST.getFullYear(), currentIST.getMonth(), currentIST.getDate());
  const followUpDateOnly = new Date(followUpDateObj.getFullYear(), followUpDateObj.getMonth(), followUpDateObj.getDate());
  
  // If date is before today, it's overdue
  if (followUpDateOnly.getTime() < todayDate.getTime()) {
    return true;
  }
  
  // If date is today, check time
  if (followUpDateOnly.getTime() === todayDate.getTime()) {
    const followUpDateTime = createISTDateTime(followUpDateObj, followUpTime);
    return followUpDateTime.getTime() < currentIST.getTime();
  }
  
  // Future dates are not overdue
  return false;
}

export function categorizeFollowUp(followUpDate: Date | string, followUpTime: string, completed: boolean = false): 'completed' | 'overdue' | 'today' | 'upcoming' | 'future' {
  if (completed) return 'completed';
  
  const followUpDateObj = typeof followUpDate === 'string' ? new Date(followUpDate) : followUpDate;
  const currentIST = nowIST();
  const todayDate = new Date(currentIST.getFullYear(), currentIST.getMonth(), currentIST.getDate());
  const followUpDateOnly = new Date(followUpDateObj.getFullYear(), followUpDateObj.getMonth(), followUpDateObj.getDate());
  const nextWeek = new Date(todayDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  // Check if it's overdue
  if (isFollowUpOverdue(followUpDate, followUpTime)) {
    return 'overdue';
  }
  
  // Check if it's today
  if (followUpDateOnly.getTime() === todayDate.getTime()) {
    return 'today';
  }
  
  // Check if it's in the next 7 days
  if (followUpDateOnly.getTime() > todayDate.getTime() && followUpDateOnly.getTime() <= nextWeek.getTime()) {
    return 'upcoming';
  }
  
  return 'future';
}