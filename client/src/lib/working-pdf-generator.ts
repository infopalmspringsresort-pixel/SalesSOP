import jsPDF from 'jspdf';

export interface WorkingQuotationPDFData {
  quotationNumber: string;
  quotationDate: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  expectedGuests: number;
  
  // Venue details (from actual schema)
  venueRentalItems: Array<{
    eventDate: string;
    venue: string;
    venueSpace: string;
    session: string;
    sessionRate: number;
  }>;
  
  // Room details (from actual schema)
  roomPackages: Array<{
    roomCategory: string;
    roomRate: number;
    totalRooms: number;
    requestedRooms: number;
    totalPersonOccupancy: number;
    day01Cost: number;
    day02Cost: number;
  }>;
  
  // Menu packages (from actual schema)
  menuPackages: Array<{
    id: string;
    name: string;
    type: string;
    price: number;
    gst: number;
    selectedItems: Array<{
      id: string;
      name: string;
      price: number;
      additionalPrice: number;
      isPackageItem: boolean;
    }>;
    customItems: Array<{
      name: string;
      price: number;
    }>;
    totalPackageItems: number;
    excludedItemCount: number;
    totalDeduction: number;
  }>;
  menuTotal: number;
  
  // Summary (from actual schema)
  venueRentalTotal: number;
  roomTotal: number;
  banquetTotal: number;
  grandTotal: number;
  
  // GST information
  includeGST: boolean;
  discountType?: string;
  discountValue?: number;
  discountAmount?: number;
  finalTotal?: number;
  
  // Terms and conditions
  termsAndConditions: string[];
}

export function downloadWorkingQuotationPDF(data: WorkingQuotationPDFData, filename: string) {
  const pdf = generateWorkingQuotationPDF(data);
  pdf.save(filename);
}

export function getWorkingQuotationPDFBlob(data: WorkingQuotationPDFData): Blob {
  const pdf = generateWorkingQuotationPDF(data);
  return pdf.output('blob');
}

