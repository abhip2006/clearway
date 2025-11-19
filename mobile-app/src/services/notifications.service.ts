import * as Notifications from 'expo-notifications';
import messaging from '@react-native-firebase/messaging';
import { useNotificationStore } from '../store/notifications.store';
import { useAuthStore } from '../store/auth.store';
import { database } from '../db/database';
import { Platform } from 'react-native';

const API_URL = process.env.API_URL || 'https://api.clearway.app';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    console.log('Notification received:', notification);
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    };
  },
});

export class NotificationsService {
  private notificationSubscription: any;

  /**
   * Initialize push notifications
   */
  async initialize(): Promise<void> {
    try {
      // Request permissions
      await this.requestPermissions();

      // Get FCM token
      const token = await this.getFCMToken();
      console.log('FCM Token:', token);

      // Register with backend
      await this.registerDeviceToken(token);

      // Listen for messages
      this.setupMessageListeners();

      // Listen for notification interaction
      this.setupNotificationInteraction();
    } catch (error) {
      console.error('Notification initialization failed:', error);
    }
  }

  /**
   * Request notification permissions
   */
  private async requestPermissions(): Promise<void> {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Permission not granted for notifications');
      return;
    }

    // iOS specific
    await messaging().requestPermission();
  }

  /**
   * Get FCM token
   */
  private async getFCMToken(): Promise<string> {
    const token = await messaging().getToken();
    return token;
  }

  /**
   * Register device token with backend
   */
  private async registerDeviceToken(token: string): Promise<void> {
    try {
      const { token: authToken } = useAuthStore.getState();

      await fetch(`${API_URL}/notifications/register-device`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          deviceToken: token,
          platform: Platform.OS,
          appVersion: '1.0.0',
        }),
      });
    } catch (error) {
      console.error('Device registration failed:', error);
    }
  }

  /**
   * Setup FCM message listeners
   */
  private setupMessageListeners(): void {
    // Foreground message handler
    messaging().onMessage(async (message) => {
      console.log('Message received (foreground):', message);

      // Show notification
      if (message.notification) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: message.notification.title || 'Clearway',
            body: message.notification.body || '',
            data: message.data || {},
            badge: 1,
          },
          trigger: { seconds: 1 },
        });
      }

      // Save to store
      this.addNotification({
        title: message.notification?.title || '',
        body: message.notification?.body || '',
        type: (message.data?.type as any) || 'NOTIFICATION',
        relatedId: message.data?.relatedId,
        actionUrl: message.data?.actionUrl,
      });
    });

    // Background message handler
    messaging().setBackgroundMessageHandler(async (message) => {
      console.log('Message received (background):', message);

      // Show notification
      if (message.notification) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: message.notification.title || 'Clearway',
            body: message.notification.body || '',
            data: message.data || {},
            badge: 1,
          },
          trigger: { seconds: 2 },
        });
      }
    });

    // App launch from notification
    messaging().onNotificationOpenedApp((message) => {
      console.log('App opened by notification:', message);
      this.handleNotificationAction(message.data?.actionUrl || '');
    });

    // Check if app was opened from notification
    messaging()
      .getInitialNotification()
      .then((message) => {
        if (message) {
          console.log('App opened from notification:', message);
          this.handleNotificationAction(message.data?.actionUrl || '');
        }
      });
  }

  /**
   * Setup notification interaction
   */
  private setupNotificationInteraction(): void {
    // When user taps notification
    this.notificationSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const actionUrl = response.notification.request.content.data?.actionUrl;

        if (actionUrl) {
          this.handleNotificationAction(actionUrl as string);
        }
      });
  }

  /**
   * Handle notification action (deep linking)
   */
  private async handleNotificationAction(actionUrl: string): Promise<void> {
    // Parse URL and navigate
    console.log('Handling notification action:', actionUrl);
    // Navigation handled by deep linking service
  }

  /**
   * Save notification to database
   */
  private async addNotification(data: {
    title: string;
    body: string;
    type: string;
    relatedId?: string;
    actionUrl?: string;
  }): Promise<void> {
    try {
      const collection = database.get('notifications');
      await database.write(async () => {
        await collection.create((record: any) => {
          record.title = data.title;
          record.body = data.body;
          record.type = data.type;
          record.relatedId = data.relatedId;
          record.actionUrl = data.actionUrl;
          record.read = false;
        });
      });

      useNotificationStore.setState((state) => ({
        notifications: [
          {
            id: Date.now().toString(),
            ...data,
            read: false,
            createdAt: Date.now(),
          },
          ...state.notifications,
        ],
        unreadCount: state.unreadCount + 1,
      }));
    } catch (error) {
      console.error('Failed to save notification:', error);
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const collection = database.get('notifications');
      const notification = await collection.find(notificationId);

      await database.write(async () => {
        await notification.update((record: any) => {
          record.read = true;
        });
      });

      useNotificationStore.setState((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }

  /**
   * Get unread notifications
   */
  async getUnreadNotifications(): Promise<number> {
    try {
      const collection = database.get('notifications');
      const unread = await collection
        .query()
        .fetchCount();

      return unread;
    } catch (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    if (this.notificationSubscription) {
      this.notificationSubscription.remove();
    }
  }
}

export const notificationsService = new NotificationsService();
