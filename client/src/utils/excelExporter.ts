import * as XLSX from 'xlsx';

export interface CustomerData {
  customerName: string;
  location: string;
  phone: string;
  email: string;
  eventType: string;
}

export function exportCustomersToExcel(customers: CustomerData[], filename?: string, metadata?: { dateRange?: { from: string; to: string }; eventType?: string; totalRecords: number }): void {
  try {
    // Create a new workbook
    const workbook = XLSX.utils.book_new();
    
    // Prepare metadata rows
    const metadataRows = [];
    
    // Add export information at the top
    metadataRows.push(['Customer Data Export Report']);
    metadataRows.push([]);
    metadataRows.push(['Export Date:', new Date().toLocaleDateString()]);
    metadataRows.push(['Total Records:', metadata?.totalRecords || customers.length]);
    
    if (metadata?.dateRange) {
      const fromDate = new Date(metadata.dateRange.from).toLocaleDateString();
      const toDate = new Date(metadata.dateRange.to).toLocaleDateString();
      metadataRows.push(['Date Range:', `${fromDate} to ${toDate}`]);
    }
    
    if (metadata?.eventType) {
      metadataRows.push(['Event Type Filter:', metadata.eventType]);
    }
    
    metadataRows.push([]);
    
    // Prepare customer data with proper headers
    const excelData = customers.map(customer => ({
      'Customer Name': customer.customerName || 'N/A',
      'Location': customer.location || 'N/A',
      'Phone': customer.phone || 'N/A',
      'Email': customer.email || 'N/A',
      'Event Type': customer.eventType || 'N/A'
    }));
    
    // Combine metadata and data
    const allData = [
      ...metadataRows,
      Object.keys(excelData[0] || {}), // Headers
      ...excelData.map(row => Object.values(row))
    ];
    
    // Create worksheet from combined data
    const worksheet = XLSX.utils.aoa_to_sheet(allData);
    
    // Set column widths for better formatting
    const columnWidths = [
      { wch: 25 }, // Customer Name
      { wch: 20 }, // Location
      { wch: 15 }, // Phone
      { wch: 30 }, // Email
      { wch: 20 }  // Event Type
    ];
    worksheet['!cols'] = columnWidths;
    
    // Add styling for metadata and headers
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    
    // Style the title row
    const titleCell = XLSX.utils.encode_cell({ r: 0, c: 0 });
    if (worksheet[titleCell]) {
      worksheet[titleCell].s = {
        font: { bold: true, size: 16 },
        alignment: { horizontal: "center" }
      };
    }
    
    // Style the header row (after metadata rows)
    const headerRowIndex = metadataRows.length;
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: headerRowIndex, c: col });
      if (!worksheet[cellAddress]) continue;
      
      worksheet[cellAddress].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: "E6E6FA" } },
        alignment: { horizontal: "center" }
      };
    }
    
    // Add the worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const finalFilename = filename || `customers-export-${timestamp}.xlsx`;
    
    // Write file with proper Excel format
    XLSX.writeFile(workbook, finalFilename, { 
      bookType: 'xlsx',
      type: 'binary'
    });
    
    } catch (error) {
    throw new Error('Failed to generate Excel file');
  }
}

export function formatCustomerDataFromEnquiries(enquiries: any[]): CustomerData[] {
  return enquiries.map(enquiry => ({
    customerName: enquiry.clientName || 'N/A',
    location: enquiry.city || 'N/A',
    phone: enquiry.contactNumber || 'N/A',
    email: enquiry.email || 'N/A',
    eventType: enquiry.eventType || 'N/A'
  }));
}

