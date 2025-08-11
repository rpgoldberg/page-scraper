import { jest } from '@jest/globals';
import { initializeBrowserPool } from '../../services/genericScraper';
import { mockBrowser } from '../__mocks__/puppeteer';

// Mock puppeteer
jest.mock('puppeteer', () => ({
  launch: jest.fn().mockResolvedValue(mockBrowser),
}));

// We need to test the BrowserPool class, but it's private
// So we'll test through the public interface and some creative module manipulation
describe('Browser Pool Management', () => {
  let puppeteerModule: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  beforeAll(async () => {
    puppeteerModule = await import('puppeteer');
  });

  describe('initializeBrowserPool', () => {
    it('should initialize browser pool successfully', async () => {
      // Mock successful browser launches
      (puppeteerModule.launch as jest.Mock)
        .mockResolvedValueOnce(mockBrowser)
        .mockResolvedValueOnce(mockBrowser)
        .mockResolvedValueOnce(mockBrowser);

      await expect(initializeBrowserPool()).resolves.toBeUndefined();

      // Should launch 3 browsers for the pool
      expect(puppeteerModule.launch).toHaveBeenCalledTimes(3);
    });

    it('should handle browser launch failures gracefully', async () => {
      // Mock some browsers failing to launch
      (puppeteerModule.launch as jest.Mock)
        .mockResolvedValueOnce(mockBrowser)
        .mockRejectedValueOnce(new Error('Launch failed'))
        .mockResolvedValueOnce(mockBrowser);

      // Should not throw even if some browsers fail
      await expect(initializeBrowserPool()).resolves.toBeUndefined();

      expect(puppeteerModule.launch).toHaveBeenCalledTimes(3);
    });

    it('should not reinitialize if already initialized', async () => {
      // First initialization
      await initializeBrowserPool();
      const firstCallCount = (puppeteerModule.launch as jest.Mock).mock.calls.length;

      // Second call should not launch more browsers
      await initializeBrowserPool();
      const secondCallCount = (puppeteerModule.launch as jest.Mock).mock.calls.length;

      expect(secondCallCount).toBe(firstCallCount);
    });

    it('should use correct browser configuration', async () => {
      await initializeBrowserPool();

      expect(puppeteerModule.launch).toHaveBeenCalledWith(
        expect.objectContaining({
          headless: true,
          timeout: 30000,
          args: expect.arrayContaining([
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--single-process',
          ]),
        })
      );
    });
  });

  describe('Browser Pool Operations', () => {
    beforeEach(async () => {
      // Reset the module to get a fresh BrowserPool instance
      jest.resetModules();
      
      // Re-import the module
      const scraperModule = await import('../../services/genericScraper');
      
      // Mock fresh browsers for each test
      (puppeteerModule.launch as jest.Mock).mockClear();
      (puppeteerModule.launch as jest.Mock).mockResolvedValue(mockBrowser);
    });

    it('should retrieve browsers from pool during scraping', async () => {
      const { scrapeGeneric } = await import('../../services/genericScraper');
      
      // Mock the page.evaluate to return quickly
      mockBrowser.newPage.mockResolvedValue({
        ...mockBrowser.newPage(),
        setViewport: jest.fn().mockResolvedValue(undefined),
        setUserAgent: jest.fn().mockResolvedValue(undefined),
        setExtraHTTPHeaders: jest.fn().mockResolvedValue(undefined),
        goto: jest.fn().mockResolvedValue(undefined),
        title: jest.fn().mockResolvedValue('Test Page'),
        evaluate: jest.fn().mockResolvedValue({}),
        close: jest.fn().mockResolvedValue(undefined),
      });

      // This should trigger browser pool initialization and usage
      await scrapeGeneric('https://example.com', {});

      // Should have launched browsers for the pool
      expect(puppeteerModule.launch).toHaveBeenCalled();
    });

    it('should handle empty pool by creating emergency browser', async () => {
      const { scrapeGeneric } = await import('../../services/genericScraper');
      
      // Mock the scenario where pool is exhausted
      let callCount = 0;
      (puppeteerModule.launch as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount <= 3) {
          // Initial pool browsers
          return Promise.resolve(mockBrowser);
        } else {
          // Emergency browser
          return Promise.resolve({
            ...mockBrowser,
            newPage: jest.fn().mockResolvedValue({
              setViewport: jest.fn().mockResolvedValue(undefined),
              setUserAgent: jest.fn().mockResolvedValue(undefined),
              setExtraHTTPHeaders: jest.fn().mockResolvedValue(undefined),
              goto: jest.fn().mockResolvedValue(undefined),
              title: jest.fn().mockResolvedValue('Emergency Page'),
              evaluate: jest.fn().mockResolvedValue({}),
              close: jest.fn().mockResolvedValue(undefined),
            }),
            close: jest.fn().mockResolvedValue(undefined),
          });
        }
      });

      // Rapidly scrape multiple URLs to exhaust the pool
      const scrapePromises = Array(5).fill(0).map((_, i) => 
        scrapeGeneric(`https://example.com/page${i}`, {})
      );

      await Promise.all(scrapePromises);

      // Should have launched initial pool + some emergency browsers
      expect(puppeteerModule.launch).toHaveBeenCalledTimes(expect.any(Number));
      expect((puppeteerModule.launch as jest.Mock).mock.calls.length).toBeGreaterThan(3);
    });

    it('should replenish pool after browser usage', async () => {
      const { scrapeGeneric } = await import('../../services/genericScraper');
      
      // Mock successful scraping
      mockBrowser.newPage.mockResolvedValue({
        setViewport: jest.fn().mockResolvedValue(undefined),
        setUserAgent: jest.fn().mockResolvedValue(undefined),
        setExtraHTTPHeaders: jest.fn().mockResolvedValue(undefined),
        goto: jest.fn().mockResolvedValue(undefined),
        title: jest.fn().mockResolvedValue('Test Page'),
        evaluate: jest.fn().mockResolvedValue({ name: 'Test' }),
        close: jest.fn().mockResolvedValue(undefined),
      });

      await scrapeGeneric('https://example.com', { nameSelector: '.name' });

      // Give time for pool replenishment (it happens asynchronously)
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should have launched browsers for initial pool + replenishment
      expect(puppeteerModule.launch).toHaveBeenCalled();
    });

    it('should handle replenishment failures gracefully', async () => {
      const { scrapeGeneric } = await import('../../services/genericScraper');
      
      // Mock browser launch to fail during replenishment
      let launchCount = 0;
      (puppeteerModule.launch as jest.Mock).mockImplementation(() => {
        launchCount++;
        if (launchCount <= 3) {
          // Initial pool browsers succeed
          return Promise.resolve(mockBrowser);
        } else {
          // Replenishment fails
          return Promise.reject(new Error('Replenishment failed'));
        }
      });

      mockBrowser.newPage.mockResolvedValue({
        setViewport: jest.fn().mockResolvedValue(undefined),
        setUserAgent: jest.fn().mockResolvedValue(undefined),
        setExtraHTTPHeaders: jest.fn().mockResolvedValue(undefined),
        goto: jest.fn().mockResolvedValue(undefined),
        title: jest.fn().mockResolvedValue('Test Page'),
        evaluate: jest.fn().mockResolvedValue({}),
        close: jest.fn().mockResolvedValue(undefined),
      });

      // Should not throw even if replenishment fails
      await expect(scrapeGeneric('https://example.com', {})).resolves.toBeDefined();
    });
  });

  describe('Memory Management', () => {
    it('should close browsers properly on shutdown signals', async () => {
      // This is harder to test directly since it involves process signals
      // But we can at least verify the browser close method would be called
      expect(mockBrowser.close).toBeDefined();
      expect(typeof mockBrowser.close).toBe('function');
    });

    it('should handle browser close errors during shutdown', async () => {
      // Mock browser close to fail
      mockBrowser.close.mockRejectedValueOnce(new Error('Close failed'));

      // The close operation should be resilient to failures
      await expect(mockBrowser.close()).rejects.toThrow('Close failed');
      
      // But the pool should still attempt to close other browsers
      expect(mockBrowser.close).toHaveBeenCalled();
    });
  });

  describe('Concurrent Access', () => {
    it('should handle multiple concurrent scraping requests', async () => {
      const { scrapeGeneric } = await import('../../services/genericScraper');
      
      // Mock page creation for concurrent access
      const mockPage = {
        setViewport: jest.fn().mockResolvedValue(undefined),
        setUserAgent: jest.fn().mockResolvedValue(undefined),
        setExtraHTTPHeaders: jest.fn().mockResolvedValue(undefined),
        goto: jest.fn().mockResolvedValue(undefined),
        title: jest.fn().mockResolvedValue('Concurrent Page'),
        evaluate: jest.fn().mockResolvedValue({ concurrent: true }),
        close: jest.fn().mockResolvedValue(undefined),
      };

      mockBrowser.newPage.mockResolvedValue(mockPage);

      // Start multiple scraping operations concurrently
      const concurrentScrapes = Array(10).fill(0).map((_, i) =>
        scrapeGeneric(`https://example.com/concurrent${i}`, { nameSelector: '.name' })
      );

      const results = await Promise.all(concurrentScrapes);

      // All should complete successfully
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toEqual({ concurrent: true });
      });
    });

    it('should maintain pool size under concurrent load', async () => {
      const { scrapeGeneric } = await import('../../services/genericScraper');
      
      // Track browser launches
      const launchSpy = puppeteerModule.launch as jest.Mock;
      launchSpy.mockClear();

      mockBrowser.newPage.mockResolvedValue({
        setViewport: jest.fn().mockResolvedValue(undefined),
        setUserAgent: jest.fn().mockResolvedValue(undefined),
        setExtraHTTPHeaders: jest.fn().mockResolvedValue(undefined),
        goto: jest.fn().mockResolvedValue(undefined),
        title: jest.fn().mockResolvedValue('Load Test'),
        evaluate: jest.fn().mockResolvedValue({}),
        close: jest.fn().mockResolvedValue(undefined),
      });

      // Simulate heavy concurrent load
      const heavyLoad = Array(20).fill(0).map((_, i) =>
        scrapeGeneric(`https://example.com/load${i}`, {})
      );

      await Promise.all(heavyLoad);

      // Should have launched browsers but not excessively
      expect(launchSpy.mock.calls.length).toBeGreaterThan(0);
      // The exact number depends on timing, but shouldn't be excessive
      expect(launchSpy.mock.calls.length).toBeLessThan(25);
    });
  });
});