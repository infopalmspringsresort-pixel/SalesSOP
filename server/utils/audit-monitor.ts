import { MongoClient } from 'mongodb';
// dotenv removed - loading handled in server/index.ts to ensure correct .env file

interface AuditStats {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  businessOperations: number;
  securityEvents: number;
  averageResponseTime: number;
  topActions: Array<{ action: string; count: number }>;
  topUsers: Array<{ userId: string; count: number }>;
  recentErrors: Array<{ error: string; count: number; lastOccurred: Date }>;
}

export class AuditMonitor {
  private client: MongoClient | null = null;
  private dbName: string;
  private uri: string;

  constructor() {
    this.uri = process.env.MONGODB_URI!;
    this.dbName = process.env.MONGODB_DB_NAME!;
    if (!this.uri || !this.dbName) {
      throw new Error('MongoDB connection details missing.');
    }
  }

  private async connect(): Promise<MongoClient> {
    if (this.client && this.client.topology && this.client.topology.isConnected()) {
      return this.client;
    }
    this.client = new MongoClient(this.uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    });
    await this.client.connect();
    return this.client;
  }

  private async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      }
  }

  // Get comprehensive audit statistics
  async getAuditStats(dateFrom?: Date, dateTo?: Date): Promise<AuditStats> {
    try {
      const client = await this.connect();
      const db = client.db(this.dbName);
      const auditCollection = db.collection('system_audit_log');

      const matchStage: any = {};
      if (dateFrom) {
        matchStage.createdAt = { ...matchStage.createdAt, $gte: dateFrom };
      }
      if (dateTo) {
        matchStage.createdAt = { ...matchStage.createdAt, $lte: dateTo };
      }

      const pipeline = [
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalOperations: { $sum: 1 },
            successfulOperations: {
              $sum: { $cond: ['$details.success', 1, 0] }
            },
            failedOperations: {
              $sum: { $cond: ['$details.success', 0, 1] }
            },
            businessOperations: {
              $sum: { $cond: ['$details.businessContext', 1, 0] }
            },
            securityEvents: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      '$action',
                      ['login_failed', 'password_reset_requested', 'user_deactivated']
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            averageResponseTime: { $avg: '$details.duration' },
            actions: { $push: '$action' },
            users: { $push: '$userId' },
            errors: {
              $push: {
                $cond: [
                  { $ne: ['$details.error', null] },
                  {
                    error: '$details.error',
                    timestamp: '$createdAt'
                  },
                  null
                ]
              }
            }
          }
        }
      ];

      const result = await auditCollection.aggregate(pipeline).toArray();
      const stats = result[0] || {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        businessOperations: 0,
        securityEvents: 0,
        averageResponseTime: 0,
        actions: [],
        users: [],
        errors: []
      };

      // Calculate top actions
      const actionCounts = stats.actions.reduce((acc: any, action: string) => {
        acc[action] = (acc[action] || 0) + 1;
        return acc;
      }, {});
      const topActions = Object.entries(actionCounts)
        .map(([action, count]) => ({ action, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Calculate top users
      const userCounts = stats.users
        .filter((userId: string) => userId && userId !== 'anonymous')
        .reduce((acc: any, userId: string) => {
          acc[userId] = (acc[userId] || 0) + 1;
          return acc;
        }, {});
      const topUsers = Object.entries(userCounts)
        .map(([userId, count]) => ({ userId, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Calculate recent errors
      const errorCounts = stats.errors
        .filter((error: any) => error && error.error)
        .reduce((acc: any, error: any) => {
          const key = error.error;
          if (!acc[key]) {
            acc[key] = { count: 0, lastOccurred: new Date(0) };
          }
          acc[key].count++;
          if (new Date(error.timestamp) > acc[key].lastOccurred) {
            acc[key].lastOccurred = new Date(error.timestamp);
          }
          return acc;
        }, {});
      const recentErrors = Object.entries(errorCounts)
        .map(([error, data]: [string, any]) => ({
          error,
          count: data.count,
          lastOccurred: data.lastOccurred
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        totalOperations: stats.totalOperations,
        successfulOperations: stats.successfulOperations,
        failedOperations: stats.failedOperations,
        businessOperations: stats.businessOperations,
        securityEvents: stats.securityEvents,
        averageResponseTime: Math.round(stats.averageResponseTime || 0),
        topActions,
        topUsers,
        recentErrors
      };
    } catch (error) {
      return {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        businessOperations: 0,
        securityEvents: 0,
        averageResponseTime: 0,
        topActions: [],
        topUsers: [],
        recentErrors: []
      };
    } finally {
      await this.disconnect();
    }
  }

  // Check for audit logging gaps
  async checkAuditGaps(): Promise<{
    missingLogs: string[];
    recommendations: string[];
  }> {
    try {
      const client = await this.connect();
      const db = client.db(this.dbName);
      const auditCollection = db.collection('system_audit_log');

      // Check for missing critical operations
      const criticalActions = [
        'login', 'logout', 'user_created', 'user_updated',
        'enquiry_created', 'booking_created', 'report_generated'
      ];

      const missingLogs: string[] = [];
      const recommendations: string[] = [];

      for (const action of criticalActions) {
        const count = await auditCollection.countDocuments({ action });
        if (count === 0) {
          missingLogs.push(`No logs found for action: ${action}`);
        }
      }

      // Check for operations without audit logs
      const recentLogs = await auditCollection
        .find({ createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } })
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray();

      if (recentLogs.length === 0) {
        missingLogs.push('No audit logs found in the last 24 hours');
        recommendations.push('Check if audit logging middleware is properly configured');
      }

      // Check for failed operations without error logging
      const failedOps = await auditCollection.countDocuments({
        'details.success': false,
        'details.error': { $exists: false }
      });

      if (failedOps > 0) {
        recommendations.push(`${failedOps} failed operations without error details - enhance error logging`);
      }

      // Check for operations without business context
      const nonBusinessOps = await auditCollection.countDocuments({
        'details.businessContext': { $ne: true },
        action: { $in: ['created', 'updated', 'deleted'] }
      });

      if (nonBusinessOps > 0) {
        recommendations.push(`${nonBusinessOps} business operations without business context flag`);
      }

      return { missingLogs, recommendations };
    } catch (error) {
      return {
        missingLogs: ['Failed to check audit gaps'],
        recommendations: ['Check database connection and audit logging configuration']
      };
    } finally {
      await this.disconnect();
    }
  }

  // Generate audit compliance report
  async generateComplianceReport(): Promise<{
    complianceScore: number;
    issues: string[];
    recommendations: string[];
  }> {
    const gaps = await this.checkAuditGaps();
    const stats = await this.getAuditStats();

    let complianceScore = 100;
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for missing critical logs
    if (gaps.missingLogs.length > 0) {
      complianceScore -= gaps.missingLogs.length * 10;
      issues.push(...gaps.missingLogs);
    }

    // Check for low success rate
    if (stats.totalOperations > 0) {
      const successRate = (stats.successfulOperations / stats.totalOperations) * 100;
      if (successRate < 90) {
        complianceScore -= 20;
        issues.push(`Low success rate: ${successRate.toFixed(1)}%`);
        recommendations.push('Investigate failed operations and improve error handling');
      }
    }

    // Check for security events
    if (stats.securityEvents > 10) {
      complianceScore -= 10;
      issues.push(`High number of security events: ${stats.securityEvents}`);
      recommendations.push('Review security events and implement additional monitoring');
    }

    // Add general recommendations
    recommendations.push(...gaps.recommendations);
    recommendations.push('Implement real-time audit monitoring dashboard');
    recommendations.push('Set up automated alerts for critical audit events');

    return {
      complianceScore: Math.max(0, complianceScore),
      issues,
      recommendations
    };
  }
}

export const auditMonitor = new AuditMonitor();

