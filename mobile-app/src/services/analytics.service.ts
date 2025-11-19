import analytics from '@react-native-firebase/analytics';

export class AnalyticsService {
  /**
   * Initialize analytics
   */
  async initialize(): Promise<void> {
    try {
      // Firebase Analytics
      await analytics().setAnalyticsCollectionEnabled(true);
    } catch (error) {
      console.error('Analytics initialization failed:', error);
    }
  }

  /**
   * Track screen view
   */
  async trackScreenView(
    screenName: string,
    screenClass?: string
  ): Promise<void> {
    try {
      await analytics().logScreenView({
        screen_name: screenName,
        screen_class: screenClass || screenName,
      });
    } catch (error) {
      console.error('Screen view tracking failed:', error);
    }
  }

  /**
   * Track event
   */
  async trackEvent(
    eventName: string,
    params?: Record<string, any>
  ): Promise<void> {
    try {
      await analytics().logEvent(eventName, params);
    } catch (error) {
      console.error('Event tracking failed:', error);
    }
  }

  /**
   * Track app open
   */
  async trackAppOpen(): Promise<void> {
    await this.trackEvent('app_open', {
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track authentication
   */
  async trackLogin(method: 'BIOMETRIC' | 'PIN'): Promise<void> {
    await this.trackEvent('login', {
      method,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track capital call action
   */
  async trackCapitalCallAction(
    action: 'VIEW' | 'APPROVE' | 'REJECT',
    callId: string
  ): Promise<void> {
    await this.trackEvent('capital_call_action', {
      action,
      callId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track document upload
   */
  async trackDocumentUpload(
    fileSize: number,
    duration: number
  ): Promise<void> {
    await this.trackEvent('document_upload', {
      fileSize,
      duration,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track notification interaction
   */
  async trackNotificationInteraction(
    notificationType: string,
    action: string
  ): Promise<void> {
    await this.trackEvent('notification_interaction', {
      type: notificationType,
      action,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track sync event
   */
  async trackSync(
    itemsCount: number,
    duration: number,
    status: 'SUCCESS' | 'FAILED'
  ): Promise<void> {
    await this.trackEvent('sync_event', {
      itemsCount,
      duration,
      status,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Set user properties
   */
  async setUserProperties(
    userId: string,
    properties: Record<string, any>
  ): Promise<void> {
    try {
      // Firebase
      await analytics().setUserId(userId);
      await analytics().setUserProperties(properties);
    } catch (error) {
      console.error('User properties setting failed:', error);
    }
  }

  /**
   * Track crash
   */
  async trackCrash(error: Error): Promise<void> {
    try {
      await analytics().logEvent('app_crash', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Crash tracking failed:', err);
    }
  }

  /**
   * Track performance
   */
  async trackPerformance(metric: string, value: number): Promise<void> {
    await this.trackEvent('performance_metric', {
      metric,
      value,
      timestamp: new Date().toISOString(),
    });
  }
}

export const analyticsService = new AnalyticsService();
