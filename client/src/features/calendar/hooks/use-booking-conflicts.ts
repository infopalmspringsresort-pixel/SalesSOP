import { useMemo } from "react";
import type { BookingWithRelations } from "@/types";

interface ConflictInfo {
  hasConflicts: boolean;
  conflictingBookings: BookingWithRelations[];
  conflictDates: string[];
}

export function useBookingConflicts(bookings: BookingWithRelations[], targetBooking?: {
  eventDate: string;
  eventEndDate?: string;
  eventDuration: number;
  hall?: string;
  id?: string;
}): ConflictInfo {
  return useMemo(() => {
    if (!targetBooking) {
      return { hasConflicts: false, conflictingBookings: [], conflictDates: [] };
    }

    const targetStart = new Date(targetBooking.eventDate);
    const targetEnd = targetBooking.eventEndDate 
      ? new Date(targetBooking.eventEndDate)
      : new Date(targetStart.getTime() + (targetBooking.eventDuration - 1) * 24 * 60 * 60 * 1000);

    // Generate all target dates
    const targetDates: string[] = [];
    for (let d = new Date(targetStart); d <= targetEnd; d.setDate(d.getDate() + 1)) {
      targetDates.push(d.toISOString().split('T')[0]);
    }

    const conflictingBookings: BookingWithRelations[] = [];
    const conflictDates: string[] = [];

    for (const booking of bookings) {
      // Skip if it's the same booking (for updates)
      if (targetBooking.id && booking.id === targetBooking.id) continue;
      
      // Skip cancelled bookings
      if (booking.status === 'cancelled') continue;
      
      // Check hall conflict if both have halls specified
      const sameHall = !targetBooking.hall || !booking.hall || booking.hall === targetBooking.hall;
      if (!sameHall) continue;

      const bookingStart = new Date(booking.eventDate);
      const bookingEnd = booking.eventEndDate 
        ? new Date(booking.eventEndDate)
        : new Date(bookingStart.getTime() + (booking.eventDuration - 1) * 24 * 60 * 60 * 1000);

      // Generate booking dates
      const bookingDates: string[] = [];
      for (let d = new Date(bookingStart); d <= bookingEnd; d.setDate(d.getDate() + 1)) {
        bookingDates.push(d.toISOString().split('T')[0]);
      }

      // Check for date overlap
      const hasOverlap = targetDates.some(date => bookingDates.includes(date));
      
      if (hasOverlap) {
        conflictingBookings.push(booking);
        // Add overlapping dates to conflict dates
        const overlapping = targetDates.filter(date => bookingDates.includes(date));
        conflictDates.push(...overlapping);
      }
    }

    return {
      hasConflicts: conflictingBookings.length > 0,
      conflictingBookings,
      conflictDates: Array.from(new Set(conflictDates)), // Remove duplicates
    };
  }, [bookings, targetBooking]);
}