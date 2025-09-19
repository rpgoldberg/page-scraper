/**
 * Production-safe debug logging utility for Page Scraper Service
 *
 * Enable debug logging by setting environment variables:
 * - DEBUG=* (all debug logs)
 * - DEBUG=scraper:* (all scraper logs)
 * - DEBUG=scraper:mfc (MFC scraping logs)
 * - DEBUG=scraper:browser (browser/puppeteer logs)
 * - DEBUG=scraper:registration (service registration logs)
 * - SERVICE_AUTH_TOKEN_DEBUG=true (show partial token for debugging, NEVER full token)
 */

export interface Logger {
  debug: (namespace: string, message: string, data?: any) => void;
  info: (message: string, data?: any) => void;
  warn: (message: string, data?: any) => void;
  error: (message: string, error?: any) => void;
}

class DebugLogger implements Logger {
  private enabledNamespaces: Set<string>;
  private tokenDebug: boolean;

  constructor() {
    this.enabledNamespaces = this.parseDebugEnv();
    this.tokenDebug = process.env.SERVICE_AUTH_TOKEN_DEBUG === 'true';
  }

  private parseDebugEnv(): Set<string> {
    const debugEnv = process.env.DEBUG || '';
    if (!debugEnv) return new Set();

    if (debugEnv === '*') {
      return new Set(['*']);
    }

    return new Set(
      debugEnv.split(',')
        .map(ns => ns.trim())
        .filter(ns => ns.length > 0)
    );
  }

  private isNamespaceEnabled(namespace: string): boolean {
    if (this.enabledNamespaces.has('*')) return true;
    if (this.enabledNamespaces.has(namespace)) return true;

    // Check for wildcard patterns like scraper:*
    for (const pattern of this.enabledNamespaces) {
      if (pattern.endsWith(':*')) {
        const prefix = pattern.slice(0, -1); // Remove the *
        if (namespace.startsWith(prefix)) return true;
      }
    }

    return false;
  }

  private sanitizeData(data: any): any {
    if (!data) return data;

    // Create a deep copy to avoid modifying the original
    const sanitized = JSON.parse(JSON.stringify(data));

    // Sanitize sensitive fields
    const sensitiveFields = ['token', 'password', 'secret', 'key', 'authorization'];

    const sanitizeObject = (obj: any) => {
      for (const key in obj) {
        const lowerKey = key.toLowerCase();

        if (sensitiveFields.some(field => lowerKey.includes(field))) {
          if (typeof obj[key] === 'string' && obj[key].length > 0) {
            // For tokens, show partial if debug enabled
            if (lowerKey.includes('token') && this.tokenDebug) {
              obj[key] = obj[key].substring(0, 8) + '...' + obj[key].slice(-4);
            } else {
              obj[key] = '[REDACTED]';
            }
          }
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        }
      }
    };

    if (typeof sanitized === 'object' && sanitized !== null) {
      sanitizeObject(sanitized);
    }

    return sanitized;
  }

  debug(namespace: string, message: string, data?: any): void {
    if (!this.isNamespaceEnabled(namespace)) return;

    const timestamp = new Date().toISOString();
    const sanitizedData = this.sanitizeData(data);

    console.log(`[${timestamp}] [DEBUG] [${namespace}] ${message}`,
      sanitizedData ? JSON.stringify(sanitizedData, null, 2) : '');
  }

  info(message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const sanitizedData = this.sanitizeData(data);

    console.log(`[${timestamp}] [INFO] ${message}`,
      sanitizedData ? JSON.stringify(sanitizedData, null, 2) : '');
  }

  warn(message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const sanitizedData = this.sanitizeData(data);

    console.warn(`[${timestamp}] [WARN] ${message}`,
      sanitizedData ? JSON.stringify(sanitizedData, null, 2) : '');
  }

  error(message: string, error?: any): void {
    const timestamp = new Date().toISOString();

    // Handle Error objects specially
    let errorData: any;
    if (error instanceof Error) {
      errorData = {
        message: error.message,
        stack: error.stack,
        name: error.name
      };
    } else {
      errorData = this.sanitizeData(error);
    }

    console.error(`[${timestamp}] [ERROR] ${message}`,
      errorData ? JSON.stringify(errorData, null, 2) : '');
  }
}

// Export singleton instance
export const logger = new DebugLogger();

// Export debug helpers for specific namespaces
export const scraperDebug = {
  mfc: (message: string, data?: any) => logger.debug('scraper:mfc', message, data),
  browser: (message: string, data?: any) => logger.debug('scraper:browser', message, data),
  registration: (message: string, data?: any) => logger.debug('scraper:registration', message, data),
  api: (message: string, data?: any) => logger.debug('scraper:api', message, data),
  pool: (message: string, data?: any) => logger.debug('scraper:pool', message, data),
};