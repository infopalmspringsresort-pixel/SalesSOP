export function generateQuotationHTML(quotation: any): string {
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'N/A';
    if (dateStr.includes('/')) {
      const [day, month, year] = dateStr.split('/');
      try {
        return new Date(`${year}-${month}-${day}`).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
      } catch {
        return dateStr;
      }
    }
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const venueRentalTotal = quotation.venueRentalTotal || 0;
  const roomQuotationTotal = quotation.roomQuotationTotal || 0;
  const menuTotal = quotation.menuTotal || 0;
  const subtotal = venueRentalTotal + roomQuotationTotal + menuTotal;
  const grandTotal = quotation.grandTotal || subtotal;
  const gstAmount = quotation.includeGST && grandTotal > subtotal ? (grandTotal - subtotal) : 0;
  const discountAmount = quotation.discountAmount || 0;
  const finalTotal = quotation.finalTotal || grandTotal;

  // Capitalize first letter
  const capitalizeFirst = (str: string) => {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quotation ${quotation.quotationNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 13px;
      line-height: 1.6;
      color: #1f2937;
      background: white;
      padding: 30px 20px;
    }
    
    .container {
      max-width: 1000px;
      margin: 0 auto;
      background: white;
    }

    /* Header Section */
    .header-section {
      margin-bottom: 20px;
      border-bottom: 2px solid #2d5016;
      padding-bottom: 15px;
    }

    .company-header {
      text-align: center;
      margin-bottom: 20px;
    }

    .company-name {
      font-size: 28px;
      font-weight: bold;
      color: #2d5016;
      margin-bottom: 5px;
    }

    .company-tagline {
      font-size: 16px;
      color: #4a6741;
      font-weight: 300;
    }

    .salutation {
      margin: 20px 0 15px 0;
      font-size: 14px;
    }

    .quotation-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      padding: 12px;
      background: #f0f8f0;
      border: 1px solid #c8e6c8;
      border-radius: 4px;
    }

    .quotation-number {
      font-size: 18px;
      font-weight: bold;
      color: #2d5016;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-draft {
      background: #f3f4f6;
      color: #6b7280;
      border: 1px solid #d1d5db;
    }

    .status-sent {
      background: #2d5016;
      color: white;
    }

    .booking-details {
      margin: 15px 0;
      padding: 12px;
      background: #f9fafb;
      border-left: 4px solid #2d5016;
    }

    .booking-details strong {
      color: #2d5016;
    }

    /* Table Styles - Matching Your Format */
    .section-title {
      font-size: 16px;
      font-weight: bold;
      color: #2d5016;
      margin: 20px 0 12px 0;
      padding-bottom: 8px;
      border-bottom: 2px solid #2d5016;
    }

    .table-wrapper {
      margin: 15px 0;
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      border: 1px solid #d1d5db;
    }

    table thead th {
      background: #2d5016;
      color: white;
      padding: 10px 8px;
      text-align: left;
      font-weight: 600;
      font-size: 12px;
      border: 1px solid #1a3a0e;
    }

    table tbody td {
      padding: 10px 8px;
      border: 1px solid #e5e7eb;
      vertical-align: top;
    }

    table tbody tr:nth-child(even) {
      background: #f0f8f0;
    }

    table tbody tr:nth-child(odd) {
      background: white;
    }

    table tbody tr.total-row {
      background: #2d5016;
      color: white;
      font-weight: bold;
      font-size: 14px;
    }

    table tbody tr.total-row td {
      border: 1px solid #1a3a0e;
    }

    .text-right {
      text-align: right;
    }

    .text-center {
      text-align: center;
    }

    /* Menu Package Detailed View */
    .menu-package-card {
      margin: 15px 0;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      overflow: hidden;
    }

    .menu-package-header {
      background: #2d5016;
      color: white;
      padding: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .menu-package-name {
      font-size: 15px;
      font-weight: bold;
    }

    .menu-package-type {
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 3px;
      background: rgba(255, 255, 255, 0.2);
    }

    .menu-package-body {
      padding: 12px;
      background: white;
    }

    .menu-items-section {
      margin: 12px 0;
    }

    .menu-items-title {
      font-size: 12px;
      font-weight: 600;
      color: #2d5016;
      margin-bottom: 8px;
      padding-bottom: 4px;
      border-bottom: 1px solid #e5e7eb;
    }

    .included-items {
      background: #f0fdf4;
      padding: 8px;
      border-radius: 4px;
      margin-bottom: 8px;
    }

    .additional-items {
      background: #eff6ff;
      padding: 8px;
      border-radius: 4px;
      margin-bottom: 8px;
    }

    .custom-items {
      background: #faf5ff;
      padding: 8px;
      border-radius: 4px;
      margin-bottom: 8px;
    }

    .menu-item-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;
      font-size: 12px;
    }

    .qty-badge {
      display: inline-block;
      padding: 2px 6px;
      background: white;
      border: 1px solid #d1d5db;
      border-radius: 3px;
      font-size: 10px;
      margin-left: 8px;
      font-weight: 600;
    }

    /* Check-in/Check-out Section */
    .checkin-section {
      margin: 20px 0;
      padding: 12px;
      background: #f0f8f0;
      border-left: 4px solid #2d5016;
    }

    .checkin-section strong {
      color: #2d5016;
    }

    /* Summary Section */
    .summary-section {
      margin: 25px 0;
      display: flex;
      gap: 20px;
    }

    .summary-table {
      flex: 1;
      border: 1px solid #d1d5db;
    }

    .summary-table thead th {
      background: #2d5016;
      color: white;
      text-align: center;
      padding: 10px;
    }

    .summary-table tbody td {
      padding: 10px 15px;
    }

    .summary-table tbody td:first-child {
      font-weight: 600;
    }

    .summary-table tbody tr:last-child {
      background: #2d5016;
      color: white;
      font-weight: bold;
      font-size: 15px;
    }

    .summary-table tbody tr:last-child td {
      border: 1px solid #1a3a0e;
    }

    /* Terms & Conditions */
    .terms-section {
      margin: 25px 0;
    }

    .terms-title {
      font-size: 18px;
      font-weight: bold;
      color: #2d5016;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid #2d5016;
      text-transform: uppercase;
    }

    .taxes-note {
      background: #fffbf0;
      border-left: 4px solid #f59e0b;
      padding: 10px 12px;
      margin-bottom: 15px;
      font-weight: 600;
      color: #92400e;
    }

    .terms-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .terms-list li {
      margin-bottom: 12px;
      padding-left: 0;
      font-size: 13px;
      line-height: 1.7;
    }

    .terms-list li strong {
      color: #2d5016;
    }

    /* Contact Section */
    .contact-section {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
    }

    .contact-closing {
      margin-bottom: 20px;
      font-size: 14px;
      line-height: 1.8;
      color: #374151;
    }

    .contact-details {
      background: #f9fafb;
      padding: 15px;
      border-radius: 4px;
      border: 1px solid #e5e7eb;
    }

    .contact-name {
      font-size: 16px;
      font-weight: bold;
      color: #2d5016;
      margin-bottom: 5px;
    }

    .contact-role {
      font-size: 13px;
      color: #6b7280;
      margin-bottom: 10px;
    }

    .contact-info {
      font-size: 12px;
      line-height: 1.8;
      color: #4b5563;
    }

    .contact-info strong {
      color: #2d5016;
    }

    /* Utility Classes */
    .font-bold {
      font-weight: 700;
    }

    .font-semibold {
      font-weight: 600;
    }

    .text-muted {
      color: #6b7280;
    }

    .mt-2 {
      margin-top: 12px;
    }

    .mb-2 {
      margin-bottom: 12px;
    }

    .highlight-note {
      background: #fffbf0;
      border-left: 4px solid #f59e0b;
      padding: 10px 12px;
      margin: 15px 0;
      font-size: 12px;
      font-weight: 600;
      color: #92400e;
    }

    @media print {
      body {
        padding: 15px;
      }
      
      .menu-package-card,
      .table-wrapper {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Company Header -->
    <div class="header-section">
      <div class="company-header">
        <div class="company-name">Palm Springs Resort, Nashik</div>
        <div class="company-tagline">Luxury Hotel & Banquet</div>
      </div>

      <!-- Salutation -->
      <div class="salutation">
        <p><strong>Dear Sir/Madam,</strong></p>
        <p>Greetings of the day from hotel Palm Springs Resort, Nashik !!</p>
        <p style="margin-top: 8px;">Thank you for considering <strong>Palm Springs Resort</strong> for your ${quotation.eventType ? capitalizeFirst(quotation.eventType) : 'function'} ${quotation.eventDate ? `in ${new Date(quotation.eventDate).getFullYear()}` : ''}. We are pleased to present this quotation based on our prior discussion.</p>
      </div>
    </div>

    <!-- Quotation Header -->
    <div class="quotation-header">
      <div>
        <div class="quotation-number">Quotation No: ${quotation.quotationNumber || 'DRAFT'}</div>
        <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">
          Date: ${quotation.createdAt ? formatDate(new Date(quotation.createdAt).toISOString().split('T')[0]) : formatDate(new Date().toISOString().split('T')[0])}
        </div>
      </div>
      <div>
        <span class="status-badge ${quotation.status === 'sent' ? 'status-sent' : 'status-draft'}">
          ${(quotation.status || 'DRAFT').toUpperCase()}
        </span>
      </div>
    </div>

    <!-- Booking Details -->
    <div class="booking-details">
      <div><strong>TYPE OF FUNCTION:</strong> ${quotation.eventType ? capitalizeFirst(quotation.eventType) : 'N/A'}</div>
      <div style="margin-top: 6px;"><strong>DATE OF FUNCTION:</strong> ${quotation.eventDate ? formatDate(quotation.eventDate) : 'To be confirmed'}</div>
      ${quotation.eventDuration > 1 ? `<div style="margin-top: 6px;"><strong>DURATION:</strong> ${quotation.eventDuration} days</div>` : ''}
      ${quotation.expectedGuests > 0 ? `<div style="margin-top: 6px;"><strong>EXPECTED GUESTS:</strong> ${quotation.expectedGuests}</div>` : ''}
      ${quotation.clientName ? `<div style="margin-top: 6px;"><strong>CLIENT:</strong> ${quotation.clientName}</div>` : ''}
    </div>

    ${quotation.venueRentalItems && quotation.venueRentalItems.length > 0 ? `
    <!-- Venue Rental Package Table -->
    <div class="section-title">Venue Rental Package - GST Extra as Applicable</div>
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Event Date</th>
            <th>Venue</th>
            <th>Venue Space</th>
            <th>Session</th>
            <th class="text-right">Session Rate</th>
          </tr>
        </thead>
        <tbody>
          ${quotation.venueRentalItems.map((venue: any) => `
          <tr>
            <td>${venue.eventDate ? formatDate(venue.eventDate) : 'N/A'}</td>
            <td>${venue.venue || 'N/A'}</td>
            <td>${venue.venueSpace || 'N/A'}</td>
            <td>${venue.session || 'N/A'}</td>
            <td class="text-right">${formatCurrency(venue.sessionRate || 0)}</td>
          </tr>
          `).join('')}
          <tr class="total-row">
            <td colspan="4"><strong>Grand Total</strong></td>
            <td class="text-right"><strong>${formatCurrency(venueRentalTotal)}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>
    <div style="margin-top: 10px; font-size: 12px; color: #6b7280; padding: 8px; background: #f9fafb; border-left: 3px solid #2d5016;">
      The package includes venues for sessions, subject to availability and prior booking. Venue allocation and session timing depend on event type and guest count. Extra services will be charged additionally.
    </div>
    ` : ''}

    ${quotation.roomPackages && quotation.roomPackages.length > 0 ? `
    <!-- Room Accommodation Table -->
    <div class="section-title">Special Room Quotation - GST Extra as Applicable</div>
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Rooms Category</th>
            <th class="text-right">Room Rate</th>
            <th class="text-center">Requested Rooms</th>
            <th class="text-center">Total Person Occupancy</th>
            <th class="text-right">Total Amount</th>
          </tr>
        </thead>
        <tbody>
          ${quotation.roomPackages.map((room: any) => {
            const roomTotal = (room.rate || 0) * (room.numberOfRooms || 1);
            return `
            <tr>
              <td>${room.category || 'N/A'}</td>
              <td class="text-right">${formatCurrency(room.rate || 0)}</td>
              <td class="text-center">${room.numberOfRooms || 1}</td>
              <td class="text-center">${room.totalOccupancy || 'N/A'}</td>
              <td class="text-right">${formatCurrency(roomTotal)}</td>
            </tr>
            `;
          }).join('')}
          <tr class="total-row">
            <td><strong>Total</strong></td>
            <td></td>
            <td class="text-center"><strong>${quotation.roomPackages.reduce((sum: number, r: any) => sum + (r.numberOfRooms || 1), 0)}</strong></td>
            <td class="text-center"><strong>${quotation.roomPackages.reduce((sum: number, r: any) => sum + (r.totalOccupancy || 0), 0)}</strong></td>
            <td class="text-right"><strong>${formatCurrency(roomQuotationTotal)}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Check-in/Check-out -->
    <div class="checkin-section">
      <div><strong>Check In :</strong> Afternoon ${quotation.checkInTime || '14:00'}hrs</div>
      <div style="margin-top: 6px;"><strong>Check Out :</strong> Morning ${quotation.checkOutTime || '11:00'}hrs</div>
    </div>

    <div class="highlight-note">
      <strong>Above Rooms charges will be without breakfast.</strong><br>
      Extra Person / Bed will be as per actual.
    </div>
    ` : ''}

    ${quotation.menuPackages && quotation.menuPackages.length > 0 ? `
    <!-- Food & Beverage Packages -->
    <div class="section-title">Food & Beverage Packages - GST Extra as Applicable</div>
    ${quotation.menuPackages.map((pkg: any) => {
      const packageItems = (pkg.selectedItems || []).filter((item: any) => item.isPackageItem !== false && (item.additionalPrice === 0 || !item.additionalPrice));
      const additionalItems = (pkg.selectedItems || []).filter((item: any) => !item.isPackageItem || (item.additionalPrice && item.additionalPrice > 0));
      const customItems = pkg.customItems || [];
      
      const additionalItemsTotal = additionalItems.reduce((sum: number, item: any) => {
        const quantity = item.quantity !== undefined && item.quantity !== null ? item.quantity : 1;
        return sum + ((item.additionalPrice || 0) * quantity);
      }, 0);
      const customItemsTotal = customItems.reduce((sum: number, item: any) => {
        const quantity = item.quantity !== undefined && item.quantity !== null ? item.quantity : 1;
        return sum + ((item.price || 0) * quantity);
      }, 0);
      const packageSubtotal = (pkg.price || 0) + additionalItemsTotal + customItemsTotal;
      
      return `
      <div class="menu-package-card">
        <div class="menu-package-header">
          <div>
            <div class="menu-package-name">${pkg.name || 'Package'}</div>
            <div style="font-size: 11px; margin-top: 4px; opacity: 0.9;">
              Base Price: ${formatCurrency(pkg.price || 0)} per person
            </div>
          </div>
          <div class="menu-package-type">
            ${pkg.type === 'veg' ? '🟩 Veg' : '🟥 Non-Veg'}
          </div>
        </div>
        <div class="menu-package-body">
          ${packageItems.length > 0 ? `
          <div class="menu-items-section">
            <div class="menu-items-title">Included Items:</div>
            <div class="included-items">
              ${packageItems.map((item: any) => {
                const quantity = item.quantity !== undefined && item.quantity !== null ? item.quantity : 1;
                return `
                <div class="menu-item-row">
                  <div>
                    <strong style="color: #15803d;">${item.name}</strong>
                    ${quantity > 0 ? `<span class="qty-badge">Qty: ${quantity}</span>` : ''}
                  </div>
                </div>
                `;
              }).join('')}
            </div>
          </div>
          ` : ''}
          
          ${additionalItems.length > 0 ? `
          <div class="menu-items-section">
            <div class="menu-items-title">Additional Items:</div>
            <div class="additional-items">
              ${additionalItems.map((item: any) => {
                const quantity = item.quantity !== undefined && item.quantity !== null ? item.quantity : 1;
                const totalPrice = (item.additionalPrice || 0) * quantity;
                return `
                <div class="menu-item-row">
                  <div>
                    <strong style="color: #1d4ed8;">${item.name}</strong>
                    ${quantity > 0 ? `<span class="qty-badge">Qty: ${quantity}</span>` : ''}
                  </div>
                  <strong style="color: #2563eb;">+${formatCurrency(totalPrice)}</strong>
                </div>
                `;
              }).join('')}
            </div>
          </div>
          ` : ''}
          
          ${customItems.length > 0 ? `
          <div class="menu-items-section">
            <div class="menu-items-title">Custom Items:</div>
            <div class="custom-items">
              ${customItems.map((item: any) => {
                const quantity = item.quantity !== undefined && item.quantity !== null ? item.quantity : 1;
                const totalPrice = (item.price || 0) * quantity;
                return `
                <div class="menu-item-row">
                  <div>
                    <strong style="color: #7c3aed;">${item.name}</strong>
                    ${quantity > 0 ? `<span class="qty-badge">Qty: ${quantity}</span>` : ''}
                  </div>
                  <strong style="color: #9333ea;">${formatCurrency(totalPrice)}</strong>
                </div>
                `;
              }).join('')}
            </div>
          </div>
          ` : ''}
          
          <div style="margin-top: 12px; padding-top: 12px; border-top: 2px solid #e5e7eb;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <strong style="font-size: 14px; color: #2d5016;">Package Total:</strong>
              <strong style="font-size: 16px; color: #2d5016;">${formatCurrency(packageSubtotal)}</strong>
            </div>
          </div>
        </div>
      </div>
      `;
    }).join('')}
    ` : ''}

    <!-- Financial Summary -->
    <div class="summary-section">
      <table class="summary-table">
        <thead>
          <tr>
            <th colspan="2">Summary</th>
          </tr>
        </thead>
        <tbody>
          ${venueRentalTotal > 0 ? `
          <tr>
            <td>Banquet</td>
            <td class="text-right">${formatCurrency(venueRentalTotal)}</td>
          </tr>
          ` : ''}
          ${menuTotal > 0 ? `
          <tr>
            <td>Food & Beverage</td>
            <td class="text-right">${formatCurrency(menuTotal)}</td>
          </tr>
          ` : ''}
          ${roomQuotationTotal > 0 ? `
          <tr>
            <td>Room</td>
            <td class="text-right">${formatCurrency(roomQuotationTotal)}</td>
          </tr>
          ` : ''}
          <tr style="background: #f0f8f0; font-weight: 600; border-top: 2px solid #2d5016;">
            <td>Subtotal</td>
            <td class="text-right">${formatCurrency(subtotal)}</td>
          </tr>
          ${quotation.includeGST && gstAmount > 0 ? `
          <tr>
            <td>GST</td>
            <td class="text-right">${formatCurrency(Math.round(gstAmount))}</td>
          </tr>
          <tr style="background: #f0f8f0; font-weight: 600;">
            <td>Grand Total</td>
            <td class="text-right">${formatCurrency(grandTotal)}</td>
          </tr>
          ` : ''}
          ${discountAmount > 0 ? `
          <tr style="background: #eff6ff;">
            <td>Discount (${quotation.discountType === 'percentage' ? `${quotation.discountValue || 0}%` : formatCurrency(quotation.discountValue || 0)})</td>
            <td class="text-right" style="color: #2563eb;">-${formatCurrency(discountAmount)}</td>
          </tr>
          ` : ''}
          <tr class="total-row">
            <td><strong>Total</strong></td>
            <td class="text-right"><strong>${formatCurrency(finalTotal)}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div style="margin-top: 10px; font-size: 12px; color: #6b7280; padding: 8px; background: #f9fafb; border-left: 3px solid #2d5016;">
      <strong>Valid Until:</strong> ${quotation.validUntil ? formatDate(new Date(quotation.validUntil).toISOString().split('T')[0]) : '30 days from creation'}
    </div>

    <!-- Terms & Conditions -->
    <div class="terms-section">
      <div class="terms-title">Terms & Conditions</div>
      
      <div class="taxes-note">
        Taxes extra As per Govt Norms
      </div>

      <ul class="terms-list">
        ${quotation.paymentTerms ? `
        <li>
          <strong>Payment Terms:</strong> ${quotation.paymentTerms}
        </li>
        ` : ''}
        ${quotation.musicPolicy ? `
        <li>
          <strong>Music Regulations:</strong> ${quotation.musicPolicy}
        </li>
        ` : ''}
        ${quotation.permissionsRequired ? `
        <li>
          <strong>Permissions/Licenses:</strong> ${quotation.permissionsRequired}
        </li>
        ` : ''}
        ${quotation.gstPolicy ? `
        <li>
          <strong>GSTIN Requirement:</strong> ${quotation.gstPolicy}
        </li>
        ` : ''}
        ${quotation.venuePolicy ? `
        <li>
          <strong>Banquet Hall Choices:</strong> ${quotation.venuePolicy}
        </li>
        ` : ''}
        ${quotation.extraSpacePolicy ? `
        <li>
          <strong>Additional Space Charges:</strong> ${quotation.extraSpacePolicy}
        </li>
        ` : ''}
        ${quotation.electricityPolicy ? `
        <li>
          <strong>Electricity Supply:</strong> ${quotation.electricityPolicy}
        </li>
        ` : ''}
        ${quotation.decorPolicy ? `
        <li>
          <strong>Décor Services:</strong> ${quotation.decorPolicy}
        </li>
        ` : ''}
        ${quotation.chairsTablesPolicy ? `
        <li>
          <strong>Chair/Table Provision:</strong> ${quotation.chairsTablesPolicy}
        </li>
        ` : ''}
        ${quotation.prohibitedItems ? `
        <li>
          <strong>Prohibited Items:</strong> ${quotation.prohibitedItems}
        </li>
        ` : ''}
        ${quotation.damageLiability ? `
        <li>
          <strong>Damage Policy:</strong> ${quotation.damageLiability}
        </li>
        ` : ''}
        ${quotation.externalVendorPolicy ? `
        <li>
          <strong>External Vendors/Branding:</strong> ${quotation.externalVendorPolicy}
        </li>
        ` : ''}
        ${quotation.termsAndConditions && quotation.termsAndConditions.length > 0 ? quotation.termsAndConditions.map((term: string, index: number) => `
        <li>
          <strong>Term ${index + 1}:</strong> ${term}
        </li>
        `).join('') : ''}
      </ul>

      <div style="margin-top: 15px; padding: 10px; background: #f0f8f0; border-left: 4px solid #2d5016; font-size: 12px;">
        <strong>Note:-</strong><br>
        Term & Conditions Apply*<br>
        <strong style="color: #2d5016;">GST Extra as Applicable</strong>
      </div>
    </div>

    <!-- Contact Section -->
    <div class="contact-section">
      <div class="contact-closing">
        Looking forward to receive your confirmation, for any further details please feel free to call on us. Assuring you the best services at all times.
      </div>

      <div class="contact-details">
        <div class="contact-name">Yours Truly,</div>
        <div class="contact-name" style="margin-top: 5px;">Manager Banquets Sales</div>
        <div class="contact-role">Palm Springs Resort, Nashik</div>
        
        <div class="contact-info">
          <div><strong>Cell:</strong> +91 9923150400</div>
          <div style="margin-top: 4px;"><strong>Email:</strong> bqtsales@palmspringsindia.com</div>
          <div style="margin-top: 4px;">
            <strong>Address:</strong> Opposite Vasantrao Kanetkar Udyan | Gangapur Sawarrgaon Road | Govardhan | Nashik 422 222
          </div>
          <div style="margin-top: 4px;">
            <strong>Website:</strong> www.palmspringsindia.com | 
            <strong>Location:</strong> <a href="https://www.google.com/travel/hotels/s/BXZxn" style="color: #2563eb; text-decoration: none;">View on Google Maps</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}
