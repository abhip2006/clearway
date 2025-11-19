import { useEffect } from 'react';
import { analyticsService } from '../services/analytics.service';

export function useScreenAnalytics(
  screenName: string,
  screenClass?: string
) {
  useEffect(() => {
    analyticsService.trackScreenView(screenName, screenClass);
  }, [screenName, screenClass]);
}

export function useEventTracking(
  eventName: string,
  params?: Record<string, any>
) {
  const track = async () => {
    await analyticsService.trackEvent(eventName, params);
  };

  return track;
}
