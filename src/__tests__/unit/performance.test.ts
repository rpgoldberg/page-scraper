import { jest } from '@jest/globals';
import { scrapeGeneric, initializeBrowserPool } from '../../services/genericScraper';
import mockPuppeteer, { mockBrowser, mockPage } from '../__mocks__/puppeteer';

// Mock puppeteer
jest.mock('puppeteer', () => mockPuppeteer);

describe('Performance Tests - Browser Pool Efficiency', () => {
  let puppeteerModule: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();
    
    puppeteerModule = await import('puppeteer');
    
    // Reset mocks to default successful behavior
    mockPage.setViewport.mockResolvedValue(undefined);
    mockPage.setUserAgent.mockResolvedValue(undefined);
    mockPage.setExtraHTTPHeaders.mockResolvedValue(undefined);
    mockPage.goto.mockResolvedValue(undefined);
    mockPage.title.mockResolvedValue('Performance Test Page');
    mockPage.evaluate.mockResolvedValue({ performance: 'test' });
    mockPage.waitForFunction.mockResolvedValue(undefined);
    mockPage.close.mockResolvedValue(undefined);
    mockBrowser.newPage.mockResolvedValue(mockPage);
    mockBrowser.close.mockResolvedValue(undefined);
    
    (puppeteerModule.launch as jest.Mock).mockResolvedValue(mockBrowser);
  });

  describe('Browser Pool Initialization Performance', () => {
    it('should initialize browser pool within acceptable time', async () => {
      const startTime = Date.now();
      await initializeBrowserPool();
      const endTime = Date.now();

      // Should initialize quickly in test environment
      expect(endTime - startTime).toBeLessThan(1000);
      
      // Should create 3 browsers for the pool
      expect(puppeteerModule.launch).toHaveBeenCalledTimes(3);
    });

    it('should handle concurrent initialization requests efficiently', async () => {
      const initPromises = Array(5).fill(0).map(() => initializeBrowserPool());

      const startTime = Date.now();
      await Promise.all(initPromises);
      const endTime = Date.now();

      // Should not initialize multiple times concurrently
      expect(endTime - startTime).toBeLessThan(1500);
      
      // Should only launch browsers once, not 5 times
      expect(puppeteerModule.launch).toHaveBeenCalledTimes(3);
    });
  });

  describe('Scraping Performance Benchmarks', () => {
    it('should complete single scraping operation within target time (3-5 seconds)', async () => {
      // Mock fast page operations
      mockPage.goto.mockImplementation(() => Promise.resolve());
      mockPage.evaluate.mockImplementation(() => 
        Promise.resolve({ 
          imageUrl: 'https://example.com/image.jpg',
          name: 'Fast Product',
        })
      );

      const startTime = Date.now();
      const result = await scrapeGeneric('https://example.com/fast-page', {
        imageSelector: '.image img',
        nameSelector: '.name',
        waitTime: 500, // Minimal wait time
      });
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000); // Within 5-second target
      expect(endTime - startTime).toBeGreaterThan(400); // At least minimum wait time
    });

    it('should handle multiple concurrent scraping requests efficiently', async () => {
      const concurrentRequests = 10;
      const urls = Array(concurrentRequests).fill(0).map((_, i) => 
        `https://example.com/concurrent-page-${i}`
      );

      // Mock fast responses for all requests
      mockPage.evaluate.mockResolvedValue({ 
        concurrent: true,
        index: 0,
      });

      const startTime = Date.now();
      const promises = urls.map(url => 
        scrapeGeneric(url, { 
          nameSelector: '.name',
          waitTime: 200, // Fast for performance test
        })
      );
      
      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results).toHaveLength(concurrentRequests);
      
      // Should complete all requests within reasonable time
      const avgTimePerRequest = (endTime - startTime) / concurrentRequests;
      expect(avgTimePerRequest).toBeLessThan(2000); // Less than 2 seconds per request on average
    });

    it('should maintain performance under heavy load', async () => {
      const heavyLoad = 50;
      const batchSize = 10;
      
      // Mock consistent performance
      mockPage.evaluate.mockResolvedValue({ load: 'test' });

      const totalStartTime = Date.now();
      
      // Process in batches to simulate real-world usage
      for (let batch = 0; batch < heavyLoad / batchSize; batch++) {
        const batchPromises = Array(batchSize).fill(0).map((_, i) => 
          scrapeGeneric(`https://example.com/load-${batch}-${i}`, {
            nameSelector: '.name',
            waitTime: 100,
          })
        );
        
        await Promise.all(batchPromises);
      }

      const totalEndTime = Date.now();
      const avgTimePerRequest = (totalEndTime - totalStartTime) / heavyLoad;

      // Performance should not degrade significantly under load
      expect(avgTimePerRequest).toBeLessThan(1000);
    });
  });

  describe('Browser Pool Efficiency Metrics', () => {
    it('should reuse browsers from pool effectively', async () => {
      // Clear any previous calls
      (puppeteerModule.launch as jest.Mock).mockClear();

      // Perform multiple scraping operations
      const scrapePromises = Array(5).fill(0).map((_, i) => 
        scrapeGeneric(`https://example.com/reuse-${i}`, {
          nameSelector: '.name',
          waitTime: 100,
        })
      );

      await Promise.all(scrapePromises);

      // Should not launch many new browsers if pool is working efficiently
      // Initial pool (3) + some replenishment, but not one per request
      expect((puppeteerModule.launch as jest.Mock).mock.calls.length).toBeLessThan(10);
    });

    it('should replenish pool quickly after browser usage', async () => {
      // Track browser launches over time
      const launchTimes: number[] = [];
      (puppeteerModule.launch as jest.Mock).mockImplementation(() => {
        launchTimes.push(Date.now());
        return Promise.resolve(mockBrowser);
      });

      // Use some browsers from the pool
      await scrapeGeneric('https://example.com/replenish-test', {
        nameSelector: '.name',
        waitTime: 50,
      });

      // Wait for replenishment
      await new Promise(resolve => setTimeout(resolve, 200));

      // Should have launched replacement browsers quickly
      expect(launchTimes.length).toBeGreaterThan(0);
    });

    it('should handle pool exhaustion gracefully without significant delay', async () => {
      // Simulate rapid exhaustion of the pool
      const rapidRequests = 20;
      
      mockPage.evaluate.mockResolvedValue({ exhaustion: 'test' });

      const startTime = Date.now();
      const promises = Array(rapidRequests).fill(0).map((_, i) => 
        scrapeGeneric(`https://example.com/exhaust-${i}`, {
          nameSelector: '.name',
          waitTime: 50,
        })
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results).toHaveLength(rapidRequests);
      
      // Should handle pool exhaustion without excessive delays
      const avgTime = (endTime - startTime) / rapidRequests;
      expect(avgTime).toBeLessThan(1000);
    });
  });

  describe('Memory Management Performance', () => {
    it('should clean up resources efficiently', async () => {
      let closeCallCount = 0;
      mockPage.close.mockImplementation(() => {
        closeCallCount++;
        return Promise.resolve();
      });

      let browserCloseCount = 0;
      mockBrowser.close.mockImplementation(() => {
        browserCloseCount++;
        return Promise.resolve();
      });

      // Perform scraping operations
      await scrapeGeneric('https://example.com/cleanup-test', {
        nameSelector: '.name',
        waitTime: 50,
      });

      expect(closeCallCount).toBeGreaterThan(0);
      expect(browserCloseCount).toBeGreaterThan(0);
    });

    it('should not accumulate memory leaks over multiple operations', async () => {
      const operations = 30;
      let totalCloses = 0;

      mockPage.close.mockImplementation(() => {
        totalCloses++;
        return Promise.resolve();
      });

      // Perform many operations
      for (let i = 0; i < operations; i++) {
        await scrapeGeneric(`https://example.com/memory-${i}`, {
          nameSelector: '.name',
          waitTime: 10,
        });
      }

      // Should have closed resources for each operation
      expect(totalCloses).toBe(operations);
    });
  });

  describe('Network Performance Optimization', () => {
    it('should use optimized wait conditions for faster loading', async () => {
      await scrapeGeneric('https://example.com/network-test', {
        nameSelector: '.name',
        waitTime: 100,
      });

      expect(mockPage.goto).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          waitUntil: 'domcontentloaded', // Not 'load' or 'networkidle'
          timeout: 20000,
        })
      );
    });

    it('should set efficient HTTP headers for faster responses', async () => {
      await scrapeGeneric('https://example.com/headers-test', {
        nameSelector: '.name',
      });

      expect(mockPage.setExtraHTTPHeaders).toHaveBeenCalledWith(
        expect.objectContaining({
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
        })
      );
    });
  });

  describe('Performance Regression Tests', () => {
    it('should maintain performance consistency across repeated operations', async () => {
      const iterations = 10;
      const timings: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await scrapeGeneric(`https://example.com/regression-${i}`, {
          nameSelector: '.name',
          waitTime: 100,
        });
        const endTime = Date.now();
        
        timings.push(endTime - startTime);
      }

      // Calculate variance to ensure consistency
      const average = timings.reduce((a, b) => a + b) / timings.length;
      const variance = timings.reduce((acc, time) => acc + Math.pow(time - average, 2), 0) / timings.length;
      const standardDeviation = Math.sqrt(variance);

      // Performance should be relatively consistent (low standard deviation)
      expect(standardDeviation).toBeLessThan(average * 0.5); // Within 50% of average
    });

    it('should not degrade performance over time', async () => {
      const phases = 5;
      const operationsPerPhase = 10;
      const phaseTimings: number[] = [];

      for (let phase = 0; phase < phases; phase++) {
        const phaseStartTime = Date.now();
        
        const phasePromises = Array(operationsPerPhase).fill(0).map((_, i) => 
          scrapeGeneric(`https://example.com/phase-${phase}-${i}`, {
            nameSelector: '.name',
            waitTime: 50,
          })
        );
        
        await Promise.all(phasePromises);
        
        const phaseEndTime = Date.now();
        phaseTimings.push(phaseEndTime - phaseStartTime);
      }

      // Later phases should not be significantly slower than earlier ones
      const firstPhaseTime = phaseTimings[0];
      const lastPhaseTime = phaseTimings[phaseTimings.length - 1];
      
      // Allow for up to 50% degradation (should be much less in practice)
      expect(lastPhaseTime).toBeLessThan(firstPhaseTime * 1.5);
    });
  });

  describe('Cloudflare Performance Impact', () => {
    it('should handle Cloudflare challenge with minimal performance impact', async () => {
      const config = {
        cloudflareDetection: {
          titleIncludes: ['Just a moment'],
          bodyIncludes: ['Just a moment'],
        },
        nameSelector: '.name',
        waitTime: 100,
      };

      // Mock Cloudflare challenge that resolves quickly
      mockPage.title.mockResolvedValueOnce('Just a moment...');
      mockPage.evaluate.mockResolvedValueOnce('Just a moment...');
      mockPage.waitForFunction.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100)) // Quick resolution
      );
      mockPage.evaluate.mockResolvedValueOnce({ name: 'After Challenge' });

      const startTime = Date.now();
      const result = await scrapeGeneric('https://protected-site.com', config);
      const endTime = Date.now();

      expect(result.name).toBe('After Challenge');
      
      // Should complete within reasonable time even with challenge
      expect(endTime - startTime).toBeLessThan(3000);
    });

    it('should timeout Cloudflare challenge to maintain performance', async () => {
      const config = {
        cloudflareDetection: {
          titleIncludes: ['Just a moment'],
          bodyIncludes: ['Just a moment'],
        },
        nameSelector: '.name',
        waitTime: 100,
      };

      // Mock Cloudflare challenge that times out
      mockPage.title.mockResolvedValueOnce('Just a moment...');
      mockPage.evaluate.mockResolvedValueOnce('Just a moment...');
      mockPage.waitForFunction.mockRejectedValueOnce(new Error('Timeout'));
      mockPage.evaluate.mockResolvedValueOnce({ name: 'After Timeout' });

      const startTime = Date.now();
      const result = await scrapeGeneric('https://protected-site.com', config);
      const endTime = Date.now();

      expect(result.name).toBe('After Timeout');
      
      // Should not wait too long for challenge timeout
      expect(endTime - startTime).toBeLessThan(12000); // 10s timeout + overhead
    });
  });

  describe('Resource Usage Efficiency', () => {
    it('should minimize browser resource usage', async () => {
      // Test that we're using efficient browser configuration
      await scrapeGeneric('https://example.com/resource-test', {});

      expect(puppeteerModule.launch).toHaveBeenCalledWith(
        expect.objectContaining({
          headless: true,
          args: expect.arrayContaining([
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--single-process',
            '--memory-pressure-off',
          ]),
        })
      );
    });

    it('should complete operations with minimal wait times', async () => {
      const configs = [
        { waitTime: 0 },
        { waitTime: 100 },
        { waitTime: 500 },
        { waitTime: 1000 },
      ];

      for (const config of configs) {
        const startTime = Date.now();
        await scrapeGeneric('https://example.com/wait-test', {
          ...config,
          nameSelector: '.name',
        });
        const endTime = Date.now();

        // Should respect wait times but not add excessive overhead
        expect(endTime - startTime).toBeGreaterThanOrEqual(config.waitTime);
        expect(endTime - startTime).toBeLessThan(config.waitTime + 500); // Max 500ms overhead
      }
    });
  });
});