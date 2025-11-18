// Security & Compliance Agent - Task SEC-001
// Comprehensive Audit Logging System

import { db } from '@/lib/db';
import { z } from 'zod';

export enum AuditAction {
  // User actions
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',

  // Capital call actions
  CAPITAL_CALL_VIEWED = 'CAPITAL_CALL_VIEWED',
  CAPITAL_CALL_APPROVED = 'CAPITAL_CALL_APPROVED',
  CAPITAL_CALL_REJECTED = 'CAPITAL_CALL_REJECTED',
  CAPITAL_CALL_EXPORTED = 'CAPITAL_CALL_EXPORTED',

  // Payment actions
  PAYMENT_RECORDED = 'PAYMENT_RECORDED',
  PAYMENT_RECONCILED = 'PAYMENT_RECONCILED',

  // Document actions
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  DOCUMENT_DOWNLOADED = 'DOCUMENT_DOWNLOADED',
  DOCUMENT_DELETED = 'DOCUMENT_DELETED',

  // Settings & API actions
  SETTINGS_CHANGED = 'SETTINGS_CHANGED',
  API_KEY_CREATED = 'API_KEY_CREATED',
  API_KEY_REVOKED = 'API_KEY_REVOKED',

  // GDPR & compliance actions
  DATA_EXPORTED = 'DATA_EXPORTED',
  DSAR_REQUESTED = 'DSAR_REQUESTED',
  DATA_DELETION_REQUESTED = 'DATA_DELETION_REQUESTED',
}

export interface AuditContext {
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  geolocation?: {
    country: string;
    city?: string;
  };
  deviceFingerprint?: string;
}

export type SecurityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AuditLogParams {
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
  context: AuditContext;
  securityLevel?: SecurityLevel;
}

export class AuditLogger {
  /**
   * Log an audit event with automatic security level classification
   */
  static async log(params: AuditLogParams) {
    // Determine security level if not provided
    const securityLevel = params.securityLevel || this.getDefaultSecurityLevel(params.action);

    // Create audit log entry
    const auditLog = await db.auditLog.create({
      data: {
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        userId: params.context.userId,
        sessionId: params.context.sessionId,
        ipAddress: params.context.ipAddress,
        userAgent: params.context.userAgent,
        geolocation: params.context.geolocation,
        deviceFingerprint: params.context.deviceFingerprint,
        metadata: params.metadata,
        securityLevel,
        timestamp: new Date(),
      },
    });

    // Alert on critical actions
    if (securityLevel === 'CRITICAL') {
      await this.sendSecurityAlert(auditLog);
    }

    // Stream to SIEM (Datadog, Splunk, etc.)
    await this.streamToSIEM(auditLog);

    return auditLog;
  }

  /**
   * Determine default security level based on action type
   */
  private static getDefaultSecurityLevel(action: AuditAction): SecurityLevel {
    const criticalActions = [
      AuditAction.USER_DELETED,
      AuditAction.API_KEY_CREATED,
      AuditAction.DATA_EXPORTED,
      AuditAction.DOCUMENT_DELETED,
      AuditAction.DSAR_REQUESTED,
      AuditAction.DATA_DELETION_REQUESTED,
    ];

    const highActions = [
      AuditAction.CAPITAL_CALL_APPROVED,
      AuditAction.PAYMENT_RECORDED,
      AuditAction.SETTINGS_CHANGED,
      AuditAction.API_KEY_REVOKED,
    ];

    const mediumActions = [
      AuditAction.CAPITAL_CALL_VIEWED,
      AuditAction.DOCUMENT_UPLOADED,
      AuditAction.USER_LOGIN,
      AuditAction.USER_CREATED,
    ];

    if (criticalActions.includes(action)) return 'CRITICAL';
    if (highActions.includes(action)) return 'HIGH';
    if (mediumActions.includes(action)) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Send critical security alerts to PagerDuty/Slack
   */
  private static async sendSecurityAlert(auditLog: any): Promise<void> {
    try {
      // Send to PagerDuty if configured
      if (process.env.PAGERDUTY_WEBHOOK_URL && process.env.PAGERDUTY_ROUTING_KEY) {
        await fetch(process.env.PAGERDUTY_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            routing_key: process.env.PAGERDUTY_ROUTING_KEY,
            event_action: 'trigger',
            payload: {
              summary: `Critical Security Event: ${auditLog.action}`,
              severity: 'critical',
              source: 'Clearway Audit Logger',
              custom_details: auditLog,
            },
          }),
        });
      }

