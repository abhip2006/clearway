import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { RootNavigator } from './src/navigation/RootNavigator';
import { syncService } from './src/services/sync.service';
import { notificationsService } from './src/services/notifications.service';
import { analyticsService } from './src/services/analytics.service';
import { authService } from './src/services/auth.service';

export default function App() {
  useEffect(() => {
    initializeApp();

    return () => {
      // Cleanup
      syncService.destroy();
      notificationsService.cleanup();
    };
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize analytics
      await analyticsService.initialize();
      await analyticsService.trackAppOpen();

      // Initialize sync service
      await syncService.initialize();

      // Initialize notifications
      await notificationsService.initialize();

      // Check for existing auth token
      const token = await authService.getToken();
      if (token) {
        // Validate and refresh if needed
        await authService.refreshAccessToken();
      }
    } catch (error) {
      console.error('App initialization failed:', error);
      analyticsService.trackCrash(error as Error);
    }
  };

  return (
    <>
      <StatusBar style="auto" />
      <RootNavigator />
    </>
  );
}
