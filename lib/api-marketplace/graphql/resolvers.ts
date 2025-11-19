// lib/api-marketplace/graphql/resolvers.ts
// GraphQL Resolvers for API Marketplace

import { db } from '@/lib/db';
import { generateAPIKey, hashAPIKey } from '../utils';

export const resolvers = {
  Query: {
    me: async (_: any, __: any, context: any) => {
      if (!context.user) throw new Error('Unauthorized');
      return db.user.findUnique({ where: { id: context.user.id } });
    },

    apiKeys: async (_: any, __: any, context: any) => {
      if (!context.user) throw new Error('Unauthorized');
      const developer = await db.developerAccount.findUnique({
        where: { userId: context.user.id },
      });
      if (!developer) return [];
      return db.marketplaceAPIKey.findMany({
        where: { developerId: developer.id },
        include: { rateLimit: true },
      });
    },

    apps: async (_: any, args: any) => {
      const { limit = 20, offset = 0, category, status, search, sort } = args;

      const where: any = {};
      if (category) where.category = category;
      if (status) where.status = status;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      const apps = await db.marketplaceApp.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { [sort]: 'desc' },
        include: { developer: true, reviews: true },
      });

      const total = await db.marketplaceApp.count({ where });

      return {
        edges: apps.map((app, idx) => ({
          node: app,
          cursor: Buffer.from(`${offset + idx}`).toString('base64'),
        })),
        pageInfo: {
          hasNextPage: offset + limit < total,
          endCursor: apps.length > 0
            ? Buffer.from(`${offset + apps.length - 1}`).toString('base64')
            : null,
        },
      };
    },

    app: async (_: any, args: any) => {
      return db.marketplaceApp.findUnique({
        where: { id: args.id },
        include: { developer: true, reviews: true, pricing: true, oauthClient: true },
      });
    },

    webhooks: async (_: any, __: any, context: any) => {
      if (!context.user) throw new Error('Unauthorized');
      const developer = await db.developerAccount.findUnique({
        where: { userId: context.user.id },
      });
      if (!developer) return [];
      return db.marketplaceWebhookSubscription.findMany({
        where: { developerId: developer.id },
      });
    },
  },

  Mutation: {
    createAPIKey: async (_: any, args: any, context: any) => {
      if (!context.user) throw new Error('Unauthorized');

      let developer = await db.developerAccount.findUnique({
        where: { userId: context.user.id },
      });

      if (!developer) {
        developer = await db.developerAccount.create({
          data: { userId: context.user.id },
        });
      }

      const { key, secret } = generateAPIKey();
      const keyHash = hashAPIKey(key);
      const secretHash = hashAPIKey(secret);

      const rateLimit = await db.marketplaceRateLimit.findFirst({
        where: { tier: 'STARTER' },
      });

      return db.marketplaceAPIKey.create({
        data: {
          developerId: developer.id,
          name: args.name,
          keyPrefix: key.split('_')[0] + '_',
          keyHash,
          secretHash,
          scopes: args.scopes,
          rateLimitId: rateLimit?.id,
        },
        include: { rateLimit: true },
      });
    },

    createApp: async (_: any, args: any, context: any) => {
      if (!context.user) throw new Error('Unauthorized');

      let developer = await db.developerAccount.findUnique({
        where: { userId: context.user.id },
      });

      if (!developer) {
        developer = await db.developerAccount.create({
          data: { userId: context.user.id },
        });
      }

      return db.marketplaceApp.create({
        data: {
          developerId: developer.id,
          ...args.input,
          status: 'DRAFT',
        },
      });
    },

    deleteApp: async (_: any, args: any, context: any) => {
      if (!context.user) throw new Error('Unauthorized');

      const developer = await db.developerAccount.findUnique({
        where: { userId: context.user.id },
      });

      if (!developer) throw new Error('Developer not found');

      const app = await db.marketplaceApp.findFirst({
        where: { id: args.id, developerId: developer.id },
      });

      if (!app) throw new Error('App not found');

      await db.marketplaceApp.delete({ where: { id: args.id } });
      return true;
    },

    createWebhook: async (_: any, args: any, context: any) => {
      if (!context.user) throw new Error('Unauthorized');

      let developer = await db.developerAccount.findUnique({
        where: { userId: context.user.id },
      });

      if (!developer) {
        developer = await db.developerAccount.create({
          data: { userId: context.user.id },
        });
      }

      const crypto = require('crypto');
      const secret = crypto.randomBytes(32).toString('base64');
      const secretHash = hashAPIKey(secret);

      return db.marketplaceWebhookSubscription.create({
        data: {
          developerId: developer.id,
          url: args.input.url,
          events: args.input.events,
          secretHash,
          headers: args.input.headers || {},
        },
      });
    },
  },

  // Field resolvers
  User: {
    apiKeys: async (parent: any) => {
      const developer = await db.developerAccount.findUnique({
        where: { userId: parent.id },
      });
      if (!developer) return [];
      return db.marketplaceAPIKey.findMany({
        where: { developerId: developer.id },
      });
    },
    apps: async (parent: any) => {
      const developer = await db.developerAccount.findUnique({
        where: { userId: parent.id },
      });
      if (!developer) return [];
      return db.marketplaceApp.findMany({
        where: { developerId: developer.id },
      });
    },
  },

  App: {
    owner: async (parent: any) => {
      const developer = await db.developerAccount.findUnique({
        where: { id: parent.developerId },
      });
      return db.user.findUnique({ where: { id: developer?.userId } });
    },
    reviews: async (parent: any) => {
      return db.marketplaceAppReview.findMany({
        where: { appId: parent.id },
      });
    },
  },
};
