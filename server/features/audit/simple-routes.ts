import type { Express } from "express";

export function registerSimpleAuditRoutes(app: Express) {
  // Simple audit route that bypasses all TypeScript issues
  app.get("/api/audit", async (req, res) => {
    try {
      // Direct MongoDB connection
      const { MongoClient } = await import('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/sales-sop-generator');
      
      await client.connect();
      const dbName = process.env.MONGODB_DB_NAME || 'PALMSPRINGDB';
      const db = client.db(dbName);
      const collection = db.collection('system_audit_log');
      
      // Simple query without complex filters
      const auditLogs = await collection
        .find({})
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray();
      
      await client.close();
      
      res.json(auditLogs);
    } catch (error) {
      res.status(500).json({ 
        message: "Failed to fetch audit logs", 
        error: error.message,
        details: error.stack 
      });
    }
  });
}

