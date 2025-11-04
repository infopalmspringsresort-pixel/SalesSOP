import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sales-sop-generator';
const DB_NAME = process.env.MONGODB_DB_NAME || 'PALMSPRINGDB';

async function fixQuotationVersions() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const quotationsCollection = db.collection('quotations');
    
    // Get all quotations grouped by enquiry
    const allQuotations = await quotationsCollection.find({}).sort({ createdAt: 1 }).toArray();
    
    // Group by enquiryId
    const quotationsByEnquiry = new Map<string, any[]>();
    
    for (const quotation of allQuotations) {
      const enquiryId = quotation.enquiryId.toString();
      if (!quotationsByEnquiry.has(enquiryId)) {
        quotationsByEnquiry.set(enquiryId, []);
      }
      quotationsByEnquiry.get(enquiryId)!.push(quotation);
    }
    
    // Update versions for each enquiry
    let totalUpdated = 0;
    
    for (const [enquiryId, quotations] of quotationsByEnquiry.entries()) {
      // Sort by createdAt to determine version order
      quotations.sort((a, b) => {
        const dateA = a.createdAt || new Date(0);
        const dateB = b.createdAt || new Date(0);
        return dateA.getTime() - dateB.getTime();
      });
      
      // Update each quotation with correct version number
      for (let i = 0; i < quotations.length; i++) {
        const quotation = quotations[i];
        const version = i + 1;
        
        // Only update if version is missing or incorrect
        if (!quotation.version || quotation.version !== version) {
          await quotationsCollection.updateOne(
            { _id: quotation._id },
            { $set: { version } }
          );
          totalUpdated++;
          console.log(`✅ Updated ${quotation.quotationNumber} to Version ${version}`);
        }
      }
    }
    
    console.log(`\n✅ Total quotations updated: ${totalUpdated}`);
    
  } catch (error) {
    console.error('❌ Error fixing quotation versions:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

fixQuotationVersions();

