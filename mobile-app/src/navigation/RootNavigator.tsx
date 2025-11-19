import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { deeplinkService } from '../services/deeplink.service';
import { useAuthStore } from '../store/auth.store';
import { LoginScreen } from '../screens/LoginScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { CapitalCallDetailScreen } from '../screens/CapitalCallDetailScreen';
import { DocumentCaptureScreen } from '../screens/DocumentCaptureScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { AppNavigator } from './AppNavigator';

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const linking = {
    prefixes: ['https://clearway.app', 'clearway://'],
    config: {
      screens: {
        CapitalCallDetail: 'capital-calls/:id',
        DocumentViewer: 'documents/:id',
        Notifications: 'notifications',
        Profile: 'profile',
      },
    },
  };

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Home" component={AppNavigator} />
            <Stack.Screen
              name="CapitalCallDetail"
              component={CapitalCallDetailScreen}
              options={{ headerShown: true, title: 'Capital Call' }}
            />
            <Stack.Screen
              name="DocumentCapture"
              component={DocumentCaptureScreen}
              options={{ headerShown: true, title: 'Capture Document' }}
            />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
