import { jest } from '@jest/globals';
import { scrapeGeneric, scrapeMFC, ScrapeConfig } from '../../services/genericScraper';
import mockPuppeteer, { mockBrowser, mockPage } from '../__mocks__/puppeteer';

// Mock puppeteer
jest.mock('puppeteer', () => mockPuppeteer);

describe('Error Handling and Timeout Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mocks to default successful behavior
    mockPage.setViewport.mockResolvedValue(undefined);
    mockPage.setUserAgent.mockResolvedValue(undefined);
    mockPage.setExtraHTTPHeaders.mockResolvedValue(undefined);
    mockPage.goto.mockResolvedValue(undefined);
    mockPage.title.mockResolvedValue('Test Page');
    mockPage.evaluate.mockResolvedValue({});
    mockPage.waitForFunction.mockResolvedValue(undefined);
    mockPage.close.mockResolvedValue(undefined);
    mockBrowser.newPage.mockResolvedValue(mockPage);
    mockBrowser.close.mockResolvedValue(undefined);
  });

  describe('Navigation Timeouts', () => {
    it('should handle page load timeout', async () => {
      const timeoutError = new Error('Navigation timeout of 20000 ms exceeded');
      timeoutError.name = 'TimeoutError';
      mockPage.goto.mockRejectedValueOnce(timeoutError);

      await expect(scrapeGeneric('https://slow-website.com', {}))
        .rejects.toThrow('Navigation timeout of 20000 ms exceeded');

      expect(mockPage.close).toHaveBeenCalled();
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should handle DNS resolution errors', async () => {
      const dnsError = new Error('ERR_NAME_NOT_RESOLVED');
      dnsError.name = 'ERR_NAME_NOT_RESOLVED';
      mockPage.goto.mockRejectedValueOnce(dnsError);

      await expect(scrapeGeneric('https://non-existent-domain.invalid', {}))
        .rejects.toThrow('ERR_NAME_NOT_RESOLVED');
    });

    it('should handle connection refused errors', async () => {
      const connectionError = new Error('ERR_CONNECTION_REFUSED');
      connectionError.name = 'ERR_CONNECTION_REFUSED';
      mockPage.goto.mockRejectedValueOnce(connectionError);

      await expect(scrapeGeneric('https://localhost:99999', {}))
        .rejects.toThrow('ERR_CONNECTION_REFUSED');
    });

    it('should handle SSL certificate errors', async () => {
      const sslError = new Error('ERR_CERT_AUTHORITY_INVALID');
      sslError.name = 'ERR_CERT_AUTHORITY_INVALID';
      mockPage.goto.mockRejectedValueOnce(sslError);

      await expect(scrapeGeneric('https://self-signed.badssl.com', {}))
        .rejects.toThrow('ERR_CERT_AUTHORITY_INVALID');
    });

    it('should handle HTTP error responses', async () => {
      const httpError = new Error('HTTP 404 Not Found');
      httpError.name = 'HTTPError';
      mockPage.goto.mockRejectedValueOnce(httpError);

      await expect(scrapeGeneric('https://example.com/not-found', {}))
        .rejects.toThrow('HTTP 404 Not Found');
    });
  });

  describe('Browser Launch Failures', () => {
    it('should handle browser launch timeout', async () => {
      const puppeteerModule = await import('puppeteer');
      const launchError = new Error('Failed to launch the browser process!');
      (puppeteerModule.launch as jest.Mock).mockRejectedValueOnce(launchError);

      await expect(scrapeGeneric('https://example.com', {}))
        .rejects.toThrow('Failed to launch the browser process!');
    });

    it('should handle browser launch with invalid args', async () => {
      const puppeteerModule = await import('puppeteer');
      const argsError = new Error('Unknown argument: --invalid-arg');
      (puppeteerModule.launch as jest.Mock).mockRejectedValueOnce(argsError);

      await expect(scrapeGeneric('https://example.com', {}))
        .rejects.toThrow('Unknown argument: --invalid-arg');
    });

    it('should handle system resource exhaustion', async () => {
      const puppeteerModule = await import('puppeteer');
      const resourceError = new Error('ENOSPC: no space left on device');
      (puppeteerModule.launch as jest.Mock).mockRejectedValueOnce(resourceError);

      await expect(scrapeGeneric('https://example.com', {}))
        .rejects.toThrow('ENOSPC: no space left on device');
    });
  });

  describe('Page Creation Failures', () => {
    it('should handle page creation failure', async () => {
      const pageError = new Error('Failed to create page');
      mockBrowser.newPage.mockRejectedValueOnce(pageError);

      await expect(scrapeGeneric('https://example.com', {}))
        .rejects.toThrow('Failed to create page');

      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should handle browser disconnection during page creation', async () => {
      const disconnectionError = new Error('Protocol error: Browser closed.');
      mockBrowser.newPage.mockRejectedValueOnce(disconnectionError);

      await expect(scrapeGeneric('https://example.com', {}))
        .rejects.toThrow('Protocol error: Browser closed.');
    });
  });

  describe('Page Configuration Failures', () => {
    it('should handle viewport setting errors', async () => {
      const viewportError = new Error('Invalid viewport dimensions');
      mockPage.setViewport.mockRejectedValueOnce(viewportError);

      await expect(scrapeGeneric('https://example.com', {}))
        .rejects.toThrow('Invalid viewport dimensions');
    });

    it('should handle user agent setting errors', async () => {
      const userAgentError = new Error('Invalid user agent string');
      mockPage.setUserAgent.mockRejectedValueOnce(userAgentError);

      await expect(scrapeGeneric('https://example.com', {}))
        .rejects.toThrow('Invalid user agent string');
    });

    it('should handle header setting errors', async () => {
      const headerError = new Error('Invalid header value');
      mockPage.setExtraHTTPHeaders.mockRejectedValueOnce(headerError);

      await expect(scrapeGeneric('https://example.com', {}))
        .rejects.toThrow('Invalid header value');
    });
  });

  describe('Cloudflare Challenge Timeout Handling', () => {
    it('should handle Cloudflare challenge timeout gracefully', async () => {
      const config: ScrapeConfig = {
        cloudflareDetection: {
          titleIncludes: ['Just a moment'],
          bodyIncludes: ['Just a moment'],
        },
      };

      // Simulate Cloudflare challenge detection
      mockPage.title.mockResolvedValueOnce('Just a moment...');
      mockPage.evaluate.mockResolvedValueOnce('Just a moment...');
      
      // Simulate challenge timeout
      const challengeTimeout = new Error('Evaluation failed: Timeout');
      challengeTimeout.name = 'TimeoutError';
      mockPage.waitForFunction.mockRejectedValueOnce(challengeTimeout);
      
      // But evaluation should still succeed
      mockPage.evaluate.mockResolvedValueOnce({ data: 'scraped successfully after timeout' });

      const result = await scrapeGeneric('https://protected-site.com', config);

      expect(result).toEqual({ data: 'scraped successfully after timeout' });
    });

    it('should handle permanent Cloudflare blocking', async () => {
      const config: ScrapeConfig = {
        cloudflareDetection: {
          titleIncludes: ['Access denied'],
          bodyIncludes: ['You have been blocked'],
        },
      };

      mockPage.title.mockResolvedValueOnce('Access denied');
      mockPage.evaluate.mockResolvedValueOnce('You have been blocked');
      mockPage.waitForFunction.mockRejectedValueOnce(new Error('Permanent block'));

      // Should still attempt to extract data
      mockPage.evaluate.mockResolvedValueOnce({});

      const result = await scrapeGeneric('https://blocked-site.com', config);
      expect(result).toEqual({});
    });
  });

  describe('Data Extraction Failures', () => {
    it('should handle page evaluation timeout', async () => {
      const evaluationTimeout = new Error('Evaluation failed: Timeout');
      evaluationTimeout.name = 'TimeoutError';
      mockPage.evaluate.mockRejectedValueOnce(evaluationTimeout);

      await expect(scrapeGeneric('https://example.com', { imageSelector: '.image' }))
        .rejects.toThrow('Evaluation failed: Timeout');
    });

    it('should handle JavaScript execution errors in page context', async () => {
      const jsError = new Error('ReferenceError: someVariable is not defined');
      mockPage.evaluate.mockRejectedValueOnce(jsError);

      await expect(scrapeGeneric('https://example.com', { nameSelector: '.name' }))
        .rejects.toThrow('ReferenceError: someVariable is not defined');
    });

    it('should handle DOM manipulation errors', async () => {
      const domError = new Error('Cannot read property of null');
      mockPage.evaluate.mockRejectedValueOnce(domError);

      await expect(scrapeGeneric('https://example.com', { manufacturerSelector: '.manufacturer' }))
        .rejects.toThrow('Cannot read property of null');
    });

    it('should handle complex selector errors', async () => {
      const config: ScrapeConfig = {
        manufacturerSelector: '.data-field .data-label:contains("Company") + .data-value .item-entries a span[switch]',
      };

      const selectorError = new Error('Invalid selector');
      mockPage.evaluate.mockRejectedValueOnce(selectorError);

      await expect(scrapeGeneric('https://myfigurecollection.net/item/123', config))
        .rejects.toThrow('Invalid selector');
    });
  });

  describe('Resource Cleanup on Errors', () => {
    it('should close page even if extraction fails', async () => {
      mockPage.evaluate.mockRejectedValueOnce(new Error('Extraction failed'));

      try {
        await scrapeGeneric('https://example.com', {});
      } catch (error) {
        // Expected error
      }

      expect(mockPage.close).toHaveBeenCalled();
    });

    it('should close browser even if page close fails', async () => {
      mockPage.evaluate.mockResolvedValueOnce({});
      mockPage.close.mockRejectedValueOnce(new Error('Page close failed'));

      await scrapeGeneric('https://example.com', {});

      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should handle both page and browser close failures', async () => {
      mockPage.evaluate.mockResolvedValueOnce({});
      mockPage.close.mockRejectedValueOnce(new Error('Page close failed'));
      mockBrowser.close.mockRejectedValueOnce(new Error('Browser close failed'));

      // Should not throw additional errors
      await expect(scrapeGeneric('https://example.com', {})).resolves.toBeDefined();
    });
  });

  describe('Memory and Performance Error Scenarios', () => {
    it('should handle out-of-memory errors', async () => {
      const memoryError = new Error('Process out of memory');
      memoryError.name = 'ENOMEM';
      mockPage.goto.mockRejectedValueOnce(memoryError);

      await expect(scrapeGeneric('https://heavy-site.com', {}))
        .rejects.toThrow('Process out of memory');
    });

    it('should handle page crash due to heavy content', async () => {
      const crashError = new Error('Page crashed!');
      mockPage.evaluate.mockRejectedValueOnce(crashError);

      await expect(scrapeGeneric('https://resource-heavy-site.com', {}))
        .rejects.toThrow('Page crashed!');
    });

    it('should handle browser becoming unresponsive', async () => {
      const unresponsiveError = new Error('Browser became unresponsive');
      mockBrowser.newPage.mockRejectedValueOnce(unresponsiveError);

      await expect(scrapeGeneric('https://example.com', {}))
        .rejects.toThrow('Browser became unresponsive');
    });
  });

  describe('Network-related Error Handling', () => {
    it('should handle network interruption during navigation', async () => {
      const networkError = new Error('ERR_NETWORK_CHANGED');
      mockPage.goto.mockRejectedValueOnce(networkError);

      await expect(scrapeGeneric('https://example.com', {}))
        .rejects.toThrow('ERR_NETWORK_CHANGED');
    });

    it('should handle proxy connection errors', async () => {
      const proxyError = new Error('ERR_PROXY_CONNECTION_FAILED');
      mockPage.goto.mockRejectedValueOnce(proxyError);

      await expect(scrapeGeneric('https://example.com', {}))
        .rejects.toThrow('ERR_PROXY_CONNECTION_FAILED');
    });

    it('should handle DNS over HTTPS errors', async () => {
      const dohError = new Error('ERR_DNS_MALFORMED_RESPONSE');
      mockPage.goto.mockRejectedValueOnce(dohError);

      await expect(scrapeGeneric('https://example.com', {}))
        .rejects.toThrow('ERR_DNS_MALFORMED_RESPONSE');
    });
  });

  describe('MFC-specific Error Scenarios', () => {
    it('should handle MFC server errors', async () => {
      const serverError = new Error('HTTP 503 Service Unavailable');
      mockPage.goto.mockRejectedValueOnce(serverError);

      await expect(scrapeMFC('https://myfigurecollection.net/item/123456'))
        .rejects.toThrow('HTTP 503 Service Unavailable');
    });

    it('should handle MFC rate limiting', async () => {
      const rateLimitError = new Error('HTTP 429 Too Many Requests');
      mockPage.goto.mockRejectedValueOnce(rateLimitError);

      await expect(scrapeMFC('https://myfigurecollection.net/item/123456'))
        .rejects.toThrow('HTTP 429 Too Many Requests');
    });

    it('should handle MFC maintenance mode', async () => {
      const maintenanceError = new Error('HTTP 503 Maintenance');
      mockPage.goto.mockRejectedValueOnce(maintenanceError);

      await expect(scrapeMFC('https://myfigurecollection.net/item/123456'))
        .rejects.toThrow('HTTP 503 Maintenance');
    });
  });

  describe('Configuration Error Handling', () => {
    it('should handle invalid selector syntax', async () => {
      const config: ScrapeConfig = {
        imageSelector: '<<<invalid-selector>>>',
      };

      const selectorError = new Error('DOMException: Failed to execute querySelector');
      mockPage.evaluate.mockRejectedValueOnce(selectorError);

      await expect(scrapeGeneric('https://example.com', config))
        .rejects.toThrow('DOMException: Failed to execute querySelector');
    });

    it('should handle extremely long wait times gracefully', async () => {
      const config: ScrapeConfig = {
        waitTime: 300000, // 5 minutes - unreasonable
      };

      // Should still work but we won't actually wait that long in tests
      mockPage.evaluate.mockResolvedValueOnce({ data: 'extracted' });

      const result = await scrapeGeneric('https://example.com', config);
      expect(result).toEqual({ data: 'extracted' });
    });

    it('should handle empty configuration gracefully', async () => {
      const emptyConfig: ScrapeConfig = {};
      
      mockPage.evaluate.mockResolvedValueOnce({});

      const result = await scrapeGeneric('https://example.com', emptyConfig);
      expect(result).toEqual({});
    });
  });

  describe('Concurrent Error Scenarios', () => {
    it('should handle multiple concurrent failures', async () => {
      const promises = Array(5).fill(0).map((_, i) => {
        if (i % 2 === 0) {
          mockPage.goto.mockRejectedValueOnce(new Error(`Navigation failed ${i}`));
        } else {
          mockPage.evaluate.mockRejectedValueOnce(new Error(`Extraction failed ${i}`));
        }
        return scrapeGeneric(`https://example.com/page${i}`, {});
      });

      const results = await Promise.allSettled(promises);

      // All should be rejected
      results.forEach((result, index) => {
        expect(result.status).toBe('rejected');
        if (result.status === 'rejected') {
          expect(result.reason.message).toMatch(/failed \d+/);
        }
      });
    });

    it('should maintain error isolation between concurrent requests', async () => {
      // One request fails, others should still succeed
      const successPromise1 = scrapeGeneric('https://example.com/success1', {});
      const failPromise = scrapeGeneric('https://example.com/fail', {});
      const successPromise2 = scrapeGeneric('https://example.com/success2', {});

      // Mock different outcomes
      mockPage.evaluate
        .mockResolvedValueOnce({ success: 1 })
        .mockRejectedValueOnce(new Error('Isolated failure'))
        .mockResolvedValueOnce({ success: 2 });

      const [result1, failResult, result2] = await Promise.allSettled([
        successPromise1,
        failPromise,
        successPromise2,
      ]);

      expect(result1.status).toBe('fulfilled');
      expect(failResult.status).toBe('rejected');
      expect(result2.status).toBe('fulfilled');
    });
  });
});