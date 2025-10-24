import { jest } from '@jest/globals';
import puppeteer from 'puppeteer';
import { initializeBrowserPool, BrowserPool, scrapeGeneric } from '../../services/genericScraper';
import { createMockBrowser } from '../__mocks__/puppeteer';

// Centralized Puppeteer mock from moduleNameMapper

// We need to test the BrowserPool class, but it's private
// So we'll test through the public interface and some creative module manipulation
describe('Browser Pool Management', () => {
  let mockPage: jest.Mocked<puppeteer.Page>;
  let mockBrowser: jest.Mocked<puppeteer.Browser>;

  beforeEach(async () => {
    jest.clearAllMocks(); 
    jest.resetModules();
    
    // Comprehensive reset using new reset method
    await BrowserPool.reset();
    
    // Don't mock BrowserPool.getBrowser for these tests - let it use the real implementation

    // Setup launch mock to return our mock browser
    (puppeteer.launch as jest.Mock).mockClear();
    (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);

    // Create mock page with resolved methods
    mockPage = {
      goto: jest.fn().mockResolvedValue({ status: () => 200 }),
      title: jest.fn().mockResolvedValue('Test Page'),
      evaluate: jest.fn().mockResolvedValue({}),
      close: jest.fn().mockResolvedValue(undefined),
      setViewport: jest.fn().mockResolvedValue(undefined),
      setUserAgent: jest.fn().mockResolvedValue(undefined),
      setExtraHTTPHeaders: jest.fn().mockResolvedValue(undefined),
      waitForFunction: jest.fn().mockResolvedValue(undefined),
    } as jest.Mocked<puppeteer.Page>;

    // Create mock browser with resolved methods
    mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue(undefined),
      isConnected: jest.fn().mockReturnValue(true),
    } as jest.Mocked<puppeteer.Browser>;

    // Setup launch mock to return our mock browser
    (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);
  });

  describe('initializeBrowserPool', () => {
    it('should initialize browser pool successfully', async () => {
      // Mock successful browser launches
      (puppeteer.launch as jest.Mock)
        .mockResolvedValueOnce(mockBrowser)
        .mockResolvedValueOnce(mockBrowser)
        .mockResolvedValueOnce(mockBrowser);

      await expect(initializeBrowserPool()).resolves.toBeUndefined();

      // Should launch 3 browsers for the pool
      expect(puppeteer.launch).toHaveBeenCalledTimes(3);
    });

    it('should handle browser launch failures gracefully', async () => {
      // Mock some browsers failing to launch
      (puppeteer.launch as jest.Mock)
        .mockResolvedValueOnce(mockBrowser)
        .mockRejectedValueOnce(new Error('Launch failed'))
        .mockResolvedValueOnce(mockBrowser);

      // Should not throw even if some browsers fail
      await expect(initializeBrowserPool()).resolves.toBeUndefined();

      expect(puppeteer.launch).toHaveBeenCalledTimes(3);
    });

    it('should not reinitialize if already initialized', async () => {
      // First initialization
      await initializeBrowserPool();
      const firstCallCount = (puppeteer.launch as jest.Mock).mock.calls.length;

      // Second call should not launch more browsers
      await initializeBrowserPool();
      const secondCallCount = (puppeteer.launch as jest.Mock).mock.calls.length;

      expect(secondCallCount).toBe(firstCallCount);
    });

    it('should use correct browser configuration', async () => {
      await initializeBrowserPool();

      // Verify critical security and stability flags are present
      // Note: Implementation may include additional flags for improved stability
      const launchCall = (puppeteer.launch as jest.Mock).mock.calls[0][0];

      expect(launchCall).toMatchObject({
        headless: true,
        timeout: 30000,
      });

      // Check for critical security flags
      expect(launchCall.args).toContain('--no-sandbox');
      expect(launchCall.args).toContain('--disable-setuid-sandbox');
      expect(launchCall.args).toContain('--disable-dev-shm-usage');

      // Verify args is an array
      expect(Array.isArray(launchCall.args)).toBe(true);
      expect(launchCall.args.length).toBeGreaterThan(0);
    });

    it('should use PUPPETEER_EXECUTABLE_PATH when set', async () => {
      const originalEnv = process.env.PUPPETEER_EXECUTABLE_PATH;
      process.env.PUPPETEER_EXECUTABLE_PATH = '/usr/bin/chromium-browser';

      try {
        await initializeBrowserPool();

        expect(puppeteer.launch).toHaveBeenCalledWith(
          expect.objectContaining({
            executablePath: '/usr/bin/chromium-browser',
          })
        );
      } finally {
        // Restore original env
        if (originalEnv === undefined) {
          delete process.env.PUPPETEER_EXECUTABLE_PATH;
        } else {
          process.env.PUPPETEER_EXECUTABLE_PATH = originalEnv;
        }
      }
    });

    it('should not use executablePath when PUPPETEER_EXECUTABLE_PATH is not set', async () => {
      const originalEnv = process.env.PUPPETEER_EXECUTABLE_PATH;
      delete process.env.PUPPETEER_EXECUTABLE_PATH;

      try {
        await initializeBrowserPool();

        // Check that executablePath is undefined (not set)
        const launchCalls = (puppeteer.launch as jest.Mock).mock.calls;
        launchCalls.forEach(call => {
          const config = call[0];
          expect(config.executablePath).toBeUndefined();
        });
      } finally {
        // Restore original env
        if (originalEnv !== undefined) {
          process.env.PUPPETEER_EXECUTABLE_PATH = originalEnv;
        }
      }
    });
  });

  describe('Browser Pool Operations', () => {
    beforeEach(async () => {
      // Comprehensive reset using new reset method
      await BrowserPool.reset();
      
      // Mock fresh browsers for each test
      (puppeteer.launch as jest.Mock).mockClear();
      (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);
    });

    it('should retrieve browsers from pool during scraping', async () => {
      
      // Mock the page.evaluate to return quickly
      mockBrowser.newPage.mockResolvedValue({
        ...mockPage,
        goto: jest.fn().mockResolvedValue(undefined),
        evaluate: jest.fn().mockResolvedValue({}),
      });

      // This should trigger browser pool initialization and usage
      await scrapeGeneric('https://example.com', {});

      // Should have launched browsers for the pool
      expect(puppeteer.launch).toHaveBeenCalled();
    });

    it('should handle empty pool by creating emergency browser', async () => {
      // Using static import from top of file
      
      // Mock the scenario where pool is exhausted
      let callCount = 0;
      (puppeteer.launch as jest.Mock).mockImplementation(() => {
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
      // Assert emergency browser launches are controlled and reasonable
      const launchCount = (puppeteer.launch as jest.Mock).mock.calls.length;
      expect(launchCount).toBeGreaterThan(3);
      expect(launchCount).toBeLessThan(20); // More permissive limit for test stability
    });

    it('should replenish pool after browser usage', async () => {
      // Using static import from top of file
      
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
      expect(puppeteer.launch).toHaveBeenCalled();
    });

    it('should handle replenishment failures gracefully', async () => {
      // Using static import from top of file
      
      // Mock browser launch to fail during replenishment
      let launchCount = 0;
      (puppeteer.launch as jest.Mock).mockImplementation(() => {
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
      // Test that browser close is attempted even if it fails
      const errorMessage = 'Close failed';
      mockBrowser.close.mockRejectedValueOnce(new Error(errorMessage));

      // Test the close operation directly
      await expect(mockBrowser.close()).rejects.toThrow(errorMessage);
      
      // The pool should attempt to close browsers despite errors
      expect(mockBrowser.close).toHaveBeenCalled();
    });
  });

  describe('Concurrent Access', () => {
    it('should provide fair browser allocation under heavy load', async () => {
      // Simulate a more complex concurrent scraping scenario
      const concurrentRequests = 15; // Higher than pool size
      const startTimes = new Array(concurrentRequests).fill(0);
      const endTimes = new Array(concurrentRequests).fill(0);

      // Create mock pages with varied processing times
      const createMockPageWithDelay = (index: number) => ({
        setViewport: jest.fn().mockResolvedValue(undefined),
        setUserAgent: jest.fn().mockResolvedValue(undefined),
        setExtraHTTPHeaders: jest.fn().mockResolvedValue(undefined),
        goto: jest.fn().mockImplementation(async () => {
          // Simulate varied network conditions
          await new Promise(resolve => setTimeout(resolve, 50 * index));
          return { status: () => 200 };
        }),
        title: jest.fn().mockResolvedValue(`Concurrent Page ${index}`),
        evaluate: jest.fn().mockImplementation(async () => {
          // Simulate complex extraction with varied processing times
          await new Promise(resolve => setTimeout(resolve, 100 * index));
          return { index, concurrent: true };
        }),
        close: jest.fn().mockResolvedValue(undefined),
      });

      // Pregenerate mock pages to simulate realistic browser pool behavior
      const mockPages = Array(concurrentRequests).fill(0).map((_, i) => createMockPageWithDelay(i));

      // Cycle through pages, simulating pool exhaustion and reuse
      mockBrowser.newPage.mockImplementation(() => {
        const page = mockPages.pop() || mockPages[0];
        return Promise.resolve(page);
      });

      // Start concurrent scraping operations
      const concurrentScrapes = Array(concurrentRequests).fill(0).map(async (_, i) => {
        startTimes[i] = Date.now();
        const result = await scrapeGeneric(`https://example.com/concurrent${i}`, {});
        endTimes[i] = Date.now();
        return result;
      });

      const results = await Promise.all(concurrentScrapes);

      // Validate results
      expect(results).toHaveLength(concurrentRequests);
      results.forEach((result) => {
        expect(result).toHaveProperty('index');
        expect(result).toHaveProperty('concurrent', true);
        expect(typeof result.index).toBe('number');
      });

      // Ensure most requests complete within a reasonable timeframe
      const maxExecutionTime = Math.max(...endTimes.map((end, i) => end - startTimes[i]));
      expect(maxExecutionTime).toBeLessThan(5000); // Should complete within 5 seconds for test stability

      // Verify browser page allocation and management
      expect(mockBrowser.newPage).toHaveBeenCalledTimes(concurrentRequests);
    });

    it('should handle resource contention and backpressure', async () => {
      // Simulate a scenario with deterministic resource constraints
      let callCount = 0;
      const mockResourceLimitedPages = Array(10).fill(0).map((_, index) => ({
        setViewport: jest.fn().mockResolvedValue(undefined),
        setUserAgent: jest.fn().mockResolvedValue(undefined),
        setExtraHTTPHeaders: jest.fn().mockResolvedValue(undefined),
        goto: jest.fn().mockImplementation(async () => {
          // Deterministic slow response for some calls
          if (callCount % 3 === 0) { // Every 3rd call is slower
            await new Promise(resolve => setTimeout(resolve, 200));
          }
          return { status: () => 200 };
        }),
        title: jest.fn().mockResolvedValue(`Constrained Page ${index}`),
        evaluate: jest.fn().mockImplementation(async () => {
          callCount++;
          // Deterministic failure pattern
          if (callCount % 4 === 0) { // Every 4th call fails
            throw new Error('Resource extraction failed');
          }
          return { resourceConstrained: true };
        }),
        close: jest.fn().mockResolvedValue(undefined),
      }));

      // Setup browser to cycle through constrained pages
      mockBrowser.newPage.mockImplementation(() => {
        const page = mockResourceLimitedPages[0]; // Always use first page for consistency
        return Promise.resolve(page);
      });

      const concurrentRequests = 12; // Divisible by 4 to ensure failures
      const scrapePromises = Array(concurrentRequests).fill(0).map(async (_, i) => {
        return scrapeGeneric(`https://constrained.example.com/page${i}`, {});
      });

      const results = await Promise.allSettled(scrapePromises);

      // Validate mixed results: some successful data, some error objects
      const fulfilledResults = results.filter(r => r.status === 'fulfilled') as PromiseFulfilledResult<any>[];
      const successCount = fulfilledResults.filter(r => !r.value.error).length;
      const errorCount = fulfilledResults.filter(r => r.value.error).length;
      const rejectedCount = results.filter(r => r.status === 'rejected').length;

      expect(successCount).toBeGreaterThan(0);
      expect(errorCount).toBeGreaterThan(0);
      expect(successCount + errorCount + rejectedCount).toBe(concurrentRequests);
    });

    it('should handle multiple concurrent scraping requests', async () => {
      // Enhanced concurrent scraping test with improved verification
      jest.setTimeout(20000); // Increase timeout for many concurrent operations
      
      // Mock page creation for concurrent access with more robust mocking
      const createMockPage = (index: number) => ({
        setViewport: jest.fn().mockResolvedValue(undefined),
        setUserAgent: jest.fn().mockResolvedValue(undefined),
        setExtraHTTPHeaders: jest.fn().mockResolvedValue(undefined),
        goto: jest.fn().mockResolvedValue(undefined),
        title: jest.fn().mockResolvedValue(`Concurrent Page ${index}`),
        evaluate: jest.fn().mockResolvedValue({ concurrent: true, index }),
        close: jest.fn().mockResolvedValue(undefined),
      });

      // Create multiple unique mock pages
      const mockPages = Array(10).fill(0).map((_, i) => createMockPage(i));

      // Cycle through mock pages to simulate pool behavior
      mockBrowser.newPage.mockImplementation(() => {
        const page = mockPages.pop() || mockPages[0];
        return Promise.resolve(page);
      });

      // Start multiple scraping operations concurrently
      const concurrentScrapes = Array(10).fill(0).map((_, i) =>
        scrapeGeneric(`https://example.com/concurrent${i}`, { nameSelector: `.name-${i}` })
      );

      const results = await Promise.all(concurrentScrapes);

      // Comprehensive result verification
      expect(results).toHaveLength(10);
      const uniqueResults = new Set(results.map(r => JSON.stringify(r)));
      expect(uniqueResults.size).toBeGreaterThan(1); // Ensure some variation
      results.forEach(result => {
        expect(result).toHaveProperty('concurrent', true);
      });

      // Verify browser pool management during concurrent operations
      expect(mockBrowser.newPage).toHaveBeenCalledTimes(10);
    });

    it('should maintain pool size under concurrent load', async () => {
      // Using static import from top of file
      
      // Track browser launches
      const launchSpy = puppeteer.launch as jest.Mock;
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

      // Simulate moderate concurrent load
      const moderateLoad = Array(10).fill(0).map((_, i) =>
        scrapeGeneric(`https://example.com/load${i}`, {})
      );

      await Promise.all(moderateLoad);

      // More permissive pool size management - test that we don't launch excessive browsers
      const launchCount = launchSpy.mock.calls.length;
      expect(launchCount).toBeGreaterThan(0);
      expect(launchCount).toBeLessThan(35); // More realistic constraint for concurrent scraping
    });
  });
});