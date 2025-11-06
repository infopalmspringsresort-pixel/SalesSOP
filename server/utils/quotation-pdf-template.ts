import * as fs from 'fs';
import * as path from 'path';

// Brand colors from FPDF code
const PRIMARY_GOLD = '#B49546'; // rgb(180, 149, 70)
const FADED_GOLD = '#E6D5A3';  // rgb(230, 213, 163)
const ZEBRA_GRAY = '#F5F5F5';  // rgb(245, 245, 245)
const TITLE_GOLD = '#554614';  // rgb(85, 70, 20)
const TITLE_GRAY = '#3C3C3C';  // rgb(60, 60, 60)
const BODY_TEXT = '#282828';   // rgb(40, 40, 40)
const FOOTER_GRAY = '#787878'; // rgb(120, 120, 120)

// Helper function to get logo as base64
function getLogoBase64(): string {
  try {
    // Get directory path using import.meta.url (ES modules) or __dirname (CommonJS)
    let currentDir: string;
    try {
      // Try ES modules approach first
      if (typeof import.meta !== 'undefined' && import.meta.url) {
        const fileUrl = new URL(import.meta.url);
        let filePath = fileUrl.pathname;
        // On Windows, remove leading slash from path
        if (process.platform === 'win32' && filePath.startsWith('/')) {
          filePath = filePath.substring(1);
        }
        currentDir = path.dirname(filePath);
      } else if (typeof __dirname !== 'undefined') {
        // Fallback to __dirname (CommonJS)
        currentDir = __dirname;
      } else {
        // If both fail, use process.cwd()
        currentDir = process.cwd();
      }
    } catch {
      // If both fail, use process.cwd()
      currentDir = process.cwd();
    }

    // Try multiple possible paths
    const possiblePaths = [
      // From project root (when running from root) - most common case
      path.join(process.cwd(), 'attached_assets', 'Palm Springs Logo resort_1756665272163.png'),
      // From server/utils directory (go up 2 levels from server/utils)
      path.join(currentDir, '..', '..', 'attached_assets', 'Palm Springs Logo resort_1756665272163.png'),
      // From server directory (one level up)
      path.join(currentDir, '..', 'attached_assets', 'Palm Springs Logo resort_1756665272163.png'),
      // Also try alternative logo files
      path.join(process.cwd(), 'attached_assets', 'Palm Springs Logo resort_1756665242611.png'),
      path.join(currentDir, '..', '..', 'attached_assets', 'Palm Springs Logo resort_1756665242611.png'),
    ];
    
    for (const logoPath of possiblePaths) {
      try {
        const normalizedPath = path.normalize(logoPath);
        if (fs.existsSync(normalizedPath)) {
          const imageBuffer = fs.readFileSync(normalizedPath);
          const base64 = imageBuffer.toString('base64');
          const dataUri = `data:image/png;base64,${base64}`;
          // Verify the data URI is valid (should be at least 100 chars for a real image)
          if (dataUri.length > 100 && dataUri.startsWith('data:image/png;base64,')) {
            return dataUri;
          }
        }
      } catch (err) {
        // Continue to next path
        continue;
      }
    }
  } catch (error) {
    // Logo not found, will use text fallback
    // Don't log in production to avoid noise
  }
  return '';
}

