// Ensure this is only imported on server side
if (typeof window !== 'undefined') {
  throw new Error('MongoDB storage cannot be used on client side');
}

import { ObjectId } from 'mongodb';
import { getCollection, getMongoDb } from './mongo';
import type { IStorage } from './storage';
import type {
  User, UpsertUser, Role, InsertRole, UserNew, InsertUserNew,
  PasswordResetToken, InsertPasswordResetToken, DropdownOption, InsertDropdownOption,
  SystemAuditLog, InsertSystemAuditLog,
  Enquiry, InsertEnquiry, Quotation,
  Booking, InsertBooking, Beo, InsertBeo, Approval,
  Amendment, FollowUpHistory,
  EnquiryTransfer, InsertEnquiryTransfer
} from '@shared/schema-client';

export class MongoStorage implements IStorage {
  // Helper to convert ObjectId to string for API responses
  private toApiFormat<T extends { _id?: ObjectId; [key: string]: any }>(doc: T): T {
    if (doc && doc._id) {
      return { ...doc, id: doc._id.toString(), _id: undefined };
    }
    return doc;
  }

  // Helper to convert string IDs to ObjectIds for queries
  private toObjectId(id: string): ObjectId {
    return new ObjectId(id);
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const collection = await getCollection<User>('users');
    const user = await collection.findOne({ _id: this.toObjectId(id) });
    return user ? this.toApiFormat(user) : undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const collection = await getCollection<User>('users');
    const user = await collection.findOne({ email: email.toLowerCase().trim() });
    return user ? this.toApiFormat(user) : undefined;
  }

  async updateUserPassword(userId: string, passwordHash: string): Promise<void> {
    const collection = await getCollection('users');
    await collection.updateOne(
      { _id: this.toObjectId(userId) },
      { 
        $set: { 
          passwordHash,
          authProvider: 'local',
          updatedAt: new Date()
        }
      }
    );
  }

  async createPasswordResetToken(tokenData: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const collection = await getCollection<PasswordResetToken>('password_reset_tokens');
    const doc = {
      ...tokenData,
      userId: this.toObjectId(tokenData.userId),
      createdAt: new Date(),
    };
    const result = await collection.insertOne(doc);
    return this.toApiFormat({ ...doc, _id: result.insertedId });
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const collection = await getCollection<PasswordResetToken>('password_reset_tokens');
    const tokenDoc = await collection.findOne({ token });
    return tokenDoc ? this.toApiFormat(tokenDoc) : undefined;
  }

  async markPasswordResetTokenUsed(tokenId: string): Promise<void> {
    const collection = await getCollection('password_reset_tokens');
    await collection.updateOne(
      { _id: this.toObjectId(tokenId) },
      { $set: { used: true } }
    );
  }

  async getUsers(): Promise<User[]> {
    const collection = await getCollection<User>('users');
    const users = await collection.find({}).sort({ firstName: 1, lastName: 1 }).toArray();
    return users.map(user => this.toApiFormat(user));
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const collection = await getCollection<User>('users');
    const normalizedData = {
      ...userData,
      email: userData.email?.toLowerCase().trim(),
      updatedAt: new Date(),
    };

    const filter = userData.id ? { _id: this.toObjectId(userData.id) } : { email: normalizedData.email };
    const update = {
      $set: normalizedData,
      $setOnInsert: { createdAt: new Date() },
    };

    const result = await collection.findOneAndUpdate(
      filter,
      update,
      { upsert: true, returnDocument: 'after' }
    );

    return this.toApiFormat(result!);
  }

  // Role management
  async getRoles(): Promise<Role[]> {
    const collection = await getCollection<Role>('roles');
    const roles = await collection.find({}).sort({ displayName: 1 }).toArray();
    return roles.map(role => this.toApiFormat(role));
  }

  async getRoleById(id: string): Promise<Role | undefined> {
    const collection = await getCollection<Role>('roles');
    const role = await collection.findOne({ _id: this.toObjectId(id) });
    return role ? this.toApiFormat(role) : undefined;
  }

