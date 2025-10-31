const { MongoClient, ObjectId } = require('mongodb');

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
  const dbName = process.env.MONGODB_DB_NAME || 'PALMSPRINGDB';
  const limit = parseInt(process.env.LIMIT || '10', 10);
  const dryRun = process.env.DRY_RUN === 'true';

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  const enquiriesCol = db.collection('enquiries');
  const quotationsCol = db.collection('quotations');
  const bookingsCol = db.collection('bookings');
  const followUpsCol = db.collection('follow_up_history');
  const quotationActivitiesCol = db.collection('quotation_activities');

  const lastEnquiries = await enquiriesCol
    .find({})
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit)
    .toArray();

  if (!lastEnquiries.length) {
    console.log('No enquiries found');
    await client.close();
    return;
  }

  const ids = lastEnquiries.map(e => e._id);
  const idStrs = ids.map(id => id.toString());
  const byEnquiry = { enquiryId: { $in: ids } };
  const byEnquiryString = { enquiryId: { $in: idStrs } };

  if (dryRun) {
    const q = await quotationsCol.countDocuments({ $or: [byEnquiry, byEnquiryString] });
    const b = await bookingsCol.countDocuments({ $or: [byEnquiry, byEnquiryString] });
    const f = await followUpsCol.countDocuments({ $or: [byEnquiry, byEnquiryString] });
    const qa = await quotationActivitiesCol.countDocuments({ $or: [byEnquiry, byEnquiryString] });
    console.log(`[DRY_RUN] Will delete: enquiries=${ids.length}, quotations=${q}, bookings=${b}, followUps=${f}, quotationActivities=${qa}`);
    await client.close();
    return;
  }

  const delQ = await quotationsCol.deleteMany({ $or: [byEnquiry, byEnquiryString] });
  const delB = await bookingsCol.deleteMany({ $or: [byEnquiry, byEnquiryString] });
  const delF = await followUpsCol.deleteMany({ $or: [byEnquiry, byEnquiryString] });
  const delQA = await quotationActivitiesCol.deleteMany({ $or: [byEnquiry, byEnquiryString] });
  const delE = await enquiriesCol.deleteMany({ _id: { $in: ids } });

  console.log(`Deleted: enquiries=${delE.deletedCount}, quotations=${delQ.deletedCount}, bookings=${delB.deletedCount}, followUps=${delF.deletedCount}, quotationActivities=${delQA.deletedCount}`);
  await client.close();
}

run().catch(err => { console.error(err); process.exit(1); });