export function generateQuotationHTML(quotation: any): string {
  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  // Get base totals (before discount and GST)
  const venueBaseTotal = quotation.venueRentalItems?.reduce((sum: number, item: any) => sum + (Number(item.sessionRate) || 0), 0) || 0;
  const roomBaseTotal = quotation.roomPackages?.reduce((sum: number, item: any) => {
    const rate = Number(item.rate) || 0;
    const numRooms = Number(item.numberOfRooms) || Number(item.requestedRooms) || 1;
    const baseRoomAmount = rate * numRooms;
    // Include extra person charges if available
    const extraPersons = Math.max(0, (Number(item.totalOccupancy) || 0) - ((item.defaultOccupancy || 2) * numRooms));
    const extraPersonCharges = extraPersons * (Number(item.extraPersonRate) || 0);
    return sum + baseRoomAmount + extraPersonCharges;
  }, 0) || 0;
  const menuBaseTotal = quotation.menuPackages?.reduce((sum: number, pkg: any) => {
    const packagePrice = Number(pkg.price) || 0;
    const guestCount = Number(pkg.guestCount) || Number(pkg.quantity) || quotation.expectedGuests || 0;
    const basePackageTotal = packagePrice * guestCount;
    // Add additional items if any
    const additionalTotal = (pkg.selectedItems || []).reduce((itemSum: number, item: any) => {
      if (!item.isPackageItem && item.additionalPrice) {
        const qty = Number(item.quantity) || 1;
        return itemSum + (Number(item.additionalPrice) * qty);
      }
      return itemSum;
    }, 0);
    return sum + basePackageTotal + additionalTotal;
  }, 0) || 0;
  
  const totalBase = venueBaseTotal + roomBaseTotal + menuBaseTotal;
  
  // Apply discount on base prices
  const discountAmount = quotation.discountAmount || 0;
  const discountType = quotation.discountType || 'percentage';
  const discountValue = quotation.discountValue || 0;
  
  // Calculate discount per category (proportional if fixed discount)
  let venueDiscountAmount = 0;
  let roomDiscountAmount = 0;
  let menuDiscountAmount = 0;
  
  if (discountAmount > 0 && totalBase > 0) {
    if (discountType === 'percentage') {
      venueDiscountAmount = (venueBaseTotal * discountValue) / 100;
      roomDiscountAmount = (roomBaseTotal * discountValue) / 100;
      menuDiscountAmount = (menuBaseTotal * discountValue) / 100;
    } else {
      // Fixed discount - distribute proportionally
      const discountRatio = Math.min(discountAmount, totalBase) / totalBase;
      venueDiscountAmount = venueBaseTotal * discountRatio;
      roomDiscountAmount = roomBaseTotal * discountRatio;
      menuDiscountAmount = menuBaseTotal * discountRatio;
    }
  }
  
  // Base amounts after discount
  const venueBaseAfterDiscount = venueBaseTotal - venueDiscountAmount;
  const roomBaseAfterDiscount = roomBaseTotal - roomDiscountAmount;
  const menuBaseAfterDiscount = menuBaseTotal - menuDiscountAmount;
  const subtotalAfterDiscount = venueBaseAfterDiscount + roomBaseAfterDiscount + menuBaseAfterDiscount;
  
  // Calculate GST on discounted amounts (per category rules)
  const includeGST = quotation.includeGST || false;
  
  // GST calculation helper
  const calculateGST = (amount: number, itemType: 'venue' | 'room' | 'menu', roomRate?: number) => {
    if (!includeGST) return 0;
    switch (itemType) {
      case 'venue':
        return amount * 0.18; // 18% GST for venue
      case 'room':
        // 5% GST if room rate <= ₹7,500, else 18% GST
        const gstRate = (roomRate && roomRate > 7500) ? 0.18 : 0.05;
        return amount * gstRate;
      case 'menu':
        return amount * 0.18; // 18% GST for menu
      default:
        return 0;
    }
  };
  
  // Calculate GST per category
  const venueGST = calculateGST(venueBaseAfterDiscount, 'venue');
  const roomGST = quotation.roomPackages?.reduce((sum: number, item: any) => {
    const rate = Number(item.rate) || 0;
    const numRooms = Number(item.numberOfRooms) || Number(item.requestedRooms) || 1;
    const baseRoomAmount = rate * numRooms;
    const extraPersons = Math.max(0, (Number(item.totalOccupancy) || 0) - ((item.defaultOccupancy || 2) * numRooms));
    const extraPersonCharges = extraPersons * (Number(item.extraPersonRate) || 0);
    const itemBaseTotal = baseRoomAmount + extraPersonCharges;
    const itemDiscount = roomBaseTotal > 0 ? (itemBaseTotal * roomDiscountAmount / roomBaseTotal) : 0;
    const itemBaseAfterDiscount = itemBaseTotal - itemDiscount;
    return sum + calculateGST(itemBaseAfterDiscount, 'room', rate);
  }, 0) || 0;
  const menuGST = calculateGST(menuBaseAfterDiscount, 'menu');
  
  const totalGST = venueGST + roomGST + menuGST;
  
  // Final totals (with GST)
  const venueRentalTotal = venueBaseAfterDiscount + venueGST;
  const roomQuotationTotal = roomBaseAfterDiscount + roomGST;
  const menuTotal = menuBaseAfterDiscount + menuGST;
  const grandTotal = venueRentalTotal + roomQuotationTotal + menuTotal;
  const finalTotal = quotation.finalTotal || grandTotal;

  // Check if quotation has food
  const menuPackages = quotation.menuPackages || [];
  const hasFood = menuPackages.length > 0 || menuTotal > 0 || (quotation.quotationType && quotation.quotationType.includes('food'));

  // Get logo
  const logoBase64 = getLogoBase64();
  // Debug: Log if logo was found (remove in production)
  if (!logoBase64) {
    console.warn('[PDF] Logo not found - will render without logo');
  } else {
    console.log('[PDF] Logo loaded successfully, length:', logoBase64.length);
  }

  // Group venue rental items by event date
  const venueRentalItems = quotation.venueRentalItems || [];
  const venuesByDay: { [key: string]: any[] } = {};
  venueRentalItems.forEach((venue: any) => {
    const dateKey = venue.eventDate || 'unknown';
    if (!venuesByDay[dateKey]) {
      venuesByDay[dateKey] = [];
    }
    venuesByDay[dateKey].push(venue);
  });
  const sortedVenueDays = Object.keys(venuesByDay).sort((a, b) => {
    try {
      return new Date(a).getTime() - new Date(b).getTime();
    } catch {
      return 0;
    }
  });

  // Group room packages by event date
  const roomPackages = quotation.roomPackages || [];
  const roomsByDay: { [key: string]: any[] } = {};
  roomPackages.forEach((room: any) => {
    const dateKey = room.eventDate || quotation.eventDate || 'unknown';
    if (!roomsByDay[dateKey]) {
      roomsByDay[dateKey] = [];
    }
    roomsByDay[dateKey].push(room);
  });
  const sortedRoomDays = Object.keys(roomsByDay).sort((a, b) => {
    try {
      return new Date(a).getTime() - new Date(b).getTime();
    } catch {
      return 0;
    }
  });
  
  if (sortedRoomDays.length === 0 && roomPackages.length > 0) {
    roomsByDay[quotation.eventDate || 'unknown'] = roomPackages;
    sortedRoomDays.push(quotation.eventDate || 'unknown');
  }

  // Calculate room totals by day
  const roomTotalsByDay: { [key: string]: { totalRooms: number; totalOccupancy: number; subtotal: number } } = {};
  sortedRoomDays.forEach((day) => {
    const rooms = roomsByDay[day];
    const totalRooms = rooms.reduce((sum: number, r: any) => sum + (Number(r.numberOfRooms) || Number(r.requestedRooms) || 1), 0);
    const totalOccupancy = rooms.reduce((sum: number, r: any) => sum + (Number(r.totalOccupancy) || 0), 0);
    const subtotal = rooms.reduce((sum: number, r: any) => {
      const rate = Number(r.rate) || 0;
      const numRooms = Number(r.numberOfRooms) || Number(r.requestedRooms) || 1;
      return sum + (rate * numRooms);
    }, 0);
    roomTotalsByDay[day] = { totalRooms, totalOccupancy, subtotal };
  });

  // Get venue area
  const getVenueArea = (venue: any) => {
    return venue.area || venue.venueSpace?.match(/\d+/)?.[0] || 'N/A';
  };

  // Prepare room detail rows with day labels for merging
  const roomDetailRows: Array<{ day: string; category: string; rate: number; rooms: number; occupancy: number; subtotal: number }> = [];
  sortedRoomDays.forEach((dayKey, dayIndex) => {
    const dayRooms = roomsByDay[dayKey];
    dayRooms.forEach((room: any) => {
      const rate = Number(room.rate) || 0;
      const numRooms = Number(room.numberOfRooms) || Number(room.requestedRooms) || 1;
      const occupancy = Number(room.totalOccupancy) || 0;
      const subtotal = rate * numRooms;
      roomDetailRows.push({
        day: `Day ${dayIndex + 1}`,
        category: room.category || 'N/A',
        rate,
        rooms: numRooms,
        occupancy,
        subtotal
      });
    });
  });

  // Menu packages data (only if has food)
  let menuPackageTotals: any[] = [];
  let foodMenuDetails: { [itemType: string]: { [day: string]: { [meal: string]: string } } } = {};
  let hiteaMenuItems: { [itemType: string]: { [day: string]: string } } = {};
  let additionalItems: Array<{ name: string; rate: number }> = [];

  if (hasFood) {
    // Calculate guest counts per menu package
    menuPackageTotals = menuPackages.map((pkg: any) => {
      const guestCount = pkg.guestCount || pkg.quantity || quotation.expectedGuests || 0;
      const ratePerPerson = pkg.price || 0;
      const total = ratePerPerson * guestCount;
      return { ...pkg, guestCount, ratePerPerson, total };
    });

    // Food menu details - organize by item type and day/meal
    menuPackages.forEach((pkg: any, pkgIndex: number) => {
      const selectedItems = pkg.selectedItems || [];
      selectedItems.forEach((item: any) => {
        const itemType = item.name || item.itemType || 'Unknown';
        
        // Skip Hi-Tea items (they go in a separate section)
        const itemName = (item.name || '').toLowerCase();
        if (itemName.includes('tea') || itemName.includes('coffee') || itemName.includes('snack') || 
            itemName.includes('pastry') || itemName.includes('hitea') || itemName.includes('late-night') ||
            itemName.includes('hi-tea') || itemName.includes('hi tea')) {
          return; // Skip this item for food menu details
        }
        
        if (!foodMenuDetails[itemType]) {
          foodMenuDetails[itemType] = {};
        }
        
        const numDays = sortedVenueDays.length || 1;
        
        // Check if item has specific day/meal quantities (day1Lunch, day1Dinner, etc.)
        if (item.day1Lunch !== undefined || item.day1Dinner !== undefined || 
            item.day2Lunch !== undefined || item.day2Dinner !== undefined) {
          // Item has explicit day/meal quantities
          if (item.day1Lunch !== undefined && item.day1Lunch !== null) {
            if (!foodMenuDetails[itemType]['Day 1']) foodMenuDetails[itemType]['Day 1'] = {};
            foodMenuDetails[itemType]['Day 1']['Lunch'] = item.day1Lunch.toString();
          }
          if (item.day1Dinner !== undefined && item.day1Dinner !== null) {
            if (!foodMenuDetails[itemType]['Day 1']) foodMenuDetails[itemType]['Day 1'] = {};
            foodMenuDetails[itemType]['Day 1']['Dinner'] = item.day1Dinner.toString();
          }
          if (item.day2Lunch !== undefined && item.day2Lunch !== null) {
            if (!foodMenuDetails[itemType]['Day 2']) foodMenuDetails[itemType]['Day 2'] = {};
            foodMenuDetails[itemType]['Day 2']['Lunch'] = item.day2Lunch.toString();
          }
          if (item.day2Dinner !== undefined && item.day2Dinner !== null) {
            if (!foodMenuDetails[itemType]['Day 2']) foodMenuDetails[itemType]['Day 2'] = {};
            foodMenuDetails[itemType]['Day 2']['Dinner'] = item.day2Dinner.toString();
          }
        } else if (item.day !== undefined && item.mealType !== undefined) {
          // Item has explicit day and mealType
          const dayKey = `Day ${item.day}`;
          const meal = item.mealType.charAt(0).toUpperCase() + item.mealType.slice(1).toLowerCase();
          if (!foodMenuDetails[itemType][dayKey]) foodMenuDetails[itemType][dayKey] = {};
          foodMenuDetails[itemType][dayKey][meal] = (item.quantity || 1).toString();
        } else if (item.day1Quantity !== undefined || item.day2Quantity !== undefined) {
          // Item has day-specific quantities (but no meal type specified)
          // Default to Lunch for Day 1, Dinner for Day 2, or distribute evenly
          if (item.day1Quantity !== undefined && item.day1Quantity !== null) {
            if (!foodMenuDetails[itemType]['Day 1']) foodMenuDetails[itemType]['Day 1'] = {};
            foodMenuDetails[itemType]['Day 1']['Lunch'] = item.day1Quantity.toString();
          }
          if (item.day2Quantity !== undefined && item.day2Quantity !== null) {
            if (!foodMenuDetails[itemType]['Day 2']) foodMenuDetails[itemType]['Day 2'] = {};
            foodMenuDetails[itemType]['Day 2']['Lunch'] = item.day2Quantity.toString();
          }
        } else if (item.quantity !== undefined && item.quantity !== null) {
          // Item has a general quantity - try to infer day/meal from context
          // If no day/meal info, default to Day 1 Lunch
          if (!foodMenuDetails[itemType]['Day 1']) foodMenuDetails[itemType]['Day 1'] = {};
          if (!foodMenuDetails[itemType]['Day 1']['Lunch']) {
            foodMenuDetails[itemType]['Day 1']['Lunch'] = item.quantity.toString();
          }
        }
      });
    });

    // Hi-Tea & Late-Night Phera menu items
    menuPackages.forEach((pkg: any) => {
      const selectedItems = pkg.selectedItems || [];
      selectedItems.forEach((item: any) => {
        const itemName = (item.name || '').toLowerCase();
        // Check for Hi-Tea related items
        if (itemName.includes('tea') || itemName.includes('coffee') || itemName.includes('snack') || 
            itemName.includes('pastry') || itemName.includes('hitea') || itemName.includes('late-night') ||
            itemName.includes('hi-tea') || itemName.includes('hi tea') || itemName.includes('welcome drink') ||
            itemName.includes('dry dessert') || itemName.includes('cookie')) {
          const itemType = item.name || 'Unknown';
          if (!hiteaMenuItems[itemType]) {
            hiteaMenuItems[itemType] = {};
          }
          
          const numDays = sortedVenueDays.length || 1;
          
          // Check if item has day-specific quantities
          if (item.day1Quantity !== undefined || item.day2Quantity !== undefined) {
            if (item.day1Quantity !== undefined && item.day1Quantity !== null) {
              hiteaMenuItems[itemType]['Day 1'] = item.day1Quantity.toString();
            }
            if (item.day2Quantity !== undefined && item.day2Quantity !== null) {
              hiteaMenuItems[itemType]['Day 2'] = item.day2Quantity.toString();
            }
          } else if (item.day !== undefined) {
            // Item has explicit day
            const dayKey = `Day ${item.day}`;
            hiteaMenuItems[itemType][dayKey] = (item.quantity || 'Yes').toString();
          } else if (item.quantity !== undefined && item.quantity !== null) {
            // Item has a general quantity - set for all days
            for (let dayNum = 1; dayNum <= numDays; dayNum++) {
              const dayKey = `Day ${dayNum}`;
              if (!hiteaMenuItems[itemType][dayKey]) {
                hiteaMenuItems[itemType][dayKey] = item.quantity.toString();
              }
            }
          } else {
            // No quantity specified - default to 'Yes' for all days
            for (let dayNum = 1; dayNum <= numDays; dayNum++) {
              const dayKey = `Day ${dayNum}`;
              if (!hiteaMenuItems[itemType][dayKey]) {
                hiteaMenuItems[itemType][dayKey] = 'Yes';
              }
            }
          }
        }
      });
    });

    // Additional items per person
    menuPackages.forEach((pkg: any) => {
      const additionalItemsList = (pkg.selectedItems || []).filter((item: any) => 
        (!item.isPackageItem || item.isPackageItem === false) || (item.additionalPrice && item.additionalPrice > 0)
      );
      additionalItemsList.forEach((item: any) => {
        if (item.additionalPrice && item.additionalPrice > 0) {
          additionalItems.push({
            name: item.name,
            rate: item.additionalPrice
          });
        }
      });
      (pkg.customItems || []).forEach((item: any) => {
        if (item.price && item.price > 0) {
          additionalItems.push({
            name: item.name,
            rate: item.price
          });
        }
      });
    });
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Event Proposal - ${quotation.quotationNumber || 'DRAFT'}</title>
  <style>
    @page {
      margin: 20mm 15mm 25mm 15mm;
      @bottom-center {
        content: "Palm Springs Resort | Event Proposal | www.palmspringsindia.com";
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-size: 9px;
        color: ${FOOTER_GRAY};
        margin-top: 8mm;
      }
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 12px;
      line-height: 1.6;
      color: ${BODY_TEXT};
      background: white;
      padding: 20px;
    }
    
    .container {
      max-width: 1000px;
      margin: 0 auto;
      background: white;
      position: relative;
    }

    /* Footer */
    .footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 9px;
      color: ${FOOTER_GRAY};
      padding: 8px 0;
      border-top: 1px solid #e5e7eb;
    }

    /* Logo and Header */
    .header-section {
      margin-bottom: 25px;
      text-align: center;
      padding-top: 20px;
    }

    .logo-container {
      margin-bottom: 20px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 120px;
    }

    .logo-img {
      max-height: 120px;
      max-width: 375px;
      width: auto;
      height: auto;
      object-fit: contain;
      display: block;
      margin: 0 auto;
    }

    .document-title {
      font-size: 18px;
      font-weight: bold;
      color: ${TITLE_GOLD};
      margin: 15px 0;
      text-align: center;
    }

    /* Greeting Section */
    .greeting-section {
      margin: 20px 0;
      font-size: 12px;
      line-height: 1.8;
      color: ${BODY_TEXT};
    }

    /* Section Titles */
    .section-title {
      font-size: 13px;
      font-weight: bold;
      color: ${TITLE_GRAY};
      margin: 25px 0 12px 0;
      padding-bottom: 4px;
    }

    /* Table Styles with Gold Headers */
    .table-wrapper {
      margin: 15px 0;
      overflow-x: auto;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5px;
      border: 1px solid #d1d5db;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    table thead th {
      background: ${PRIMARY_GOLD};
      color: white;
      padding: 8px 6px;
      text-align: center;
      font-weight: bold;
      font-size: 11px;
      border: 1px solid #9a7a38;
    }

    table tbody td {
      padding: 8px 6px;
      border: 1px solid #e5e7eb;
      vertical-align: middle;
      text-align: center;
      font-size: 10.5px;
    }

    table tbody tr:nth-child(even) {
      background: ${ZEBRA_GRAY};
    }

    table tbody tr:nth-child(odd) {
      background: white;
    }

    table tbody tr.total-row {
      background: ${FADED_GOLD};
      font-weight: bold;
      font-size: 11px;
    }

    table tbody tr.total-row td {
      border: 1px solid #d1b887;
    }

    /* Merged first column for Room Plan Detail */
    table.room-detail-table tbody tr td:first-child {
      border-right: 1px solid #e5e7eb;
    }

    table.room-detail-table tbody tr:not(.total-row) td:first-child {
      vertical-align: middle;
    }

    /* CSS for merged cells - we'll use rowspan via JavaScript-like approach in HTML */
    .merged-cell {
      border-bottom: none !important;
    }

    .merged-cell-content {
      position: relative;
    }

    .text-right {
      text-align: right;
    }

    .text-left {
      text-align: left;
    }

    /* Notes Section */
    .notes-section {
      margin-top: 10px;
      font-size: 11px;
      color: ${BODY_TEXT};
      line-height: 1.6;
    }

    .notes-section p {
      margin-bottom: 4px;
    }

    /* Stay Summary */
    .stay-summary {
      margin: 15px 0;
      padding: 10px;
      font-size: 11px;
      line-height: 1.6;
      color: ${BODY_TEXT};
    }

    /* Summary Amount Section */
    .summary-amount-section {
      margin: 25px 0;
    }

    .summary-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5px;
      border: 1px solid #d1d5db;
    }

    .summary-table thead th {
      background: ${PRIMARY_GOLD};
      color: white;
      text-align: center;
      padding: 8px;
      font-weight: bold;
      font-size: 11px;
    }

    .summary-table tbody td {
      padding: 8px 12px;
      border: 1px solid #e5e7eb;
      text-align: left;
    }

    .summary-table tbody td:last-child {
      text-align: right;
    }

    .summary-table tbody tr:last-child {
      background: ${FADED_GOLD};
      font-weight: bold;
      font-size: 11px;
    }

    .summary-table tbody tr:last-child td {
      border: 1px solid #d1b887;
    }

    /* Terms & Conditions */
    .terms-section {
      margin: 30px 0;
    }

    .terms-title {
      font-size: 13px;
      font-weight: bold;
      color: ${TITLE_GRAY};
      margin-bottom: 15px;
    }

    .terms-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .terms-list li {
      margin-bottom: 7px;
      padding-left: 0;
      font-size: 11px;
      line-height: 1.7;
      color: ${BODY_TEXT};
    }

    .terms-list li::before {
      content: "- ";
      color: ${TITLE_GRAY};
      font-weight: bold;
      margin-right: 4px;
    }

    /* Contact Section */
    .contact-section {
      margin-top: 40px;
      padding-top: 20px;
    }

    .contact-details {
      font-size: 12px;
      line-height: 1.8;
      color: ${BODY_TEXT};
    }

    .contact-name {
      font-size: 12px;
      font-weight: normal;
      margin-bottom: 2px;
    }

    /* Page Break Controls */
    .page-break {
      page-break-before: always;
      break-before: page;
    }

    @media print {
      body {
        padding: 0;
      }
      
      .table-wrapper,
      table {
        page-break-inside: avoid;
        break-inside: avoid;
      }

      tr {
        page-break-inside: avoid;
        break-inside: avoid;
      }

      .page-break {
        page-break-before: always;
        break-before: page;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Logo and Header -->
    <div class="header-section">
      ${logoBase64 ? `
        <div class="logo-container">
          <img src="${logoBase64}" alt="Palm Springs Resort" class="logo-img" />
        </div>
      ` : ''}
      <div class="document-title">Event Proposal</div>
    </div>

    <!-- Greeting -->
    <div class="greeting-section">
      <p>Greetings of the day from Palm Springs Resort, Nashik!</p>
      <p style="margin-top: 8px;">We sincerely thank you for considering "Palm Springs Resort" as the preferred venue for your upcoming event. Please find below our detailed proposal as discussed.</p>
    </div>

    ${venueRentalItems.length > 0 ? `
    <!-- Venue Rental Package Section -->
    <div class="section-title">Venue Rental Package (GST Extra as Applicable)</div>
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Event Date</th>
            <th>Venue</th>
            <th>Area (Sq. ft.)</th>
            <th>Session</th>
            <th>Rate</th>
          </tr>
        </thead>
        <tbody>
          ${sortedVenueDays.map((dayKey, dayIndex) => {
            const dayVenues = venuesByDay[dayKey];
            return dayVenues.map((venue: any, index: number) => `
              <tr>
                <td>${index === 0 ? `Day ${dayIndex + 1}` : ''}</td>
                <td>${venue.venue || 'N/A'}</td>
                <td>${getVenueArea(venue)}</td>
                <td>${venue.session || 'N/A'}</td>
                <td class="text-right">${formatCurrency(Number(venue.sessionRate) || 0)}</td>
              </tr>
            `).join('');
          }).join('')}
          <tr class="total-row">
            <td colspan="4"><strong>Grand Total</strong></td>
            <td class="text-right"><strong>${formatCurrency(venueRentalTotal)}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="notes-section">
      <p>The package includes ${venueRentalItems.length} venue${venueRentalItems.length > 1 ? 's' : ''} for ${venueRentalItems.length} session${venueRentalItems.length > 1 ? 's' : ''}, subject to availability and prior booking.</p>
      <p>Venue allocation and session timing depend on event type and guest count.</p>
      <p>Any additional venue requirements may incur additional charges.</p>
    </div>
    ` : ''}

    ${roomPackages.length > 0 ? `
    <!-- Room Plan Section (merged first column for non-food, or summary + detail for food) -->
    ${hasFood ? `
    <!-- Room Plan Summary (only for food quotations) -->
    <div class="section-title">Room Plan Summary (GST Extra as Applicable)</div>
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Event Date</th>
            <th>Total Rooms</th>
            <th>Occupancy</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${sortedRoomDays.map((dayKey, dayIndex) => {
            const dayTotal = roomTotalsByDay[dayKey];
            return `
              <tr>
                <td>Day ${dayIndex + 1}</td>
                <td>${dayTotal.totalRooms}</td>
                <td>${dayTotal.totalOccupancy}</td>
                <td class="text-right">${formatCurrency(dayTotal.subtotal)}</td>
              </tr>
            `;
          }).join('')}
          <tr class="total-row">
            <td><strong>Total</strong></td>
            <td><strong>${Object.values(roomTotalsByDay).reduce((sum, day) => sum + day.totalRooms, 0)}</strong></td>
            <td><strong>${Object.values(roomTotalsByDay).reduce((sum, day) => sum + day.totalOccupancy, 0)}</strong></td>
            <td class="text-right"><strong>${formatCurrency(roomQuotationTotal)}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="stay-summary">
      <p><strong>Stay Summary:</strong></p>
      <p>Check-In: ${quotation.checkInTime || '14:00'} hrs | Check-Out: ${quotation.checkOutTime || '11:00'} hrs</p>
      <p>Room charges exclude breakfast.</p>
      <p>Extra person / bed - As per actuals</p>
    </div>
    ` : ''}
    ` : ''}

    ${hasFood ? `
    <!-- Food Packages Section -->
    <div class="section-title">Food Packages (GST Extra as Applicable)</div>
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Package</th>
            <th>Meal Type</th>
            <th>Rate/Person</th>
            <th>Guest Count</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${menuPackageTotals.map((pkg: any) => `
            <tr>
              <td>${pkg.name || 'Package'}</td>
              <td>${pkg.type === 'veg' ? 'Veg' : 'Non-Veg'}</td>
              <td class="text-right">${formatCurrency(pkg.ratePerPerson)}</td>
              <td>${pkg.guestCount}</td>
              <td class="text-right">${formatCurrency(pkg.total)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    <div class="notes-section">
      <p><strong>Note:</strong></p>
      <p>All food packages include buffet setup, standard service ware, and mineral water.</p>
      <p>Menu customization is available on request.</p>
      <p>GST extra as applicable.</p>
    </div>
    ` : ''}

    ${roomPackages.length > 0 ? `
    <!-- Room Plan (GST Extra as Applicable) - merged first column -->
    <div class="section-title">Room Plan (GST Extra as Applicable)</div>
    <div class="table-wrapper">
      <table class="room-detail-table">
        <thead>
          <tr>
            <th>Event Date</th>
            <th>Room Category</th>
            <th>Rate</th>
            <th>Rooms</th>
            <th>Occupancy</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${(() => {
            let html = '';
            let currentDay = '';
            let dayCount = 0;
            
            roomDetailRows.forEach((row, index) => {
              const isFirstInGroup = row.day !== currentDay;
              
              if (isFirstInGroup) {
                currentDay = row.day;
                // Count how many rows have this day
                dayCount = roomDetailRows.filter(r => r.day === currentDay).length;
              }
              
              if (isFirstInGroup) {
                // First row of group - include day cell with rowspan
                html += `
                  <tr>
                    <td rowspan="${dayCount}">${row.day}</td>
                    <td>${row.category}</td>
                    <td class="text-right">${formatCurrency(row.rate)}</td>
                    <td>${row.rooms}</td>
                    <td>${row.occupancy}</td>
                    <td class="text-right">${formatCurrency(row.subtotal)}</td>
                  </tr>
                `;
              } else {
                // Subsequent rows in group - no day cell (it's merged via rowspan)
                html += `
                  <tr>
                    <td>${row.category}</td>
                    <td class="text-right">${formatCurrency(row.rate)}</td>
                    <td>${row.rooms}</td>
                    <td>${row.occupancy}</td>
                    <td class="text-right">${formatCurrency(row.subtotal)}</td>
                  </tr>
                `;
              }
            });
            
            return html;
          })()}
          <tr class="total-row">
            <td><strong>Total</strong></td>
            <td></td>
            <td></td>
            <td><strong>${Object.values(roomTotalsByDay).reduce((sum, day) => sum + day.totalRooms, 0)}</strong></td>
            <td><strong>${Object.values(roomTotalsByDay).reduce((sum, day) => sum + day.totalOccupancy, 0)}</strong></td>
            <td class="text-right"><strong>${formatCurrency(roomQuotationTotal)}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>
    ${!hasFood ? `
    <div class="stay-summary">
      <p><strong>Stay Summary:</strong></p>
      <p>Check-In: ${quotation.checkInTime || '14:00'} hrs | Check-Out: ${quotation.checkOutTime || '11:00'} hrs</p>
      <p>Room charges exclude breakfast.</p>
      <p>Extra person / bed - As per actuals</p>
    </div>
    ` : ''}
    ` : ''}

    ${hasFood ? `
    ${Object.keys(foodMenuDetails).length > 0 ? `
    <!-- Food Menu Details Section -->
    <div class="section-title">Food Menu Details</div>
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Item Type</th>
            <th>Day 1 Lunch</th>
            <th>Day 1 Dinner</th>
            <th>Day 2 Lunch</th>
            <th>Day 2 Dinner</th>
          </tr>
        </thead>
        <tbody>
          ${Object.keys(foodMenuDetails).map(itemType => {
            const day1Data = foodMenuDetails[itemType]['Day 1'] || {};
            const day2Data = foodMenuDetails[itemType]['Day 2'] || {};
            return `
              <tr>
                <td>${itemType}</td>
                <td>${day1Data['Lunch'] || '-'}</td>
                <td>${day1Data['Dinner'] || '-'}</td>
                <td>${day2Data['Lunch'] || '-'}</td>
                <td>${day2Data['Dinner'] || '-'}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    ${Object.keys(hiteaMenuItems).length > 0 ? `
    <!-- Hi-Tea & Late-Night Phera Menu Section -->
    <div class="section-title">Hi-Tea & Late-Night Phera Menu</div>
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Item Type</th>
            <th>Day 1</th>
            <th>Day 2</th>
          </tr>
        </thead>
        <tbody>
          ${Object.keys(hiteaMenuItems).map(itemType => `
            <tr>
              <td>${itemType}</td>
              <td>${hiteaMenuItems[itemType]['Day 1'] || '-'}</td>
              <td>${hiteaMenuItems[itemType]['Day 2'] || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    ${additionalItems.length > 0 ? `
    <!-- Additional Items Per Person Section -->
    <div class="section-title">Additional Items Per Person</div>
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Add-on Item</th>
            <th>Rate (Rs.)</th>
          </tr>
        </thead>
        <tbody>
          ${additionalItems.map((item: any) => `
            <tr>
              <td>${item.name}</td>
              <td class="text-right">${formatCurrency(item.rate)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}
    ` : ''}

    <!-- Summary Amount Section -->
    <div class="summary-amount-section">
      <div class="section-title">Summary Amount</div>
      <div class="table-wrapper">
        <table class="summary-table">
          <thead>
            <tr>
              <th>Particular</th>
              <th>Amount (Rs.)</th>
            </tr>
          </thead>
          <tbody>
            ${venueBaseAfterDiscount > 0 ? `
            <tr>
              <td>Banquet</td>
              <td class="text-right">${formatCurrency(venueBaseAfterDiscount)}</td>
            </tr>
            ` : ''}
            ${roomBaseAfterDiscount > 0 ? `
            <tr>
              <td>Rooms (All Nights)</td>
              <td class="text-right">${formatCurrency(roomBaseAfterDiscount)}</td>
            </tr>
            ` : ''}
            ${hasFood && menuBaseAfterDiscount > 0 ? `
            <tr>
              <td>Food Packages</td>
              <td class="text-right">${formatCurrency(menuBaseAfterDiscount)}</td>
            </tr>
            ` : ''}
            <tr style="background: ${FADED_GOLD}; font-weight: 600; border-top: 2px solid #d1b887;">
              <td><strong>Subtotal</strong></td>
              <td class="text-right"><strong>${formatCurrency(subtotalAfterDiscount)}</strong></td>
            </tr>
            ${discountAmount > 0 ? `
            <tr style="background: #E3F2FD;">
              <td>Discount (${discountType === 'percentage' ? `${discountValue}%` : formatCurrency(discountValue)})</td>
              <td class="text-right" style="color: #1976D2;">-${formatCurrency(discountAmount)}</td>
            </tr>
            ` : ''}
            ${includeGST && totalGST > 0 ? `
            <tr>
              <td>GST</td>
              <td class="text-right">${formatCurrency(Math.round(totalGST))}</td>
            </tr>
            ` : ''}
            <tr class="total-row">
              <td><strong>Total</strong></td>
              <td class="text-right"><strong>${formatCurrency(finalTotal)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Yours truly -->
    <div class="contact-section">
      <div class="contact-details">
        <p>Yours truly,</p>
        <p style="margin-top: 8px;">Vaibhav Awate</p>
        <p>Manager - Banquets Sales | Palm Springs Resort, Nashik</p>
        <p>Phone: +91 99231 50400 | Email: bqtsales@palmspringsindia.com</p>
      </div>
    </div>

    <!-- Page Break: Terms & Conditions -->
    <div class="page-break"></div>

    <!-- Terms & Conditions Section -->
    <div class="terms-section">
      <div class="terms-title">Terms & Conditions</div>
      
      <ul class="terms-list">
        <li><strong>Taxes:</strong> Taxes applicable as per prevailing Government norms.</li>
        ${quotation.paymentTerms ? `<li><strong>Payment Terms:</strong> ${quotation.paymentTerms}</li>` : `<li><strong>Payment Terms:</strong> 100% advance - 25% at the time of booking confirmation and the remaining 75% fifteen days prior to the function date.</li>`}
        ${quotation.venuePolicy ? `<li><strong>Banquet Halls:</strong> ${quotation.venuePolicy}</li>` : `<li><strong>Banquet Halls:</strong> Allocation of banquet halls is subject to availability. Management reserves the right to change the hall if necessary.</li>`}
        ${quotation.musicPolicy || quotation.permissionsRequired ? `<li><strong>Music & Licenses:</strong> ${quotation.musicPolicy || ''} ${quotation.permissionsRequired || ''}</li>` : `<li><strong>Music & Licenses:</strong> Music is permitted until 10:00 PM, subject to compliance with Government sound regulations. Guests are responsible for obtaining and submitting all mandatory permissions/licenses (such as PPL / Music / Liquor Licenses) prior to the event.</li>`}
        ${quotation.gstPolicy ? `<li><strong>GSTIN:</strong> ${quotation.gstPolicy}</li>` : `<li><strong>GSTIN:</strong> GSTIN must be provided prior to the event.</li>`}
        ${quotation.extraSpacePolicy ? `<li><strong>Additional Spaces:</strong> ${quotation.extraSpacePolicy}</li>` : `<li><strong>Additional Spaces:</strong> Any extra space required, such as storage or an additional venue, will be chargeable separately.</li>`}
        ${quotation.electricityPolicy ? `<li><strong>Electricity Supply:</strong> ${quotation.electricityPolicy}</li>` : `<li><strong>Electricity Supply:</strong> The resort provides electricity for guest rooms, basic banquet lighting, banquet air-conditioning, and basic lawn lighting. If additional power supply is required, it must be arranged by the guest through our authorized vendor at an extra cost.</li>`}
        ${quotation.decorPolicy ? `<li><strong>Decor & Furniture:</strong> ${quotation.decorPolicy}</li>` : `<li><strong>Decor & Furniture:</strong> Decor is not included in the package. Guests may contact our empaneled vendors for decor requirements. Basic banquet chairs with covers will be provided by the resort.</li>`}
        ${quotation.prohibitedItems ? `<li><strong>Prohibited Items:</strong> ${quotation.prohibitedItems}</li>` : `<li><strong>Prohibited Items:</strong> Firecrackers and paper blasts are strictly prohibited within the resort premises.</li>`}
        ${quotation.externalVendorPolicy ? `<li><strong>External Vendors:</strong> ${quotation.externalVendorPolicy}</li>` : `<li><strong>External Vendors:</strong> External event or hospitality vendors from the guest's side are not permitted to display branding of any kind. Any damages caused by such vendors will be the sole responsibility of the main guest.</li>`}
        ${quotation.damageLiability ? `<li><strong>Damages & Liability:</strong> ${quotation.damageLiability}</li>` : `<li><strong>Damages & Liability:</strong> Any damage caused to resort property, including surfaces, decor, rooms, or linen, due to non-compliance with resort guidelines, will be chargeable as deemed appropriate by management.</li>`}
      </ul>
    </div>
  </div>
</body>
</html>
  `;
}