      // Send to Slack if configured
      if (process.env.SLACK_SECURITY_WEBHOOK_URL) {
        await fetch(process.env.SLACK_SECURITY_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🚨 Critical Security Event: ${auditLog.action}`,
            blocks: [
              {
                type: 'header',
                text: {
                  type: 'plain_text',
                  text: `🚨 Critical Security Event`,
                },
              },
              {
                type: 'section',
                fields: [
                  {
                    type: 'mrkdwn',
                    text: `*Action:*\n${auditLog.action}`,
                  },
                  {
                    type: 'mrkdwn',
                    text: `*User ID:*\n${auditLog.userId || 'N/A'}`,
                  },
                  {
                    type: 'mrkdwn',
                    text: `*IP Address:*\n${auditLog.ipAddress || 'N/A'}`,
                  },
                  {
                    type: 'mrkdwn',
                    text: `*Timestamp:*\n${auditLog.timestamp}`,
                  },
                ],
              },
            ],
          }),
        });
      }
    } catch (error) {
      console.error('Failed to send security alert:', error);
      // Don't throw - we don't want to break the main flow
    }
  }

  /**
   * Stream audit logs to SIEM systems (Datadog, Splunk)
   */
  private static async streamToSIEM(auditLog: any): Promise<void> {
    const promises: Promise<any>[] = [];

    // Send to Datadog
    if (process.env.DATADOG_API_KEY) {
      promises.push(
        fetch('https://http-intake.logs.datadoghq.com/api/v2/logs', {
          method: 'POST',
          headers: {
            'DD-API-KEY': process.env.DATADOG_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ddsource: 'clearway-audit',
            ddtags: `env:${process.env.NODE_ENV},action:${auditLog.action},security_level:${auditLog.securityLevel}`,
            hostname: 'clearway-api',
            service: 'clearway',
            message: JSON.stringify(auditLog),
          }),
        }).catch((error) => {
          console.error('Failed to stream to Datadog:', error);
        })
      );
    }

    // Send to Splunk
    if (process.env.SPLUNK_HEC_URL && process.env.SPLUNK_HEC_TOKEN) {
      promises.push(
        fetch(process.env.SPLUNK_HEC_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Splunk ${process.env.SPLUNK_HEC_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            event: auditLog,
            sourcetype: 'clearway:audit',
            source: 'audit-logger',
            index: 'security',
          }),
        }).catch((error) => {
          console.error('Failed to stream to Splunk:', error);
        })
      );
    }

    // Wait for all SIEM streams (but don't block on failure)
    await Promise.allSettled(promises);
  }

  /**
   * Search audit logs with flexible filters
   */
  static async searchAuditLogs(params: {
    userId?: string;
    actions?: AuditAction[];
    entityType?: string;
    entityId?: string;
    startDate?: Date;
    endDate?: Date;
    securityLevel?: SecurityLevel[];
    ipAddress?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (params.userId) where.userId = params.userId;
    if (params.actions) where.action = { in: params.actions };
    if (params.entityType) where.entityType = params.entityType;
    if (params.entityId) where.entityId = params.entityId;
    if (params.securityLevel) where.securityLevel = { in: params.securityLevel };
    if (params.ipAddress) where.ipAddress = params.ipAddress;

    if (params.startDate || params.endDate) {
      where.timestamp = {};
      if (params.startDate) where.timestamp.gte = params.startDate;
      if (params.endDate) where.timestamp.lte = params.endDate;
    }

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: params.limit || 100,
        skip: params.offset || 0,
      }),
      db.auditLog.count({ where }),
    ]);

    return {
      logs,
      total,
      page: Math.floor((params.offset || 0) / (params.limit || 100)) + 1,
      pageSize: params.limit || 100,
    };
  }

  /**
   * Get audit log statistics
   */
  static async getAuditStats(params: {
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: any = {};
    if (params.userId) where.userId = params.userId;
    if (params.startDate || params.endDate) {
      where.timestamp = {};
      if (params.startDate) where.timestamp.gte = params.startDate;
      if (params.endDate) where.timestamp.lte = params.endDate;
    }

    const [totalLogs, criticalLogs, securityLevelBreakdown] = await Promise.all([
      db.auditLog.count({ where }),
      db.auditLog.count({ where: { ...where, securityLevel: 'CRITICAL' } }),
      db.auditLog.groupBy({
        by: ['securityLevel'],
        where,
        _count: true,
      }),
    ]);

    return {
      totalLogs,
      criticalLogs,
      securityLevelBreakdown: securityLevelBreakdown.map((level) => ({
        level: level.securityLevel,
        count: level._count,
      })),
    };
  }
}
