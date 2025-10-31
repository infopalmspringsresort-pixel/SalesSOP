// Ensure this is only imported on server side
if (typeof window !== 'undefined') {
  throw new Error('MongoDB connection cannot be used on client side');
}

import { MongoClient, ServerApiVersion, type Db, type Collection } from 'mongodb';

let mongoClient: MongoClient | null = null;
let mongoDb: Db | null = null;

export async function getMongoClient(): Promise<MongoClient> {
  if (mongoClient && mongoDb) return mongoClient;

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME;

  // Debug logging to verify which connection is being used
  if (process.env.NODE_ENV !== 'production') {
    console.log('[MongoDB Debug] URI (first 80 chars):', uri ? uri.substring(0, 80) + '...' : 'NOT SET');
    console.log('[MongoDB Debug] Database Name:', dbName || 'NOT SET');
    
    // Check if it's old or new database
    if (uri) {
      if (uri.includes('slaessop.u5uwkci.mongodb.net')) {
        console.log('[MongoDB Debug] ✅ Using NEW Atlas database');
      } else if (uri.includes('palmsprings.nlxfz1k.mongodb.net')) {
        console.log('[MongoDB Debug] ⚠️  Using OLD Atlas database!');
      }
    }
  }

  if (!uri) {
    throw new Error('MONGODB_URI is not set');
  }
  if (!dbName) {
    throw new Error('MONGODB_DB_NAME is not set');
  }

  mongoClient = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
    maxPoolSize: 20,
    minPoolSize: 0,
    waitQueueTimeoutMS: 10000,
  });

  await mongoClient.connect();
  mongoDb = mongoClient.db(dbName);
  if (process.env.NODE_ENV !== 'production') {
    // Lightweight startup confirmation to verify env in dev
    // Do not log full URI for security
    // eslint-disable-next-line no-console
    console.log(`[Mongo] Connected to database: ${dbName}`);
  }
  return mongoClient;
}

export async function getMongoDb(): Promise<Db> {
  if (mongoDb) return mongoDb;
  await getMongoClient();
  return mongoDb as Db;
}

export async function getCollection<T = any>(name: string): Promise<Collection<T>> {
  const db = await getMongoDb();
  return db.collection<T>(name);
}

export async function mongoHealthCheck(): Promise<{ ok: boolean; pingMs?: number; error?: string }> {
  try {
    const db = await getMongoDb();
    const start = Date.now();
    // Use admin ping for broader coverage
    await db.command({ ping: 1 });
    return { ok: true, pingMs: Date.now() - start };
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err) };
  }
}

export async function closeMongo(): Promise<void> {
  if (mongoClient) {
    await mongoClient.close();
    mongoClient = null;
    mongoDb = null;
  }
}