  async createRole(role: InsertRole): Promise<Role> {
    const collection = await getCollection<Role>('roles');
    const doc = {
      ...role,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await collection.insertOne(doc);
    return this.toApiFormat({ ...doc, _id: result.insertedId });
  }

  async updateRole(id: string, data: Partial<Role>): Promise<Role> {
    const collection = await getCollection<Role>('roles');
    const result = await collection.findOneAndUpdate(
      { _id: this.toObjectId(id) },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return this.toApiFormat(result!);
  }

  // User management with roles
  async getUserWithRole(id: string): Promise<(User & { role?: Role }) | undefined> {
    const usersCollection = await getCollection<User>('users');
    const rolesCollection = await getCollection<Role>('roles');
    
    const user = await usersCollection.findOne({ _id: this.toObjectId(id) });
    if (!user) return undefined;

    let role: Role | undefined;
    if (user.roleId) {
      // User has roleId (ObjectId reference)
      const roleDoc = await rolesCollection.findOne({ _id: this.toObjectId(user.roleId) });
      role = roleDoc ? this.toApiFormat(roleDoc) : undefined;
    } else if (user.role) {
      // User has role as string field (fallback for direct role assignment)
      const roleDoc = await rolesCollection.findOne({ name: user.role });
      role = roleDoc ? this.toApiFormat(roleDoc) : undefined;
    }

    return { ...this.toApiFormat(user), role };
  }

  async getUsersWithRoles(): Promise<(User & { role?: Role })[]> {
    const usersCollection = await getCollection<User>('users');
    const rolesCollection = await getCollection<Role>('roles');
    
    const users = await usersCollection.find({}).sort({ firstName: 1, lastName: 1 }).toArray();
    const roles = await rolesCollection.find({}).toArray();
    const roleMap = new Map(roles.map(r => [r._id.toString(), this.toApiFormat(r)]));
    const roleNameMap = new Map(roles.map(r => [r.name, this.toApiFormat(r)]));

    return users.map(user => {
      let role: Role | undefined;
      
      if (user.roleId) {
        // User has roleId (ObjectId reference)
        role = roleMap.get(user.roleId.toString());
      } else if (user.role) {
        // User has role as string field (fallback for direct role assignment)
        role = roleNameMap.get(user.role);
      }
      
      return {
        ...this.toApiFormat(user),
        role,
      };
    });
  }

  async createUser(user: InsertUserNew): Promise<UserNew> {
    const collection = await getCollection<UserNew>('users');
    const doc = {
      ...user,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await collection.insertOne(doc);
    return this.toApiFormat({ ...doc, _id: result.insertedId });
  }

  async updateUser(id: string, data: Partial<UserNew>): Promise<UserNew> {
    const collection = await getCollection<UserNew>('users');
    const result = await collection.findOneAndUpdate(
      { _id: this.toObjectId(id) },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return this.toApiFormat(result!);
  }

  async deactivateUser(id: string): Promise<UserNew> {
    const collection = await getCollection<UserNew>('users');
    const result = await collection.findOneAndUpdate(
      { _id: this.toObjectId(id) },
      { $set: { status: 'inactive', updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return this.toApiFormat(result!);
  }

  async assignUserRole(userId: string, roleId: string): Promise<UserNew> {
    const collection = await getCollection<UserNew>('users');
    const result = await collection.findOneAndUpdate(
      { _id: this.toObjectId(userId) },
      { $set: { roleId: this.toObjectId(roleId), updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return this.toApiFormat(result!);
  }

  // Permission checking
  async hasPermission(userId: string, module: string, action: string): Promise<boolean> {
    const userWithRole = await this.getUserWithRole(userId);
    
    if (!userWithRole || !userWithRole.role) {
      return false;
    }

    const permissions = userWithRole.role.permissions as any;
    
    // Admin has all permissions
    if (userWithRole.role.name === 'admin') {
      return true;
    }

    // Check specific permission
    return permissions?.[module]?.[action] === true;
  }

  async getUserPermissions(userId: string): Promise<any> {
    const userWithRole = await this.getUserWithRole(userId);
    
    if (!userWithRole || !userWithRole.role) {
      return {};
    }

    return userWithRole.role.permissions || {};
  }

  // System audit log
  async createSystemAuditLog(log: InsertSystemAuditLog): Promise<SystemAuditLog> {
    const collection = await getCollection<SystemAuditLog>('system_audit_log');
    const doc = {
      ...log,
      userId: log.userId ? this.toObjectId(log.userId) : undefined,
      createdAt: new Date(),
    };
    const result = await collection.insertOne(doc);
    return this.toApiFormat({ ...doc, _id: result.insertedId });
  }

  async getSystemAuditLogs(filters?: any): Promise<SystemAuditLog[]> {
    const collection = await getCollection<SystemAuditLog>('system_audit_log');
    const query: any = {};
    
    if (filters?.userId) {
      query.userId = this.toObjectId(filters.userId);
    }
    if (filters?.userRole) {
      query.userRole = filters.userRole;
    }
    if (filters?.action) {
      query.action = filters.action;
    }
    if (filters?.module) {
      query.module = filters.module;
    }
    if (filters?.dateFrom) {
      query.createdAt = { ...query.createdAt, $gte: new Date(filters.dateFrom) };
    }
    if (filters?.dateTo) {
      query.createdAt = { ...query.createdAt, $lte: new Date(filters.dateTo) };
    }

    const logs = await collection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(filters?.limit || 100)
      .skip(filters?.offset || 0)
      .toArray();
    
    // Filter out unwanted fields from the response
    return logs.map(log => {
      const { resourceType, resourceId, details, ipAddress, userAgent, ...cleanLog } = log;
      return this.toApiFormat(cleanLog);
    });
  }

  // Dropdown management
  async getDropdownOptions(category: string): Promise<DropdownOption[]> {
    const collection = await getCollection<DropdownOption>('dropdown_options');
    const options = await collection
      .find({ category, isActive: true })
      .sort({ sortOrder: 1, label: 1 })
      .toArray();
    return options.map(option => this.toApiFormat(option));
  }

  async createDropdownOption(option: InsertDropdownOption): Promise<DropdownOption> {
    const collection = await getCollection<DropdownOption>('dropdown_options');
    const doc = {
      ...option,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await collection.insertOne(doc);
    return this.toApiFormat({ ...doc, _id: result.insertedId });
  }

  async updateDropdownOption(id: string, data: Partial<DropdownOption>): Promise<DropdownOption> {
    const collection = await getCollection<DropdownOption>('dropdown_options');
    const result = await collection.findOneAndUpdate(
      { _id: this.toObjectId(id) },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return this.toApiFormat(result!);
  }

  async deactivateDropdownOption(id: string): Promise<DropdownOption> {
    const collection = await getCollection<DropdownOption>('dropdown_options');
    const result = await collection.findOneAndUpdate(
      { _id: this.toObjectId(id) },
      { $set: { isActive: false, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return this.toApiFormat(result!);
  }

  // Enquiry operations
  async createEnquiry(enquiry: InsertEnquiry): Promise<Enquiry> {
    const collection = await getCollection<Enquiry>('enquiries');
    const enquiryNumber = await this.getNextEnquiryNumber();
    const doc = {
      ...enquiry,
      enquiryNumber,
      salespersonId: enquiry.salespersonId ? this.toObjectId(enquiry.salespersonId) : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await collection.insertOne(doc);
    return this.toApiFormat({ ...doc, _id: result.insertedId });
  }

  async getEnquiries(filters?: any): Promise<any[]> {
    const enquiriesCollection = await getCollection<Enquiry>('enquiries');
    const usersCollection = await getCollection<User>('users');
    
    const query: any = {};
    if (filters?.status) {
      query.status = filters.status;
    }
    if (filters?.search) {
      query.$or = [
        { enquiryNumber: { $regex: filters.search, $options: 'i' } },
        { clientName: { $regex: filters.search, $options: 'i' } }
      ];
    }
    // Add date range filtering
    if (filters?.dateFrom || filters?.dateTo) {
      query.enquiryDate = {};
      if (filters.dateFrom) {
        const dateFrom = new Date(filters.dateFrom);
        dateFrom.setHours(0, 0, 0, 0);
        query.enquiryDate.$gte = dateFrom;
      }
      if (filters.dateTo) {
        const dateTo = new Date(filters.dateTo);
        dateTo.setHours(23, 59, 59, 999);
        query.enquiryDate.$lte = dateTo;
      }
    }

    const enquiries = await enquiriesCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    // Get salesperson details and follow-up status for each enquiry
    const enrichedEnquiries = await Promise.all(
      enquiries.map(async (enquiry) => {
        let salesperson = null;
        if (enquiry.salespersonId) {
          // Handle both string and ObjectId formats
          let salespersonDoc;
          if (typeof enquiry.salespersonId === 'string') {
            salespersonDoc = await usersCollection.findOne({ _id: this.toObjectId(enquiry.salespersonId) });
          } else {
            salespersonDoc = await usersCollection.findOne({ _id: enquiry.salespersonId });
          }
          
          if (salespersonDoc) {
            salesperson = {
              id: salespersonDoc._id.toString(),
              firstName: salespersonDoc.firstName,
              lastName: salespersonDoc.lastName,
              email: salespersonDoc.email,
              role: salespersonDoc.role,
            };
          }
        }

        // Check if follow-up is completed and get the earliest incomplete follow-up date
        let hasIncompleteFollowUp = false;
        let nextFollowUpDate = null;
        const followUpHistoryCollection = await getCollection<FollowUpHistory>('follow_up_history');
        
        // First check if there are ANY follow-up history entries for this enquiry
        const totalFollowUps = await followUpHistoryCollection.countDocuments({
          enquiryId: enquiry._id
        });
        
        // Only check for incomplete follow-ups if history entries exist
        if (totalFollowUps > 0) {
          const incompleteFollowUps = await followUpHistoryCollection.find({
            enquiryId: enquiry._id,
            completed: { $ne: true }
          }).sort({ followUpDate: 1 }).limit(1).toArray();
          
          if (incompleteFollowUps.length > 0) {
            hasIncompleteFollowUp = true;
            nextFollowUpDate = incompleteFollowUps[0].followUpDate;
          }
          // If all follow-ups are completed (incompleteFollowUps.length === 0), don't show any follow-up
        } else if (enquiry.followUpDate) {
          // Fallback to enquiry-level follow-up date ONLY if no history entries exist at all
          hasIncompleteFollowUp = true;
          nextFollowUpDate = enquiry.followUpDate;
        }

        return {
          ...this.toApiFormat(enquiry),
          salesperson,
          hasIncompleteFollowUp,
          nextFollowUpDate,
        };
      })
    );

    return enrichedEnquiries;
  }

  async getEnquiryById(id: string): Promise<any> {
    const enquiriesCollection = await getCollection<Enquiry>('enquiries');
    const usersCollection = await getCollection<User>('users');
    
    const enquiry = await enquiriesCollection.findOne({ _id: this.toObjectId(id) });
    if (!enquiry) return undefined;

    let salesperson = null;
    if (enquiry.salespersonId) {
      // Handle both string and ObjectId formats
      let salespersonDoc;
      if (typeof enquiry.salespersonId === 'string') {
        salespersonDoc = await usersCollection.findOne({ _id: this.toObjectId(enquiry.salespersonId) });
      } else {
        salespersonDoc = await usersCollection.findOne({ _id: enquiry.salespersonId });
      }
      
      if (salespersonDoc) {
        salesperson = {
          id: salespersonDoc._id.toString(),
          firstName: salespersonDoc.firstName,
          lastName: salespersonDoc.lastName,
          email: salespersonDoc.email,
          role: salespersonDoc.role,
        };
      }
    }

    // Check if follow-up is completed and get the earliest incomplete follow-up date
    let hasIncompleteFollowUp = false;
    let nextFollowUpDate = null;
    const followUpHistoryCollection = await getCollection<FollowUpHistory>('follow_up_history');
    
    // First check if there are ANY follow-up history entries for this enquiry
    const totalFollowUps = await followUpHistoryCollection.countDocuments({
      enquiryId: enquiry._id
    });
    
    // Only check for incomplete follow-ups if history entries exist
    if (totalFollowUps > 0) {
      const incompleteFollowUps = await followUpHistoryCollection.find({
        enquiryId: enquiry._id,
        completed: { $ne: true }
      }).sort({ followUpDate: 1 }).limit(1).toArray();
      
      if (incompleteFollowUps.length > 0) {
        hasIncompleteFollowUp = true;
        nextFollowUpDate = incompleteFollowUps[0].followUpDate;
      }
      // If all follow-ups are completed (incompleteFollowUps.length === 0), don't show any follow-up
    } else if (enquiry.followUpDate) {
      // Fallback to enquiry-level follow-up date ONLY if no history entries exist at all
      hasIncompleteFollowUp = true;
      nextFollowUpDate = enquiry.followUpDate;
    }

    return {
      ...this.toApiFormat(enquiry),
      salesperson,
      hasIncompleteFollowUp,
      nextFollowUpDate,
    };
  }

  async updateEnquiry(id: string, data: Partial<Enquiry>): Promise<Enquiry> {
    const collection = await getCollection<Enquiry>('enquiries');
    const result = await collection.findOneAndUpdate(
      { _id: this.toObjectId(id) },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return this.toApiFormat(result!);
  }

  async updateEnquiryWithStatusHistory(id: string, data: Partial<Enquiry>, changedById?: string): Promise<Enquiry> {
    const enquiriesCollection = await getCollection<Enquiry>('enquiries');
    const statusHistoryCollection = await getCollection<EnquiryStatusHistory>('enquiry_status_history');
    
    // Get current enquiry
    const currentEnquiry = await enquiriesCollection.findOne({ _id: this.toObjectId(id) });
    if (!currentEnquiry) {
      throw new Error('Enquiry not found');
    }

    // Validate status transition if status is being changed
    if (data.status && data.status !== currentEnquiry.status) {
      const validStatuses = this.getValidNextStatuses(currentEnquiry.status || 'new');
      if (!validStatuses.includes(data.status)) {
        throw new Error(`Invalid status transition from ${currentEnquiry.status} to ${data.status}. Valid transitions: ${validStatuses.join(', ')}`);
      }

      // Require follow-up date for "quotation_sent" status
      if (data.status === 'quotation_sent' && !data.followUpDate) {
        throw new Error('Follow-up date is required when sending quotation');
      }

      // Create status history entry
      if (changedById) {
        await statusHistoryCollection.insertOne({
          enquiryId: this.toObjectId(id),
          fromStatus: currentEnquiry.status || 'new',
          toStatus: data.status,
          changedById: this.toObjectId(changedById),
          notes: data.notes || null,
          followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
          createdAt: new Date(),
        });
        } else {
        }

        if (data.status === 'quotation_sent' && data.followUpDate && changedById) {
          const followUpHistoryCollection = await getCollection<FollowUpHistory>('follow_up_history');
          const followUpRecord = {
            enquiryId: this.toObjectId(id),
            followUpDate: new Date(data.followUpDate),
            followUpTime: '12:00', // Default time
            notes: data.followUpNotes || 'Follow-up scheduled when quotation was sent',
            setById: this.toObjectId(changedById),
            completed: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          await followUpHistoryCollection.insertOne(followUpRecord);
        }
        

      // Auto-complete all pending follow-ups when enquiry is booked
      if (data.status === 'booked' && changedById) {
        const followUpHistoryCollection = await getCollection<FollowUpHistory>('follow_up_history');
        const result = await followUpHistoryCollection.updateMany(
          { 
            enquiryId: this.toObjectId(id),
            completed: { $ne: true }
          },
          {
            $set: {
              completed: true,
              completedAt: new Date(),
              completedById: this.toObjectId(changedById),
              completionNotes: 'Automatically completed when enquiry was booked',
              updatedAt: new Date(),
            }
          }
        );
        }
    }

    // Update the enquiry
    const result = await enquiriesCollection.findOneAndUpdate(
      { _id: this.toObjectId(id) },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    return this.toApiFormat(result!);
  }

  async getNextEnquiryNumber(): Promise<string> {
    const db = await getMongoDb();
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    const counterId = `enquiries:${year}-${month}`;
    const result = await db.collection('counters').findOneAndUpdate(
      { _id: counterId },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: 'after' }
    );
    
    const nextNumber = result.seq || 1;
    return `ENQ-${year}-${month}-${String(nextNumber).padStart(3, '0')}`;
  }

  // Status workflow validation
  private getValidNextStatuses(currentStatus: string): string[] {
    const statusFlow: Record<string, string[]> = {
      'new': ['quotation_sent', 'lost'],
      'quotation_sent': ['ongoing', 'lost'],
      'ongoing': ['converted', 'lost'],
      'converted': ['booked', 'lost'],
      'booked': ['closed'],
      'closed': [], // Terminal state
      'lost': [] // Terminal state
    };
    return statusFlow[currentStatus] || [];
  }

  // Follow-up History operations
  async createFollowUpHistory(followUp: InsertFollowUpHistory): Promise<FollowUpHistory> {
    const collection = await getCollection<FollowUpHistory>('follow_up_history');
    const doc = {
      ...followUp,
      enquiryId: this.toObjectId(followUp.enquiryId),
      setById: this.toObjectId(followUp.setById),
      completedById: followUp.completedById ? this.toObjectId(followUp.completedById) : undefined,
      followUpDate: new Date(followUp.followUpDate),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await collection.insertOne(doc);
    return this.toApiFormat({ ...doc, _id: result.insertedId });
  }

  async getFollowUpHistoryByEnquiry(enquiryId: string): Promise<any[]> {
    const followUpCollection = await getCollection<FollowUpHistory>('follow_up_history');
    const enquiriesCollection = await getCollection<Enquiry>('enquiries');
    const usersCollection = await getCollection<User>('users');
    
    const followUps = await followUpCollection
      .find({ enquiryId: this.toObjectId(enquiryId) })
      .sort({ createdAt: -1 })
      .toArray();

    const enrichedFollowUps = await Promise.all(
      followUps.map(async (followUp) => {
        // Get enquiry details
        const enquiry = await enquiriesCollection.findOne({ _id: followUp.enquiryId });
        // Get salesperson details
        let salesperson = null;
        if (enquiry?.salespersonId) {
          const salespersonDoc = await usersCollection.findOne({ _id: enquiry.salespersonId });
          if (salespersonDoc) {
            salesperson = {
              firstName: salespersonDoc.firstName,
              lastName: salespersonDoc.lastName,
            };
          }
        }

        return {
          ...this.toApiFormat(followUp),
          enquiryNumber: enquiry?.enquiryNumber,
          clientName: enquiry?.clientName,
          clientPhone: enquiry?.contactNumber,
          clientEmail: enquiry?.email,
          eventDate: enquiry?.eventDate,
          status: enquiry?.status,
          salespersonFirstName: salesperson?.firstName,
          salespersonLastName: salesperson?.lastName,
        };
      })
    );

    return enrichedFollowUps;
  }

  async updateFollowUpHistory(id: string, data: Partial<FollowUpHistory>): Promise<FollowUpHistory> {
    const collection = await getCollection<FollowUpHistory>('follow_up_history');
    const result = await collection.findOneAndUpdate(
      { _id: this.toObjectId(id) },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return this.toApiFormat(result!);
  }

  async markFollowUpCompleted(id: string, completedById: string, completionNotes?: string): Promise<FollowUpHistory> {
    const collection = await getCollection<FollowUpHistory>('follow_up_history');
    const result = await collection.findOneAndUpdate(
      { _id: this.toObjectId(id) },
      {
        $set: {
          completed: true,
          completedAt: new Date(),
          completedById: this.toObjectId(completedById),
          completionNotes,
          updatedAt: new Date(),
        }
      },
      { returnDocument: 'after' }
    );
    return this.toApiFormat(result!);
  }

  async getAllFollowUps(): Promise<any[]> {
    const followUpCollection = await getCollection<FollowUpHistory>('follow_up_history');
    const enquiriesCollection = await getCollection<Enquiry>('enquiries');
    const usersCollection = await getCollection<User>('users');
    
    const followUps = await followUpCollection
      .find({ completed: false })
      .sort({ followUpDate: 1 })
      .toArray();

    const enrichedFollowUps = await Promise.all(
      followUps.map(async (followUp) => {
        // Get enquiry details
        const enquiry = await enquiriesCollection.findOne({ _id: followUp.enquiryId });
        // Get salesperson details
        let salesperson = null;
        if (enquiry?.salespersonId) {
          const salespersonDoc = await usersCollection.findOne({ _id: enquiry.salespersonId });
          if (salespersonDoc) {
            salesperson = {
              firstName: salespersonDoc.firstName,
              lastName: salespersonDoc.lastName,
            };
          }
        }

        return {
          ...this.toApiFormat(followUp),
          enquiryNumber: enquiry?.enquiryNumber,
          clientName: enquiry?.clientName,
          clientPhone: enquiry?.contactNumber,
          clientEmail: enquiry?.email,
          eventDate: enquiry?.eventDate,
          status: enquiry?.status,
          salespersonFirstName: salesperson?.firstName,
          salespersonLastName: salesperson?.lastName,
        };
      })
    );

    return enrichedFollowUps;
  }

  async completeAllFollowUpsForEnquiry(enquiryId: string, completedById: string): Promise<number> {
    const collection = await getCollection<FollowUpHistory>('follow_up_history');
    const result = await collection.updateMany(
      { 
        enquiryId: this.toObjectId(enquiryId),
        completed: false 
      },
      {
        $set: {
          completed: true,
          completedAt: new Date(),
          completedById: this.toObjectId(completedById),
          completionNotes: 'Completed due to enquiry status change',
          updatedAt: new Date(),
        }
      }
    );
    return result.modifiedCount;
  }

  async rescheduleFollowUp(id: string, data: { followUpDate: Date; followUpTime: string; notes?: string; setById: string }): Promise<FollowUpHistory> {
    const collection = await getCollection<FollowUpHistory>('follow_up_history');
    const result = await collection.findOneAndUpdate(
      { _id: this.toObjectId(id) },
      {
        $set: {
          followUpDate: data.followUpDate,
          followUpTime: data.followUpTime,
          notes: data.notes || '',
          setById: this.toObjectId(data.setById),
          updatedAt: new Date(),
        }
      },
      { returnDocument: 'after' }
    );
    return this.toApiFormat(result!);
  }

  async getOverdueFollowUps(): Promise<FollowUpHistory[]> {
    const collection = await getCollection<FollowUpHistory>('follow_up_history');
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const overdueFollowUps = await collection
      .find({
        completed: false,
        $or: [
          { followUpDate: { $lt: today } },
          {
            followUpDate: today,
            followUpTime: { $lt: now.toTimeString().substring(0, 5) }
          }
        ]
      })
      .sort({ followUpDate: 1 })
      .toArray();

    // Mark them as overdue
    if (overdueFollowUps.length > 0) {
      const overdueIds = overdueFollowUps.map(f => f._id);
      await collection.updateMany(
        { 
          _id: { $in: overdueIds },
          completed: false,
          isOverdue: false 
        },
        { $set: { isOverdue: true, updatedAt: new Date() } }
      );
    }

    return overdueFollowUps.map(followUp => this.toApiFormat(followUp));
  }

  async getFollowUpStatsByEnquiry(enquiryId: string): Promise<{
    totalFollowUps: number;
    completedFollowUps: number;
    overdueFollowUps: number;
    lastFollowUpDate: Date | null;
    nextFollowUpDate: Date | null;
  }> {
    const collection = await getCollection<FollowUpHistory>('follow_up_history');
    const followUps = await collection
      .find({ enquiryId: this.toObjectId(enquiryId) })
      .sort({ createdAt: -1 })
      .toArray();
    
    const totalFollowUps = followUps.length;
    const completedFollowUps = followUps.filter(f => f.completed).length;
    const overdueFollowUps = followUps.filter(f => !f.completed && f.isOverdue).length;
    
    const lastCompleted = followUps
      .filter(f => f.completed && f.completedAt)
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())[0];
    
    const nextPending = followUps
      .filter(f => !f.completed)
      .sort((a, b) => new Date(a.followUpDate).getTime() - new Date(b.followUpDate).getTime())[0];
    
    return {
      totalFollowUps,
      completedFollowUps,
      overdueFollowUps,
      lastFollowUpDate: lastCompleted?.completedAt ? new Date(lastCompleted.completedAt) : null,
      nextFollowUpDate: nextPending?.followUpDate ? new Date(nextPending.followUpDate) : null,
    };
  }

  // Enquiry Transfer operations
  async createEnquiryTransfer(transfer: InsertEnquiryTransfer): Promise<EnquiryTransfer> {
    const collection = await getCollection<EnquiryTransfer>('enquiryTransfers');
    const transferData = {
      ...transfer,
      requestedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const result = await collection.insertOne(transferData);
    return this.toApiFormat({ ...transferData, _id: result.insertedId });
  }

  async getEnquiryTransfers(filters?: any): Promise<EnquiryTransfer[]> {
    const collection = await getCollection<EnquiryTransfer>('enquiryTransfers');
    const query = filters || {};
    const transfers = await collection.find(query).sort({ createdAt: -1 }).toArray();
    return transfers.map(transfer => this.toApiFormat(transfer));
  }

  async getEnquiryTransferById(id: string): Promise<EnquiryTransfer | undefined> {
    const collection = await getCollection<EnquiryTransfer>('enquiryTransfers');
    const transfer = await collection.findOne({ _id: this.toObjectId(id) });
    return transfer ? this.toApiFormat(transfer) : undefined;
  }

  async getEnquiryTransfersByEnquiry(enquiryId: string): Promise<EnquiryTransfer[]> {
    const collection = await getCollection<EnquiryTransfer>('enquiryTransfers');
    const transfers = await collection.find({ enquiryId }).sort({ createdAt: -1 }).toArray();
    return transfers.map(transfer => this.toApiFormat(transfer));
  }

  async getEnquiryTransfersByUser(userId: string): Promise<EnquiryTransfer[]> {
    try {
      const collection = await getCollection<EnquiryTransfer>('enquiryTransfers');
      const transfers = await collection.find({ 
        $or: [{ fromUserId: userId }, { toUserId: userId }] 
      }).sort({ createdAt: -1 }).toArray();
      
      return transfers.map(transfer => this.toApiFormat(transfer));
    } catch (error) {
      console.error("Error in getEnquiryTransfersByUser:", error);
      throw error;
    }
  }

  async updateEnquiryTransfer(id: string, data: Partial<EnquiryTransfer>): Promise<EnquiryTransfer> {
    const collection = await getCollection<EnquiryTransfer>('enquiryTransfers');
    const updateData = { ...data, updatedAt: new Date() };
    const result = await collection.findOneAndUpdate(
      { _id: this.toObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );
    return this.toApiFormat(result!);
  }

  async acceptEnquiryTransfer(transferId: string, responseNotes?: string): Promise<EnquiryTransfer> {
    const collection = await getCollection<EnquiryTransfer>('enquiryTransfers');
    const transfer = await this.getEnquiryTransferById(transferId);
    
    if (!transfer) {
      throw new Error('Transfer not found');
    }

    if (transfer.status !== 'pending') {
      throw new Error('Transfer is not pending');
    }

    // Update transfer status
    const updatedTransfer = await this.updateEnquiryTransfer(transferId, {
      status: 'accepted',
      responseNotes,
      respondedAt: new Date()
    });

    // Update enquiry ownership
    const enquiryCollection = await getCollection<Enquiry>('enquiries');
    await enquiryCollection.updateOne(
      { _id: this.toObjectId(transfer.enquiryId) },
      { 
        $set: { 
          salespersonId: transfer.toUserId,
          updatedAt: new Date()
        } 
      }
    );

    return updatedTransfer;
  }

  async declineEnquiryTransfer(transferId: string, responseNotes?: string): Promise<EnquiryTransfer> {
    return await this.updateEnquiryTransfer(transferId, {
      status: 'declined',
      responseNotes,
      respondedAt: new Date()
    });
  }

  async cancelEnquiryTransfer(transferId: string): Promise<EnquiryTransfer> {
    return await this.updateEnquiryTransfer(transferId, {
      status: 'cancelled',
      respondedAt: new Date()
    });
  }

  // Status History operations
  async createStatusHistory(history: InsertEnquiryStatusHistory): Promise<EnquiryStatusHistory> {
    const collection = await getCollection<EnquiryStatusHistory>('enquiry_status_history');
    const doc = {
      ...history,
      enquiryId: this.toObjectId(history.enquiryId),
      changedById: this.toObjectId(history.changedById),
      followUpDate: history.followUpDate ? new Date(history.followUpDate) : undefined,
      createdAt: new Date(),
    };
    const result = await collection.insertOne(doc);
    return this.toApiFormat({ ...doc, _id: result.insertedId });
  }

  async getStatusHistoryByEnquiry(enquiryId: string): Promise<EnquiryStatusHistory[]> {
    const collection = await getCollection<EnquiryStatusHistory>('enquiry_status_history');
    const history = await collection
      .find({ enquiryId: this.toObjectId(enquiryId) })
      .sort({ createdAt: -1 })
      .toArray();
    return history.map(entry => this.toApiFormat(entry));
  }

  // Booking operations
  async createBooking(booking: InsertBooking): Promise<Booking> {
    if (booking.sessions) {
      } else {
      }
    
    const collection = await getCollection<Booking>('bookings');
    const bookingNumber = await this.getNextBookingNumber();
    const doc = {
      ...booking,
      bookingNumber,
      enquiryId: this.toObjectId(booking.enquiryId),
      salespersonId: this.toObjectId(booking.salespersonId),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const result = await collection.insertOne(doc);
    return this.toApiFormat({ ...doc, _id: result.insertedId });
  }

  // Check for venue conflicts before creating a booking
  async checkVenueConflicts(booking: InsertBooking): Promise<{ hasConflict: boolean; conflicts: any[] }> {
    const collection = await getCollection<Booking>('bookings');
    const conflicts: any[] = [];

    // Check conflicts for each session
    if (booking.sessions && booking.sessions.length > 0) {
      for (const session of booking.sessions) {
        const sessionDate = new Date(session.sessionDate);
        const sessionStartTime = session.startTime;
        const sessionEndTime = session.endTime;

        // Find existing bookings for the same venue and date
        const query = {
          'sessions.venue': session.venue,
          'sessions.sessionDate': {
            $gte: new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate()),
            $lt: new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate() + 1)
          },
          status: { $nin: ['cancelled', 'closed'] } // Exclude cancelled/closed bookings
        };
        
        const existingBookings = await collection.find(query).toArray();
        
        // Check for time conflicts within the same day
        for (const existingBooking of existingBookings) {
          if (existingBooking.sessions && existingBooking.sessions.length > 0) {
            for (const existingSession of existingBooking.sessions) {
              if (existingSession.venue === session.venue) {
                const existingSessionDate = new Date(existingSession.sessionDate);
                
                // Check if it's the same date
                if (existingSessionDate.toDateString() === sessionDate.toDateString()) {
                  // Check for time overlap
                  const existingStart = this.parseTime(existingSession.startTime);
                  const existingEnd = this.parseTime(existingSession.endTime);
                  const newStart = this.parseTime(sessionStartTime);
                  const newEnd = this.parseTime(sessionEndTime);

                  // Check if time ranges overlap
                  const hasOverlap = this.timeRangesOverlap(existingStart, existingEnd, newStart, newEnd);
                  if (hasOverlap) {
                    conflicts.push({
                      venue: session.venue,
                      date: sessionDate,
                      existingBooking: {
                        bookingNumber: existingBooking.bookingNumber,
                        clientName: existingBooking.clientName,
                        sessionName: existingSession.sessionName,
                        startTime: existingSession.startTime,
                        endTime: existingSession.endTime
                      },
                      conflictingSession: {
                        sessionName: session.sessionName,
                        startTime: sessionStartTime,
                        endTime: sessionEndTime
                      }
                    });
                  }
                }
              }
            }
          }
        }
      }
    } else {
      }
    
    if (conflicts.length > 0) {
      } else {
      }

    return {
      hasConflict: conflicts.length > 0,
      conflicts
    };
  }

  // Helper method to parse time string to minutes since midnight
  private parseTime(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // Helper method to check if two time ranges overlap
  private timeRangesOverlap(start1: number, end1: number, start2: number, end2: number): boolean {
    return start1 < end2 && start2 < end1;
  }

  // Check venue conflicts for enquiry (when converting to converted status)
  async checkEnquiryVenueConflicts(params: {
    enquiryId?: string;
    tentativeDates: Date[];
    venues: Array<{ venue: string; startTime: string; endTime: string }>;
  }): Promise<{ hasConflict: boolean; conflicts: any[]; warnings: any[] }> {
    const collection = await getCollection<Booking>('bookings');
    const conflicts: any[] = [];
    const warnings: any[] = [];

    // Check conflicts for each date and venue combination
    for (const date of params.tentativeDates) {
      for (const venueInfo of params.venues) {
        const { venue, startTime, endTime } = venueInfo;
        
        // Find existing bookings for the same venue and date
        const existingBookings = await collection.find({
          'sessions.venue': venue,
          'sessions.sessionDate': {
            $gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
            $lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
          },
          status: { $nin: ['cancelled', 'closed'] } // Exclude cancelled/closed bookings
        }).toArray();

        // Check for time conflicts within the same day
        for (const existingBooking of existingBookings) {
          if (existingBooking.sessions && existingBooking.sessions.length > 0) {
            for (const existingSession of existingBooking.sessions) {
              if (existingSession.venue === venue) {
                const existingSessionDate = new Date(existingSession.sessionDate);
                
                // Check if it's the same date
                if (existingSessionDate.toDateString() === date.toDateString()) {
                  // Check for time overlap
                  const existingStart = this.parseTime(existingSession.startTime);
                  const existingEnd = this.parseTime(existingSession.endTime);
                  const newStart = this.parseTime(startTime);
                  const newEnd = this.parseTime(endTime);

                  // Check if time ranges overlap
                  if (this.timeRangesOverlap(existingStart, existingEnd, newStart, newEnd)) {
                    conflicts.push({
                      date: date.toISOString().split('T')[0],
                      venue,
                      requestedTime: `${startTime} - ${endTime}`,
                      conflictingBooking: {
                        bookingNumber: existingBooking.bookingNumber,
                        clientName: existingBooking.clientName,
                        sessionName: existingSession.sessionName,
                        time: `${existingSession.startTime} - ${existingSession.endTime}`,
                        status: existingBooking.status
                      }
                    });
                  }
                }
              }
            }
          }
        }
      }
    }

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
      warnings
    };
  }

  async getBookings(filters?: any): Promise<any[]> {
    const bookingsCollection = await getCollection<Booking>('bookings');
    const enquiriesCollection = await getCollection<Enquiry>('enquiries');
    const usersCollection = await getCollection<User>('users');
    
    const query: any = {};
    if (filters?.status) {
      query.status = filters.status;
    }
    if (filters?.search) {
      query.$or = [
        { bookingNumber: { $regex: filters.search, $options: 'i' } },
        { clientName: { $regex: filters.search, $options: 'i' } }
      ];
    }
    // Add date range filtering based on eventDate
    if (filters?.dateFrom || filters?.dateTo) {
      query.eventDate = {};
      if (filters.dateFrom) {
        const dateFrom = new Date(filters.dateFrom);
        dateFrom.setHours(0, 0, 0, 0);
        query.eventDate.$gte = dateFrom;
      }
      if (filters.dateTo) {
        const dateTo = new Date(filters.dateTo);
        dateTo.setHours(23, 59, 59, 999);
        query.eventDate.$lte = dateTo;
      }
    }

    const bookings = await bookingsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    // Get enquiry and salesperson details for each booking
    const enrichedBookings = await Promise.all(
      bookings.map(async (booking) => {
        // Get enquiry details
        const enquiry = await enquiriesCollection.findOne({ _id: booking.enquiryId });
        
        // Get salesperson details
        let salesperson = null;
        if (booking.salespersonId) {
          const salespersonDoc = await usersCollection.findOne({ _id: this.toObjectId(booking.salespersonId) });
          if (salespersonDoc) {
            salesperson = {
              id: salespersonDoc._id.toString(),
              firstName: salespersonDoc.firstName,
              lastName: salespersonDoc.lastName,
              email: salespersonDoc.email,
            };
          }
        }

        return {
          ...this.toApiFormat(booking),
          enquiry: enquiry ? {
            id: enquiry._id.toString(),
            enquiryNumber: enquiry.enquiryNumber,
            clientName: enquiry.clientName,
            eventDate: enquiry.eventDate,
            status: enquiry.status,
            city: enquiry.city,
            source: enquiry.source,
          } : null,
          salesperson,
        };
      })
    );

    return enrichedBookings;
  }

  async getBookingById(id: string): Promise<any> {
    const bookingsCollection = await getCollection<Booking>('bookings');
    const enquiriesCollection = await getCollection<Enquiry>('enquiries');
    const usersCollection = await getCollection<User>('users');
    
    const booking = await bookingsCollection.findOne({ _id: this.toObjectId(id) });
    if (!booking) return undefined;

    // Get enquiry details
    const enquiry = await enquiriesCollection.findOne({ _id: booking.enquiryId });
    
    // Get salesperson details
    let salesperson = null;
    if (booking.salespersonId) {
      const salespersonDoc = await usersCollection.findOne({ _id: this.toObjectId(booking.salespersonId) });
      if (salespersonDoc) {
        salesperson = {
          id: salespersonDoc._id.toString(),
          firstName: salespersonDoc.firstName,
          lastName: salespersonDoc.lastName,
          email: salespersonDoc.email,
        };
      }
    }

    return {
      ...this.toApiFormat(booking),
      enquiry: enquiry ? {
        id: enquiry._id.toString(),
        enquiryNumber: enquiry.enquiryNumber,
        clientName: enquiry.clientName,
        eventDate: enquiry.eventDate,
        status: enquiry.status,
        city: enquiry.city,
        source: enquiry.source,
      } : null,
      salesperson,
    };
  }

  async updateBooking(id: string, data: Partial<Booking>): Promise<Booking> {
    const collection = await getCollection<Booking>('bookings');
    const result = await collection.findOneAndUpdate(
      { _id: this.toObjectId(id) },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return this.toApiFormat(result!);
  }

  async getNextBookingNumber(): Promise<string> {
    const db = await getMongoDb();
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    const counterId = `bookings:${year}-${month}`;
    const result = await db.collection('counters').findOneAndUpdate(
      { _id: counterId },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: 'after' }
    );
    
    const nextNumber = result.seq || 1;
    return `BKG-${year}-${month}-${String(nextNumber).padStart(3, '0')}`;
  }

  // BEO operations
  async createBeo(beo: InsertBeo): Promise<Beo> {
    const collection = await getCollection<Beo>('beos');
    const beoNumber = await this.getNextBeoNumber();
    const doc = {
      ...beo,
      beoNumber,
      bookingId: this.toObjectId(beo.bookingId),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await collection.insertOne(doc);
    return this.toApiFormat({ ...doc, _id: result.insertedId });
  }

  async getBeos(filters?: any): Promise<any[]> {
    const beosCollection = await getCollection<Beo>('beos');
    const bookingsCollection = await getCollection<Booking>('bookings');
    const enquiriesCollection = await getCollection<Enquiry>('enquiries');
    
    const query: any = {};
    if (filters?.status) {
      query.status = filters.status;
    }
    if (filters?.search) {
      query.$or = [
        { beoNumber: { $regex: filters.search, $options: 'i' } },
        { clientName: { $regex: filters.search, $options: 'i' } }
      ];
    }

    const beos = await beosCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    // Get booking and enquiry details for each BEO
    const enrichedBeos = await Promise.all(
      beos.map(async (beo) => {
        // Get booking details
        const booking = await bookingsCollection.findOne({ _id: beo.bookingId });
        
        // Get enquiry details
        let enquiry = null;
        if (booking?.enquiryId) {
          const enquiryDoc = await enquiriesCollection.findOne({ _id: booking.enquiryId });
          if (enquiryDoc) {
            enquiry = {
              id: enquiryDoc._id.toString(),
              enquiryNumber: enquiryDoc.enquiryNumber,
              clientName: enquiryDoc.clientName,
              eventDate: enquiryDoc.eventDate,
            };
          }
        }

        return {
          ...this.toApiFormat(beo),
          booking: booking ? {
            id: booking._id.toString(),
            bookingNumber: booking.bookingNumber,
            clientName: booking.clientName,
            eventDate: booking.eventDate,
            status: booking.status,
          } : null,
          enquiry,
        };
      })
    );

    return enrichedBeos;
  }

  async getBeoById(id: string): Promise<any> {
    const beosCollection = await getCollection<Beo>('beos');
    const bookingsCollection = await getCollection<Booking>('bookings');
    const enquiriesCollection = await getCollection<Enquiry>('enquiries');
    
    const beo = await beosCollection.findOne({ _id: this.toObjectId(id) });
    if (!beo) return undefined;

    // Get booking details
    const booking = await bookingsCollection.findOne({ _id: beo.bookingId });
    
    // Get enquiry details
    let enquiry = null;
    if (booking?.enquiryId) {
      const enquiryDoc = await enquiriesCollection.findOne({ _id: booking.enquiryId });
      if (enquiryDoc) {
        enquiry = {
          id: enquiryDoc._id.toString(),
          enquiryNumber: enquiryDoc.enquiryNumber,
          clientName: enquiryDoc.clientName,
          eventDate: enquiryDoc.eventDate,
        };
      }
    }

    return {
      ...this.toApiFormat(beo),
      booking: booking ? {
        id: booking._id.toString(),
        bookingNumber: booking.bookingNumber,
        clientName: booking.clientName,
        eventDate: booking.eventDate,
        status: booking.status,
      } : null,
      enquiry,
    };
  }

  async updateBeo(id: string, data: Partial<Beo>): Promise<Beo> {
    const collection = await getCollection<Beo>('beos');
    const result = await collection.findOneAndUpdate(
      { _id: this.toObjectId(id) },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return this.toApiFormat(result!);
  }

  async getNextBeoNumber(): Promise<string> {
    const db = await getMongoDb();
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    const counterId = `beos:${year}-${month}`;
    const result = await db.collection('counters').findOneAndUpdate(
      { _id: counterId },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: 'after' }
    );
    
    const nextNumber = result.seq || 1;
    return `BEO-${year}-${month}-${String(nextNumber).padStart(3, '0')}`;
  }

  // Dashboard metrics
  async getDashboardMetrics(): Promise<{
    activeEnquiries: number;
    bookedBookings: number;
    lostEnquiries: number;
    conversionRate: number;
    monthlyRevenue: number;
  }> {
    const enquiriesCollection = await getCollection<Enquiry>('enquiries');
    const bookingsCollection = await getCollection<Booking>('bookings');
    
    // Get current month date range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Active enquiries (not lost, not closed)
    const activeEnquiries = await enquiriesCollection.countDocuments({
      status: { $nin: ['lost', 'closed'] }
    });

    // Confirmed bookings
    const bookedBookings = await bookingsCollection.countDocuments({
      status: 'booked'
    });

    // Lost enquiries
    const lostEnquiries = await enquiriesCollection.countDocuments({
      status: 'lost'
    });

    // Conversion rate
    const totalEnquiries = await enquiriesCollection.countDocuments({});
    const convertedEnquiries = await enquiriesCollection.countDocuments({
      status: { $in: ['converted', 'booked'] }
    });
    const conversionRate = totalEnquiries > 0 ? (convertedEnquiries / totalEnquiries) * 100 : 0;

    // Monthly revenue (from booked bookings this month)
    const monthlyRevenueResult = await bookingsCollection.aggregate([
      {
        $match: {
          status: 'booked',
          createdAt: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' }
        }
      }
    ]).toArray();

    const monthlyRevenue = monthlyRevenueResult[0]?.totalRevenue || 0;

    return {
      activeEnquiries,
      bookedBookings,
      lostEnquiries,
      conversionRate: Math.round(conversionRate * 100) / 100,
      monthlyRevenue
    };
  }

  // Reports
  async getEnquiryPipelineReport(filters: any): Promise<any> {
    const enquiriesCollection = await getCollection<Enquiry>('enquiries');
    
    const matchStage: any = {};
    
    if (filters.dateFrom) {
      matchStage.createdAt = { ...matchStage.createdAt, $gte: new Date(filters.dateFrom) };
    }
    if (filters.dateTo) {
      matchStage.createdAt = { ...matchStage.createdAt, $lte: new Date(filters.dateTo) };
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          statusBreakdown: {
            $push: {
              status: '$status',
              source: '$source',
              lostReason: '$lostReason'
            }
          }
        }
      }
    ];

    const result = await enquiriesCollection.aggregate(pipeline).toArray();
    const data = result[0] || { total: 0, statusBreakdown: [] };

    // Process status breakdown
    const statusBreakdown: any = {};
    const sourceBreakdown: any = {};
    const lostReasons: any = {};

    data.statusBreakdown.forEach((item: any) => {
      // Status breakdown
      statusBreakdown[item.status] = (statusBreakdown[item.status] || 0) + 1;
      
      // Source breakdown
      if (item.source) {
        sourceBreakdown[item.source] = (sourceBreakdown[item.source] || 0) + 1;
      }
      
      // Lost reasons
      if (item.status === 'lost' && item.lostReason) {
        lostReasons[item.lostReason] = (lostReasons[item.lostReason] || 0) + 1;
      }
    });

    // Conversion funnel
    const total = data.total;
    const converted = statusBreakdown.converted || 0;
    const booked = statusBreakdown.booked || 0;
    const conversionRate = total > 0 ? (((converted + booked) / total) * 100).toFixed(1) : 0;

    return {
      total,
      statusBreakdown,
      sourceBreakdown,
      lostReasons,
      conversionRate: parseFloat(conversionRate)
    };
  }

  async getFollowUpPerformanceReport(filters: any): Promise<any> {
    try {
      const followUpCollection = await getCollection<FollowUpHistory>('follow_up_history');
      const enquiriesCollection = await getCollection<Enquiry>('enquiries');
    
    const matchStage: any = {};
    
    if (filters.dateFrom) {
      matchStage.createdAt = { ...matchStage.createdAt, $gte: new Date(filters.dateFrom) };
    }
    if (filters.dateTo) {
      matchStage.createdAt = { ...matchStage.createdAt, $lte: new Date(filters.dateTo) };
    }

    const pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'enquiries',
          localField: 'enquiryId',
          foreignField: '_id',
          as: 'enquiry'
        }
      },
      { $unwind: '$enquiry' },
      {
        $group: {
          _id: null,
          totalFollowUps: { $sum: 1 },
          completedFollowUps: {
            $sum: { $cond: ['$completed', 1, 0] }
          },
          overdueFollowUps: {
            $sum: { $cond: ['$isOverdue', 1, 0] }
          },
          avgResponseTime: {
            $avg: {
              $cond: [
                { 
                  $and: [
                    '$completed', 
                    '$completedAt',
                    { $gt: ['$completedAt', '$followUpDate'] } // Completed AFTER the follow-up date (late)
                  ] 
                },
                {
                  $divide: [
                    { $subtract: ['$completedAt', '$followUpDate'] },
                    1000 * 60 * 60 * 24 // Convert to days
                  ]
                },
                null
              ]
            }
          }
        }
      }
    ];

    const result = await followUpCollection.aggregate(pipeline).toArray();
    const data = result[0] || {
      totalFollowUps: 0,
      completedFollowUps: 0,
      overdueFollowUps: 0,
      avgResponseTime: 0
    };

    const completionRate = data.totalFollowUps > 0 
      ? ((data.completedFollowUps / data.totalFollowUps) * 100).toFixed(1)
      : 0;

    return {
      totalFollowUps: data.totalFollowUps,
      completedFollowUps: data.completedFollowUps,
      overdueFollowUps: data.overdueFollowUps,
      completionRate: parseFloat(completionRate),
      avgResponseTime: Math.round((data.avgResponseTime || 0) * 100) / 100
    };
    } catch (error) {
      return {
        totalFollowUps: 0,
        completedFollowUps: 0,
        overdueFollowUps: 0,
        completionRate: 0,
        avgResponseTime: 0
      };
    }
  }

  async getBookingAnalyticsReport(filters: any): Promise<any> {
    try {
      const bookingsCollection = await getCollection<Booking>('bookings');
    
    const matchStage: any = {};
    
    if (filters.dateFrom) {
      matchStage.createdAt = { ...matchStage.createdAt, $gte: new Date(filters.dateFrom) };
    }
    if (filters.dateTo) {
      matchStage.createdAt = { ...matchStage.createdAt, $lte: new Date(filters.dateTo) };
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          avgBookingValue: { $avg: '$totalAmount' },
          statusBreakdown: {
            $push: {
              status: '$status',
              totalAmount: '$totalAmount',
              eventDuration: '$eventDuration',
              eventType: '$eventType'
            }
          }
        }
      }
    ];

    const result = await bookingsCollection.aggregate(pipeline).toArray();
    const data = result[0] || {
      totalBookings: 0,
      totalRevenue: 0,
      avgBookingValue: 0,
      statusBreakdown: []
    };

    // Process breakdowns
    const statusBreakdown: any = {};
    const eventTypeBreakdown: any = {};
    let totalDuration = 0;

    data.statusBreakdown.forEach((item: any) => {
      statusBreakdown[item.status] = (statusBreakdown[item.status] || 0) + 1;
      
      if (item.eventType) {
        eventTypeBreakdown[item.eventType] = (eventTypeBreakdown[item.eventType] || 0) + 1;
      }
      
      if (item.eventDuration) {
        totalDuration += item.eventDuration;
      }
    });

    const avgDuration = data.totalBookings > 0 ? totalDuration / data.totalBookings : 0;

    return {
      totalBookings: data.totalBookings,
      totalRevenue: data.totalRevenue,
      avgBookingValue: Math.round((data.avgBookingValue || 0) * 100) / 100,
      avgDuration: Math.round(avgDuration * 100) / 100,
      statusBreakdown,
      eventTypeBreakdown
    };
    } catch (error) {
      return {
        totalBookings: 0,
        totalRevenue: 0,
        avgBookingValue: 0,
        avgDuration: 0,
        statusBreakdown: {},
        eventTypeBreakdown: {}
      };
    }
  }

  async getTeamPerformanceReport(filters: any): Promise<any> {
    try {
      const enquiriesCollection = await getCollection<Enquiry>('enquiries');
      const usersCollection = await getCollection<User>('users');
    
    // Build date filter conditions for enquiries
    const dateConditions: any[] = [];
    if (filters.dateFrom) {
      dateConditions.push({ $gte: ['$createdAt', new Date(filters.dateFrom)] });
    }
    if (filters.dateTo) {
      // Add end of day to include all enquiries on the end date
      const endDate = new Date(filters.dateTo);
      endDate.setHours(23, 59, 59, 999);
      dateConditions.push({ $lte: ['$createdAt', endDate] });
    }

    // Build the match conditions for lookup pipeline
    const lookupMatchConditions: any[] = [
      { $eq: ['$salespersonId', '$$userId'] },
      { $ne: ['$salespersonId', null] }
    ];

    if (dateConditions.length > 0) {
      lookupMatchConditions.push(...dateConditions);
    }

    // Start from users collection and left join with enquiries
    const pipeline = [
      // Get all active users
      { $match: { status: { $ne: 'inactive' } } },
      // Lookup enquiries assigned to this user (filtered by date if provided)
      {
        $lookup: {
          from: 'enquiries',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: lookupMatchConditions
                }
              }
            }
          ],
          as: 'enquiries'
        }
      },
      // Calculate metrics from enquiries
      {
        $addFields: {
          totalEnquiries: { $size: '$enquiries' },
          convertedEnquiries: {
            $size: {
              $filter: {
                input: '$enquiries',
                as: 'enq',
                cond: { $in: ['$$enq.status', ['converted', 'booked']] }
              }
            }
          },
          lostEnquiries: {
            $size: {
              $filter: {
                input: '$enquiries',
                as: 'enq',
                cond: { $eq: ['$$enq.status', 'lost'] }
              }
            }
          }
        }
      },
      // Calculate conversion rate
      {
        $addFields: {
          conversionRate: {
            $cond: [
              { $gt: ['$totalEnquiries', 0] },
              { $multiply: [{ $divide: ['$convertedEnquiries', '$totalEnquiries'] }, 100] },
              0
            ]
          },
          salespersonName: {
            $cond: [
              { $and: ['$firstName', '$lastName'] },
              { $concat: ['$firstName', ' ', '$lastName'] },
              { $cond: [
                '$firstName',
                '$firstName',
                { $cond: [
                  '$lastName',
                  '$lastName',
                  { $cond: [
                    '$email',
                    '$email',
                    'Unknown User'
                  ]}
                ]}
              ]}
            ]
          }
        }
      },
      // Sort by conversion rate (descending), then by name
      { $sort: { conversionRate: -1, salespersonName: 1 } },
      // Project final structure
      {
        $project: {
          _id: 1,
          salespersonId: { $toString: '$_id' },
          salespersonName: 1,
          totalEnquiries: 1,
          convertedEnquiries: 1,
          lostEnquiries: 1,
          conversionRate: { $round: ['$conversionRate', 2] }
        }
      }
    ];

    const teamPerformance = await usersCollection.aggregate(pipeline).toArray();

    return {
      teamPerformance: teamPerformance.map(member => ({
        salespersonId: member.salespersonId,
        salespersonName: member.salespersonName || 'Unknown User',
        totalEnquiries: member.totalEnquiries || 0,
        convertedEnquiries: member.convertedEnquiries || 0,
        lostEnquiries: member.lostEnquiries || 0,
        conversionRate: member.conversionRate || 0
      }))
    };
    } catch (error) {
      return {
        teamPerformance: []
      };
    }
  }

  async getAuditTrackingReport(filters: any): Promise<any> {
    try {
      const enquiryAuditCollection = await getCollection('enquiry_audit_log');
      const bookingAuditCollection = await getCollection('booking_audit_log');
      const systemAuditCollection = await getCollection('system_audit_log');
    
    const matchStage: any = {};
    
    if (filters.dateFrom) {
      matchStage.createdAt = { ...matchStage.createdAt, $gte: new Date(filters.dateFrom) };
    }
    if (filters.dateTo) {
      matchStage.createdAt = { ...matchStage.createdAt, $lte: new Date(filters.dateTo) };
    }

    // Get enquiry audit logs
    const enquiryAudits = await enquiryAuditCollection
      .find(matchStage)
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    // Get booking audit logs
    const bookingAudits = await bookingAuditCollection
      .find(matchStage)
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    // Get system audit logs
    const systemAudits = await systemAuditCollection
      .find(matchStage)
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    // Process audit data
    const auditSummary = {
      enquiryAudits: enquiryAudits.length,
      bookingAudits: bookingAudits.length,
      systemAudits: systemAudits.length,
      totalAudits: enquiryAudits.length + bookingAudits.length + systemAudits.length
    };

    return {
      auditSummary,
      enquiryAudits: enquiryAudits.map(audit => this.toApiFormat(audit)),
      bookingAudits: bookingAudits.map(audit => this.toApiFormat(audit)),
      systemAudits: systemAudits.map(audit => this.toApiFormat(audit))
    };
    } catch (error) {
      return {
        auditSummary: {
          enquiryAudits: 0,
          bookingAudits: 0,
          systemAudits: 0,
          totalAudits: 0
        },
        enquiryAudits: [],
        bookingAudits: [],
        systemAudits: []
      };
    }
  }

  // Add remaining IStorage methods as placeholders...
  async scheduleNextRepeatFollowUp(enquiry: Enquiry): Promise<void> {
    // TODO: Implement repeat follow-up scheduling
    }

  async createAuditLog(auditLog: any): Promise<any> {
    // Use the same implementation as createSystemAuditLog for consistency
    return this.createSystemAuditLog(auditLog);
  }

  async getAuditLogByEnquiry(enquiryId: string): Promise<any[]> {
    // TODO: Implement audit log retrieval
    return [];
  }

  async reopenEnquiry(enquiryId: string, reason: string, notes: string, userId: string): Promise<Enquiry> {
    // TODO: Implement enquiry reopening
    throw new Error('reopenEnquiry not implemented yet');
  }

  async createBookingAuditLog(auditLog: any): Promise<any> {
    // TODO: Implement booking audit log creation
    return auditLog;
  }

  async getBookingAuditLogByBooking(bookingId: string): Promise<any[]> {
    // TODO: Implement booking audit log retrieval
    return [];
  }

  // ============================================================================
  // MENU PACKAGE OPERATIONS
  // ============================================================================

  async getMenuPackages(): Promise<any[]> {
    const collection = await getCollection('menu_packages');
    const packages = await collection.find({}).toArray();
    return packages.map(pkg => this.toApiFormat(pkg));
  }

  async getMenuPackageById(id: string): Promise<any> {
    const collection = await getCollection('menu_packages');
    const package_ = await collection.findOne({ _id: this.toObjectId(id) });
    return package_ ? this.toApiFormat(package_) : undefined;
  }

  async createMenuPackage(package_: any): Promise<any> {
    const collection = await getCollection('menu_packages');
    const doc = {
      ...package_,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await collection.insertOne(doc);
    return this.toApiFormat({ ...doc, _id: result.insertedId });
  }

  async updateMenuPackage(id: string, data: any): Promise<any> {
    const collection = await getCollection('menu_packages');
    const result = await collection.findOneAndUpdate(
      { _id: this.toObjectId(id) },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result ? this.toApiFormat(result) : undefined;
  }

  async deleteMenuPackage(id: string): Promise<boolean> {
    const collection = await getCollection('menu_packages');
    const result = await collection.deleteOne({ _id: this.toObjectId(id) });
    return result.deletedCount > 0;
  }

  // ============================================================================
  // MENU ITEM OPERATIONS
  // ============================================================================

  async getMenuItems(): Promise<any[]> {
    const collection = await getCollection('menu_items');
    const items = await collection.find({}).toArray();
    return items.map(item => this.toApiFormat(item));
  }

  async getMenuItemsByPackage(packageId: string): Promise<any[]> {
    const collection = await getCollection('menu_items');
    const items = await collection.find({ packageId: this.toObjectId(packageId) }).toArray();
    return items.map(item => this.toApiFormat(item));
  }

  async getMenuItemById(id: string): Promise<any> {
    const collection = await getCollection('menu_items');
    const item = await collection.findOne({ _id: this.toObjectId(id) });
    return item ? this.toApiFormat(item) : undefined;
  }

  async createMenuItem(item: any): Promise<any> {
    const collection = await getCollection('menu_items');
    const doc = {
      ...item,
      packageId: this.toObjectId(item.packageId),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await collection.insertOne(doc);
    return this.toApiFormat({ ...doc, _id: result.insertedId });
  }

  async updateMenuItem(id: string, data: any): Promise<any> {
    const collection = await getCollection('menu_items');
    const updateData = { ...data };
    if (data.packageId) {
      updateData.packageId = this.toObjectId(data.packageId);
    }
    const result = await collection.findOneAndUpdate(
      { _id: this.toObjectId(id) },
      { $set: { ...updateData, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result ? this.toApiFormat(result) : undefined;
  }

  async deleteMenuItem(id: string): Promise<boolean> {
    const collection = await getCollection('menu_items');
    const result = await collection.deleteOne({ _id: this.toObjectId(id) });
    return result.deletedCount > 0;
  }

  // ============================================================================
  // ADDITIONAL ITEM OPERATIONS
  // ============================================================================

  async getAdditionalItems(): Promise<any[]> {
    const collection = await getCollection('additional_items');
    const items = await collection.find({}).toArray();
    return items.map(item => this.toApiFormat(item));
  }

  async getAdditionalItemById(id: string): Promise<any> {
    const collection = await getCollection('additional_items');
    const item = await collection.findOne({ _id: this.toObjectId(id) });
    return item ? this.toApiFormat(item) : undefined;
  }

  async createAdditionalItem(item: any): Promise<any> {
    const collection = await getCollection('additional_items');
    const doc = {
      ...item,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await collection.insertOne(doc);
    return this.toApiFormat({ ...doc, _id: result.insertedId });
  }

  async updateAdditionalItem(id: string, data: any): Promise<any> {
    const collection = await getCollection('additional_items');
    const result = await collection.findOneAndUpdate(
      { _id: this.toObjectId(id) },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result ? this.toApiFormat(result) : undefined;
  }

  async deleteAdditionalItem(id: string): Promise<boolean> {
    const collection = await getCollection('additional_items');
    const result = await collection.deleteOne({ _id: this.toObjectId(id) });
    return result.deletedCount > 0;
  }

  // ============================================================================
  // ROOM TYPE OPERATIONS
  // ============================================================================

  async getRoomTypes(): Promise<any[]> {
    const collection = await getCollection('room_types');
    const roomTypes = await collection.find({}).toArray();
    return roomTypes.map(roomType => this.toApiFormat(roomType));
  }

  async getRoomTypeById(id: string): Promise<any> {
    const collection = await getCollection('room_types');
    const roomType = await collection.findOne({ _id: this.toObjectId(id) });
    return roomType ? this.toApiFormat(roomType) : undefined;
  }

  async createRoomType(roomType: any): Promise<any> {
    const collection = await getCollection('room_types');
    const doc = {
      ...roomType,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await collection.insertOne(doc);
    return this.toApiFormat({ ...doc, _id: result.insertedId });
  }

  async updateRoomType(id: string, data: any): Promise<any> {
    const collection = await getCollection('room_types');
    const result = await collection.findOneAndUpdate(
      { _id: this.toObjectId(id) },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result ? this.toApiFormat(result) : undefined;
  }

  async deleteRoomType(id: string): Promise<boolean> {
    const collection = await getCollection('room_types');
    const result = await collection.deleteOne({ _id: this.toObjectId(id) });
    return result.deletedCount > 0;
  }

  // ============================================================================
  // VENUE OPERATIONS
  // ============================================================================

  async getVenues(): Promise<any[]> {
    const collection = await getCollection('venues');
    const venues = await collection.find({}).toArray();
    return venues.map(venue => this.toApiFormat(venue));
  }

  async getVenueById(id: string): Promise<any> {
    const collection = await getCollection('venues');
    const venue = await collection.findOne({ _id: this.toObjectId(id) });
    return venue ? this.toApiFormat(venue) : undefined;
  }

  async createVenue(venue: any): Promise<any> {
    const collection = await getCollection('venues');
    const doc = {
      ...venue,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await collection.insertOne(doc);
    return this.toApiFormat({ ...doc, _id: result.insertedId });
  }

  async updateVenue(id: string, data: any): Promise<any> {
    const collection = await getCollection('venues');
    const result = await collection.findOneAndUpdate(
      { _id: this.toObjectId(id) },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result ? this.toApiFormat(result) : undefined;
  }

  async deleteVenue(id: string): Promise<boolean> {
    const collection = await getCollection('venues');
    const result = await collection.deleteOne({ _id: this.toObjectId(id) });
    return result.deletedCount > 0;
  }

  // ============================================================================
  // QUOTATION OPERATIONS
  // ============================================================================

  async getQuotations(): Promise<any[]> {
    const collection = await getCollection('quotations');
    const quotations = await collection.find({}).toArray();
    return quotations.map(quotation => this.toApiFormat(quotation));
  }

  async getQuotationsByEnquiry(enquiryId: string): Promise<any[]> {
    const collection = await getCollection('quotations');
    const quotations = await collection.find({ enquiryId: this.toObjectId(enquiryId) }).toArray();
    return quotations.map(quotation => this.toApiFormat(quotation));
  }

  async getQuotationsExceededDiscount(): Promise<any[]> {
    const collection = await getCollection('quotations');
    // Find quotations where discountExceedsLimit is true
    const quotations = await collection.find({ 
      discountExceedsLimit: true 
    }).sort({ createdAt: -1 }).toArray();
    
    // Populate createdBy user information
    const quotationsWithUser = await Promise.all(
      quotations.map(async (quotation) => {
        if (quotation.createdBy) {
          const user = await this.getUser(quotation.createdBy);
          return {
            ...this.toApiFormat(quotation),
            createdBy: user ? { name: `${user.firstName} ${user.lastName}`.trim() || user.email } : { name: 'Unknown' }
          };
        }
        return this.toApiFormat(quotation);
      })
    );
    
    return quotationsWithUser;
  }

  async getQuotationById(id: string): Promise<any> {
    const collection = await getCollection('quotations');
    const quotation = await collection.findOne({ _id: this.toObjectId(id) });
    return quotation ? this.toApiFormat(quotation) : undefined;
  }

  async createQuotation(quotation: any): Promise<any> {
    const collection = await getCollection('quotations');
    
    // Generate quotation number
    const quotationNumber = await this.getNextQuotationNumber();
    
    const doc = {
      ...quotation,
      enquiryId: this.toObjectId(quotation.enquiryId),
      createdBy: this.toObjectId(quotation.createdBy),
      quotationNumber,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const result = await collection.insertOne(doc);
    return this.toApiFormat({ ...doc, _id: result.insertedId });
  }

  async updateQuotation(id: string, data: any): Promise<any> {
    const collection = await getCollection('quotations');
    const updateData = { ...data };
    
    if (data.enquiryId) {
      updateData.enquiryId = this.toObjectId(data.enquiryId);
    }
    if (data.createdBy) {
      updateData.createdBy = this.toObjectId(data.createdBy);
    }
    
    const result = await collection.findOneAndUpdate(
      { _id: this.toObjectId(id) },
      { $set: { ...updateData, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result ? this.toApiFormat(result) : undefined;
  }

  async deleteQuotation(id: string): Promise<boolean> {
    const collection = await getCollection('quotations');
    const result = await collection.deleteOne({ _id: this.toObjectId(id) });
    return result.deletedCount > 0;
  }

  // Quotation activity tracking
  async createQuotationActivity(activity: any): Promise<void> {
    const enquiryIdObjectId = this.toObjectId(activity.enquiryId);
    const quotationIdObjectId = this.toObjectId(activity.quotationId);
    
    const collection = await getCollection('quotation_activities');
    const docToInsert = {
      ...activity,
      enquiryId: enquiryIdObjectId,
      quotationId: quotationIdObjectId,
      _id: new ObjectId(),
      createdAt: new Date()
    };
    
    await collection.insertOne(docToInsert);
  }

  async getQuotationActivitiesByEnquiry(enquiryId: string): Promise<any[]> {
    const enquiryIdObjectId = this.toObjectId(enquiryId);
    const collection = await getCollection('quotation_activities');
    const activities = await collection.find({ enquiryId: enquiryIdObjectId }).sort({ timestamp: -1 }).toArray();
    return activities.map(activity => this.toApiFormat(activity));
  }

  // Helper method to generate quotation numbers
  private async getNextQuotationNumber(): Promise<string> {
    const countersCollection = await getCollection('counters');
    const result = await countersCollection.findOneAndUpdate(
      { _id: 'quotation' },
      { $inc: { sequence: 1 } },
      { upsert: true, returnDocument: 'after' }
    );
    
    const sequence = result?.sequence || 1;
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const day = String(new Date().getDate()).padStart(2, '0');
    const sequenceStr = String(sequence).padStart(3, '0');
    
    return `QTN-${year}-${month}-${day}-${sequenceStr}`;
  }

}