export function generateWorkingQuotationPDF(data: WorkingQuotationPDFData): jsPDF {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const primaryColor = [41, 128, 185];
    const secondaryColor = [52, 73, 94];
    const accentColor = [46, 204, 113];
    const orangeColor = [255, 152, 0];
    const lightGrey = [245, 247, 250];

    let currentY = 30;

    // Safe text helper – prevents encoding issues
    const safeText = (text: any) => String(text || '').replace(/[^\x00-\x7F₹]/g, '');

    const lineGap = (lines = 1) => currentY += lines * 6;

    const checkPageBreak = (space: number) => {
      if (currentY + space > pageHeight - 30) {
        doc.addPage();
        currentY = 30;
      }
    };

    const addSectionHeader = (title: string, color: number[] = primaryColor) => {
      checkPageBreak(25);
      doc.setFillColor(...color);
      doc.roundedRect(20, currentY - 5, pageWidth - 40, 18, 3, 3, 'F');
      doc.setFontSize(15).setFont(undefined, 'bold').setTextColor(255, 255, 255);
      doc.text(title, 30, currentY + 6);
      currentY += 25;
    };

    const addCard = (title: string, content: () => void) => {
      checkPageBreak(25);
      doc.setFillColor(...lightGrey);
      doc.roundedRect(20, currentY - 5, pageWidth - 40, 10, 3, 3, 'F');
      doc.setDrawColor(230);
      doc.roundedRect(20, currentY - 5, pageWidth - 40, 10, 3, 3, 'S');

      doc.setFontSize(13).setTextColor(...primaryColor).setFont(undefined, 'bold');
      doc.text(title, 25, currentY + 5);
      currentY += 15;
      content();
      lineGap(1.5);
    };

    // Header
    doc.setFillColor(245, 247, 250);
    doc.rect(0, 0, pageWidth, 45, 'F');
    doc.setFontSize(26).setFont(undefined, 'bold').setTextColor(...primaryColor);
    doc.text('QUOTATION', 20, 25);

    doc.setFontSize(11).setTextColor(...secondaryColor);
    doc.text('Palm Springs Resort', 20, 38);
    doc.text('Luxury Hotel & Banquet', 20, 44);
    doc.text('Phone: +91 1234567890', pageWidth - 75, 38);
    doc.text('Email: info@palmsprings.com', pageWidth - 75, 44);

    currentY = 70;

    // Quotation Details
    addCard('Quotation Details', () => {
      doc.setFontSize(11).setTextColor(...secondaryColor);
      doc.text(safeText(`Quotation Number: ${data.quotationNumber}`), 25, currentY); lineGap();
      doc.text(safeText(`Date: ${data.quotationDate}`), 25, currentY); lineGap();
      doc.text(safeText(`Valid Until: ${data.quotationDate}`), 25, currentY);
    });

    // Client Details
    addCard('Client Details', () => {
      doc.setFontSize(11).setTextColor(...secondaryColor);
      doc.text(safeText(`Name: ${data.clientName}`), 25, currentY); lineGap();
      doc.text(safeText(`Email: ${data.clientEmail}`), 25, currentY); lineGap();
      doc.text(safeText(`Phone: ${data.clientPhone}`), 25, currentY); lineGap();
      doc.text(safeText(`Expected Guests: ${data.expectedGuests || 'Not specified'}`), 25, currentY);
    });
    
    // Venue Rental
    if (data.venueRentalItems?.length) {
      addSectionHeader('Venue Rental Details', orangeColor);
      data.venueRentalItems.forEach((venue, i) => {
        addCard(`Venue ${i + 1}`, () => {
          doc.setFontSize(11).setTextColor(...secondaryColor);
          doc.text(safeText(`Venue: ${venue.venue}`), 25, currentY); lineGap();
          doc.text(safeText(`Date: ${venue.eventDate}`), 25, currentY); lineGap();
          doc.text(safeText(`Space: ${venue.venueSpace}`), 25, currentY); lineGap();
          doc.text(safeText(`Session: ${venue.session}`), 25, currentY); lineGap();
          doc.setFont(undefined, 'bold').setTextColor(...accentColor);
          doc.text(`Rate: ₹${venue.sessionRate.toLocaleString()}`, 25, currentY);
        });
      });
    }

    // Food Packages
    if (data.menuPackages?.length) {
      addSectionHeader('Food & Beverage Packages', orangeColor);
      data.menuPackages.forEach(pkg => {
        addCard(`${pkg.name} (${pkg.type.toUpperCase()})`, () => {
          doc.setFontSize(11).setTextColor(...secondaryColor);
          doc.text(safeText(`Package Type: ${pkg.type.toUpperCase()}`), 25, currentY); lineGap();
          doc.setFont(undefined, 'bold').setTextColor(...accentColor);
          doc.text(safeText(`Base Price: ₹${pkg.price}`), 25, currentY); lineGap(1.5);

          // Included Items
          const included = pkg.selectedItems?.filter(i => i.isPackageItem);
          if (included?.length) {
            doc.setFontSize(10).setFont(undefined, 'bold').setTextColor(...primaryColor);
            doc.text('INCLUDED IN BASE PACKAGE:', 25, currentY); lineGap();
            included.forEach(i => {
              doc.setFontSize(9).setFont(undefined, 'normal').setTextColor(...secondaryColor);
              doc.text(`• ${safeText(i.name)}`, 30, currentY); lineGap();
            });
          }

          // Additional Items
          const extras = pkg.selectedItems?.filter(i => i.additionalPrice > 0);
          if (extras?.length) {
            doc.setFontSize(10).setFont(undefined, 'bold').setTextColor(...orangeColor);
            doc.text('ADDITIONAL ITEMS (EXTRA CHARGE):', 25, currentY); lineGap();
            extras.forEach(i => {
              doc.setFontSize(9).setFont(undefined, 'normal').setTextColor(...secondaryColor);
              doc.text(safeText(i.name), 30, currentY);
              doc.text(`+₹${i.additionalPrice}`, pageWidth - 30, currentY, { align: 'right' });
              lineGap();
            });
          }

          const total = pkg.price + (pkg.price * pkg.gst / 100);
          lineGap();
          doc.setFontSize(11).setTextColor(...primaryColor).setFont(undefined, 'bold');
          doc.text(`Package Total (incl. ${pkg.gst}% GST): ₹${total.toLocaleString()}`, 25, currentY);
        });
      });
    }

    // Cost Summary
    addSectionHeader('Cost Summary', primaryColor);
    const summary = [
      ['Venue Rental Total', data.venueRentalTotal],
      ['Room Accommodation Total', data.roomTotal],
      ['Menu Packages Total', data.menuTotal],
      ['Banquet Services Total', data.banquetTotal],
    ].filter(([_, val]) => val > 0);

    summary.forEach(([label, val]) => {
      checkPageBreak(10);
      doc.setFontSize(11).setTextColor(...secondaryColor);
      doc.text(safeText(label), 25, currentY);
      doc.setFont(undefined, 'bold').setTextColor(...accentColor);
      doc.text(`₹${val.toLocaleString()}`, pageWidth - 30, currentY, { align: 'right' });
      lineGap(1.3);
    });

    doc.setFontSize(13).setFont(undefined, 'bold').setTextColor(...primaryColor);
    doc.text('Grand Total:', 25, currentY);
    doc.text(`₹${data.grandTotal.toLocaleString()}`, pageWidth - 30, currentY, { align: 'right' });
    lineGap(1.5);

    if (data.includeGST) {
      doc.setFontSize(9).setTextColor(...secondaryColor);
      doc.text('All prices include applicable taxes', 25, currentY);
      lineGap(2);
    }

    // Discount
    if (data.discountValue && data.discountAmount) {
      addCard('Discount Applied', () => {
        doc.setFontSize(11).setTextColor(...secondaryColor);
        doc.text(safeText(`Type: ${data.discountType === 'percentage' ? data.discountValue + '%' : '₹' + data.discountValue}`), 25, currentY); lineGap();
        doc.text(`Discount Amount: -₹${data.discountAmount.toLocaleString()}`, 25, currentY);
      });
    }

    if (data.finalTotal && data.finalTotal !== data.grandTotal) {
      addCard('Final Total (After Discount)', () => {
        doc.setFontSize(13).setTextColor(...primaryColor).setFont(undefined, 'bold');
        doc.text(`₹${data.finalTotal.toLocaleString()}`, 25, currentY);
        lineGap();
        doc.setFontSize(10).setTextColor(...secondaryColor);
        doc.text('This is the total amount payable', 25, currentY);
      });
    }

    // Terms
    addSectionHeader('Terms and Conditions', secondaryColor);
    const terms = data.termsAndConditions?.length ? data.termsAndConditions : [
      "Payment Terms: 25% advance & 75% fifteen days prior to the function date.",
      "Music allowed till 10:00 PM within government regulations.",
      "GSTIN required before event date.",
      "Décor not included — available via empaneled vendors.",
      "Damage due to negligence will be billed appropriately."
    ];

    doc.setFontSize(9).setTextColor(...secondaryColor);
    terms.forEach((t, i) => {
      checkPageBreak(20);
      const lines = doc.splitTextToSize(`${i + 1}. ${safeText(t)}`, pageWidth - 50);
      lines.forEach(l => { doc.text(l, 25, currentY); lineGap(0.7); });
      lineGap(0.7);
    });

    // Footer
    const pages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(9).setTextColor(150);
      doc.text(`Page ${i} of ${pages}`, pageWidth - 40, pageHeight - 10);
    }

    doc.setFontSize(10).setTextColor(...secondaryColor);
    doc.text('Thank you for your business!', 20, currentY + 5);
    doc.text('This quotation is valid until the mentioned date.', 20, currentY + 10);

    return doc;
  } catch (err) {
    console.error('Error generating PDF:', err);
    throw err;
  }
}