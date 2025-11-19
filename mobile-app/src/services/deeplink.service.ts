import * as Linking from 'expo-linking';

export interface DeepLinkRoute {
  path: string;
  handler: (params: Record<string, any>) => void;
}

export class DeepLinkService {
  private routes: Map<string, DeepLinkRoute> = new Map();

  /**
   * Initialize deep linking
   */
  initialize(navigation: any): void {
    // Register routes
    this.registerRoutes(navigation);

    // Handle initial URL
    Linking.getInitialURL().then((url) => {
      if (url != null) {
        this.handleUrl(url, navigation);
      }
    });

    // Listen for URL changes
    Linking.addEventListener('url', ({ url }) => {
      this.handleUrl(url, navigation);
    });
  }

  /**
   * Register deep link routes
   */
  private registerRoutes(navigation: any): void {
    this.routes.set('capital-calls/:id', {
      path: 'capital-calls/:id',
      handler: (params) => {
        navigation.navigate('CapitalCallDetail', { id: params.id });
      },
    });

    this.routes.set('documents/:id', {
      path: 'documents/:id',
      handler: (params) => {
        navigation.navigate('DocumentViewer', { id: params.id });
      },
    });

    this.routes.set('notifications', {
      path: 'notifications',
      handler: () => {
        navigation.navigate('Notifications');
      },
    });

    this.routes.set('profile', {
      path: 'profile',
      handler: () => {
        navigation.navigate('Profile');
      },
    });
  }

  /**
   * Handle deep link URL
   */
  private handleUrl(url: string, navigation: any): void {
    const parts = Linking.parse(url);
    const pathname = parts.path || '';

    console.log('Deep link:', pathname);

    // Match route
    for (const [, route] of this.routes) {
      if (this.matchRoute(pathname, route.path)) {
        const params = this.extractParams(pathname, route.path);
        route.handler(params);
        break;
      }
    }
  }

  /**
   * Match route pattern
   */
  private matchRoute(pathname: string, pattern: string): boolean {
    const patternRegex = pattern.replace(/:(\w+)/g, '([^/]+)');
    return new RegExp(`^${patternRegex}$`).test(pathname);
  }

  /**
   * Extract parameters from URL
   */
  private extractParams(
    pathname: string,
    pattern: string
  ): Record<string, any> {
    const params: Record<string, any> = {};
    const patternParts = pattern.split('/');
    const pathParts = pathname.split('/');

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        const paramName = patternParts[i].substring(1);
        params[paramName] = pathParts[i];
      }
    }

    return params;
  }

  /**
   * Generate deep link URL
   */
  generateLink(path: string, params?: Record<string, any>): string {
    const baseUrl = 'https://clearway.app';
    let url = `${baseUrl}/${path}`;

    if (params) {
      const queryString = new URLSearchParams(params).toString();
      url += `?${queryString}`;
    }

    return url;
  }

  /**
   * Generate dynamic link (Firebase Dynamic Links)
   */
  async generateDynamicLink(
    path: string,
    params?: Record<string, any>
  ): Promise<string> {
    try {
      const link = this.generateLink(path, params);

      // Use Firebase Dynamic Links API
      const dynamicLink = await fetch(
        'https://firebasedynamiclinks.googleapis.com/v1/shortLinks',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            longDynamicLink:
              'https://clearwayapp.page.link/?link=' +
              encodeURIComponent(link) +
              '&apn=com.clearway.mobile&ibi=com.clearway&isi=1234567890',
          }),
        }
      );

      const result = await dynamicLink.json();
      return result.shortLink;
    } catch (error) {
      console.error('Dynamic link generation failed:', error);
      return this.generateLink(path, params);
    }
  }
}

export const deeplinkService = new DeepLinkService();
