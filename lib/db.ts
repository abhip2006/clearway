// Clearway Database Client
// Database Agent - Task DB-003

import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const db = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

// ============================================
// QUERY HELPERS
// ============================================

export const queries = {
  // Get user's pending documents
  async getPendingDocuments(userId: string) {
    return await db.document.findMany({
      where: {
        userId,
        status: { in: ['PENDING', 'PROCESSING', 'REVIEW'] },
      },
      orderBy: { uploadedAt: 'desc' },
    });
  },

  // Get upcoming capital calls
  async getUpcomingCapitalCalls(userId: string, daysAhead: number = 7) {
    const today = new Date();
    const future = new Date();
    future.setDate(today.getDate() + daysAhead);

    return await db.capitalCall.findMany({
      where: {
        userId,
        status: 'APPROVED',
        dueDate: {
          gte: today,
          lte: future,
        },
      },
      include: { document: true },
      orderBy: { dueDate: 'asc' },
    });
  },

  // Get capital calls for calendar
  async getCapitalCallsForMonth(userId: string, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    return await db.capitalCall.findMany({
      where: {
        userId,
        status: 'APPROVED',
        dueDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: { document: true },
      orderBy: { dueDate: 'asc' },
    });
  },

  // Get document with capital call
  async getDocumentWithCapitalCall(documentId: string, userId: string) {
    return await db.document.findFirst({
      where: {
        id: documentId,
        userId,
      },
      include: {
        capitalCall: true,
      },
    });
  },

  // Get user's recent documents with capital calls
  async getRecentDocuments(userId: string, limit: number = 10) {
    return await db.document.findMany({
      where: {
        userId,
      },
      include: {
        capitalCall: true,
      },
      orderBy: { uploadedAt: 'desc' },
      take: limit,
    });
  },

  // Get capital calls by status
  async getCapitalCallsByStatus(userId: string, status: string) {
    return await db.capitalCall.findMany({
      where: {
        userId,
        status: status as any,
      },
      include: {
        document: true,
      },
      orderBy: { dueDate: 'asc' },
    });
  },

  // Get overdue capital calls
  async getOverdueCapitalCalls(userId: string) {
    const today = new Date();

    return await db.capitalCall.findMany({
      where: {
        userId,
        status: { in: ['PENDING_REVIEW', 'APPROVED'] },
        dueDate: {
          lt: today,
        },
      },
      include: { document: true },
      orderBy: { dueDate: 'asc' },
    });
  },

  // Get user with organization
  async getUserWithOrganization(userId: string) {
    return await db.user.findUnique({
      where: { id: userId },
      include: {
        organization: true,
      },
    });
  },

  // Get user by Clerk ID
  async getUserByClerkId(clerkId: string) {
    return await db.user.findUnique({
      where: { clerkId },
      include: {
        organization: true,
      },
    });
  },

  // Get organization with users
  async getOrganizationWithUsers(organizationId: string) {
    return await db.organization.findUnique({
      where: { id: organizationId },
      include: {
        users: true,
        documents: {
          include: {
            capitalCall: true,
          },
          orderBy: { uploadedAt: 'desc' },
          take: 20,
        },
      },
    });
  },
};
