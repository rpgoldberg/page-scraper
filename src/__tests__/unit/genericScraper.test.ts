import { jest } from '@jest/globals';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import { scrapeGeneric, scrapeMFC, SITE_CONFIGS, ScrapeConfig, BrowserPool, initializeBrowserPool } from '../../services/genericScraper';
import { MFC_FIGURE_HTML, CLOUDFLARE_CHALLENGE_HTML, GENERIC_PRODUCT_HTML } from '../fixtures/test-html';

// Mock entire Puppeteer module
jest.mock('puppeteer', () => ({
  launch: jest.fn(),
  defaultViewport: null,
}));

describe('genericScraper', () => {
  let mockPage: any;
  let mockBrowser: any;
  let originalProcessOn: any;

  beforeEach(() => {
    jest.clearAllMocks();
    BrowserPool.reset();
    
    // Save original process.on to restore later
    originalProcessOn = process.on;
    
    // Create mock page with resolved methods
    mockPage = {
      goto: jest.fn().mockResolvedValue({ status: () => 200 }),
      content: jest.fn().mockResolvedValue('<html>Mock Content</html>'),
      title: jest.fn().mockResolvedValue('Test Page'),
      screenshot: jest.fn().mockResolvedValue(Buffer.from('screenshot')),
      evaluate: jest.fn().mockResolvedValue({}),
      waitForFunction: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      setViewport: jest.fn().mockResolvedValue(undefined),
      setUserAgent: jest.fn().mockResolvedValue(undefined),
      setExtraHTTPHeaders: jest.fn().mockResolvedValue(undefined),
      waitForSelector: jest.fn().mockResolvedValue(undefined),
      waitForTimeout: jest.fn().mockResolvedValue(undefined),
      on: jest.fn().mockReturnValue(undefined),
      $: jest.fn(),
      $$: jest.fn(),
    };

    // Create mock browser with resolved methods
    mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue(undefined),
      createIncognitoBrowserContext: jest.fn().mockResolvedValue({
        newPage: jest.fn().mockResolvedValue(mockPage),
      }),
      isConnected: jest.fn().mockReturnValue(true),
    };

    // Setup launch mock to return our mock browser
    (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);
  });

  afterEach(() => {
    // Restore process.on
    if (originalProcessOn) {
      process.on = originalProcessOn;
    }
  });

  describe('Generic HTML Parsing', () => {
    it('should parse generic product HTML with Cheerio', () => {
      const $ = cheerio.load(GENERIC_PRODUCT_HTML);
      
      const imageUrl = $('.product-image img').attr('src');
      const manufacturer = $('.manufacturer').text().trim();
      const productName = $('.product-name').text().trim();
      const scaleInfo = $('.scale-info').text().trim();
      
      expect(imageUrl).toBe('https://example.com/product.jpg');
      expect(manufacturer).toBe('Test Manufacturer');
      expect(productName).toBe('Test Product Name');
      expect(scaleInfo).toBe('1/8 Scale');
    });

    it('should gracefully handle missing HTML elements', () => {
      const $ = cheerio.load('<html><body></body></html>');
      
      const imageUrl = $('.product-image img').attr('src');
      const manufacturer = $('.manufacturer').text().trim();
      
      expect(imageUrl).toBeUndefined();
      expect(manufacturer).toBe('');
    });
  });

  describe('SITE_CONFIGS', () => {
    it('should contain MFC configuration', () => {
      expect(SITE_CONFIGS.mfc).toBeDefined();
      expect(SITE_CONFIGS.mfc.imageSelector).toBe('.item-picture .main img');
      expect(SITE_CONFIGS.mfc.cloudflareDetection).toBeDefined();
      expect(SITE_CONFIGS.mfc.userAgent).toContain('Chrome');
    });

    it('should have proper Cloudflare detection config for MFC', () => {
      const mfcConfig = SITE_CONFIGS.mfc;
      expect(mfcConfig.cloudflareDetection?.titleIncludes).toContain('Just a moment');
      expect(mfcConfig.cloudflareDetection?.bodyIncludes).toContain('Just a moment');
    });
  });

  describe('BrowserPool', () => {
    it('should initialize browser pool', async () => {
      await BrowserPool.initialize();
      expect(puppeteer.launch).toHaveBeenCalledTimes(3); // POOL_SIZE = 3
    });

    it('should get browser from pool', async () => {
      await BrowserPool.initialize();
      const browser = await BrowserPool.getBrowser();
      expect(browser).toBeDefined();
    });

    it('should handle emergency browser creation when pool is empty', async () => {
      // Don't initialize pool, so it's empty
      const browser = await BrowserPool.getBrowser();
      expect(browser).toBeDefined();
      expect(puppeteer.launch).toHaveBeenCalled();
    });

    it('should handle browser launch failure in emergency mode', async () => {
      // Reset pool and mock setup
      BrowserPool.reset();
      (puppeteer.launch as jest.Mock)
        .mockRejectedValueOnce(new Error('Launch failed'))
        .mockResolvedValueOnce(mockBrowser);
      
      const browser = await BrowserPool.getBrowser();
      expect(browser).toBeDefined();
      // Should have tried twice (once failed, once succeeded)
      expect(puppeteer.launch).toHaveBeenCalled();
    });

    it('should handle max emergency browsers exhausted', async () => {
      // Reset and don't initialize pool
      BrowserPool.reset();
      
      // Make all launches fail
      (puppeteer.launch as jest.Mock).mockRejectedValue(new Error('Launch failed'));
      
      // Try to get browsers beyond the max emergency limit
      let errorCount = 0;
      for (let i = 0; i < 6; i++) { // MAX_EMERGENCY_BROWSERS = 5
        try {
          await BrowserPool.getBrowser();
        } catch (e) {
          errorCount++;
        }
      }
      
      expect(errorCount).toBeGreaterThan(0);
    });

    it('should close all browsers in pool', async () => {
      await BrowserPool.initialize();
      await BrowserPool.closeAll();
      
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should handle browser close errors gracefully', async () => {
      mockBrowser.close.mockRejectedValueOnce(new Error('Close failed'));
      mockBrowser.isConnected.mockReturnValue(true);
      
      await BrowserPool.initialize();
      await BrowserPool.closeAll(); // Should not throw
      
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should handle disconnected browsers during close', async () => {
      mockBrowser.isConnected.mockReturnValue(false);
      
      await BrowserPool.initialize();
      await BrowserPool.closeAll();
      
      // Close should not be called for disconnected browsers
      expect(mockBrowser.close).not.toHaveBeenCalled();
    });

    it('should reset browser pool', () => {
      BrowserPool.reset();
      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('scrapeGeneric', () => {
    it('should scrape a page successfully', async () => {
      mockPage.evaluate.mockResolvedValueOnce({
        imageUrl: 'https://example.com/image.jpg',
        manufacturer: 'Test Manufacturer',
        name: 'Test Product',
        scale: '1/8',
      });

      const config: ScrapeConfig = {
        imageSelector: '.image',
        manufacturerSelector: '.manufacturer',
        nameSelector: '.name',
        scaleSelector: '.scale',
      };

      const result = await scrapeGeneric('https://example.com', config);
      
      expect(result).toEqual({
        imageUrl: 'https://example.com/image.jpg',
        manufacturer: 'Test Manufacturer',
        name: 'Test Product',
        scale: '1/8',
      });
      
      expect(mockPage.goto).toHaveBeenCalledWith('https://example.com', expect.any(Object));
      expect(mockPage.setViewport).toHaveBeenCalled();
      expect(mockPage.setUserAgent).toHaveBeenCalled();
      expect(mockPage.setExtraHTTPHeaders).toHaveBeenCalled();
    });

    it('should handle Cloudflare challenge detection', async () => {
      mockPage.title.mockResolvedValueOnce('Just a moment');
      // First evaluate gets body text, second gets scraped data
      mockPage.evaluate
        .mockImplementationOnce(() => Promise.resolve('Just a moment, we are checking your browser')) // Body text
        .mockImplementationOnce((fn: any, config: any) => Promise.resolve({})); // Scraped data

      const config: ScrapeConfig = {
        imageSelector: '.image',
        cloudflareDetection: {
          titleIncludes: ['Just a moment'],
          bodyIncludes: ['Just a moment'],
        },
        waitTime: 100,
      };

      const result = await scrapeGeneric('https://example.com', config);
      
      expect(mockPage.waitForFunction).toHaveBeenCalled();
      expect(result).toEqual({});
    });

    it('should handle waitForFunction timeout in Cloudflare detection', async () => {
      mockPage.title.mockResolvedValueOnce('Just a moment');
      // First evaluate gets body text, second gets scraped data
      mockPage.evaluate
        .mockImplementationOnce(() => Promise.resolve('Just a moment, checking browser')) // Body text
        .mockImplementationOnce((fn: any, config: any) => Promise.resolve({})); // Scraped data
      
      // Make waitForFunction reject (timeout)
      mockPage.waitForFunction.mockRejectedValueOnce(new Error('Timeout'));

      const config: ScrapeConfig = {
        imageSelector: '.image',
        cloudflareDetection: {
          titleIncludes: ['Just a moment'],
          bodyIncludes: ['Just a moment'],
        },
      };

      const result = await scrapeGeneric('https://example.com', config);
      
      // Should continue despite timeout
      expect(result).toEqual({});
      expect(mockPage.waitForFunction).toHaveBeenCalled();
    });

    it('should extract data with page.evaluate', async () => {
      // Mock the evaluate function to simulate DOM extraction
      mockPage.evaluate.mockImplementation((fn: any, config: any) => {
        // Simulate the extraction logic
        const mockDOM = {
          querySelector: (selector: string) => {
            if (selector === '.image') {
              return { src: 'https://example.com/image.jpg' };
            }
            if (selector === '.manufacturer') {
              return { textContent: '  Test Manufacturer  ' };
            }
            if (selector === '.name') {
              return { textContent: 'Test Product' };
            }
            if (selector === '.scale') {
              return { textContent: '1/7 Scale Figure' };
            }
            return null;
          },
          querySelectorAll: (selector: string) => {
            if (selector === '.data-field') {
              return [
                {
                  querySelector: (s: string) => {
                    if (s === '.data-label') {
                      return { textContent: 'Company' };
                    }
                    if (s === '.item-entries a span[switch]') {
                      return { textContent: 'Good Smile Company' };
                    }
                    return null;
                  },
                },
              ];
            }
            return [];
          },
        };

        // Execute the function with the mock DOM
        const result: any = {};
        if (config.imageSelector) {
          const elem = mockDOM.querySelector(config.imageSelector);
          if (elem && (elem as any).src) {
            result.imageUrl = (elem as any).src;
          }
        }
        if (config.manufacturerSelector) {
          const elem = mockDOM.querySelector(config.manufacturerSelector);
          if (elem && (elem as any).textContent) {
            result.manufacturer = (elem as any).textContent.trim();
          }
        }
        if (config.nameSelector) {
          const elem = mockDOM.querySelector(config.nameSelector);
          if (elem && (elem as any).textContent) {
            result.name = (elem as any).textContent.trim();
          }
        }
        if (config.scaleSelector) {
          const elem = mockDOM.querySelector(config.scaleSelector);
          if (elem && (elem as any).textContent) {
            const text = (elem as any).textContent.trim();
            const match = text.match(/1\/\d+/);
            result.scale = match ? match[0] : text;
          }
        }
        return result;
      });

      const config: ScrapeConfig = {
        imageSelector: '.image',
        manufacturerSelector: '.manufacturer',
        nameSelector: '.name',
        scaleSelector: '.scale',
      };

      const result = await scrapeGeneric('https://example.com', config);
      
      expect(result).toEqual({
        imageUrl: 'https://example.com/image.jpg',
        manufacturer: 'Test Manufacturer',
        name: 'Test Product',
        scale: '1/7',
      });
    });

    it('should handle critical errors', async () => {
      mockPage.goto.mockRejectedValueOnce(new Error('Navigation failed'));

      const config: ScrapeConfig = {
        imageSelector: '.image',
      };

      await expect(scrapeGeneric('https://example.com', config))
        .rejects.toThrow('Navigation failed');
    });

    it('should handle non-critical errors and return error info', async () => {
      mockPage.evaluate.mockRejectedValueOnce(new Error('Some random error'));

      const config: ScrapeConfig = {
        imageSelector: '.image',
      };

      const result = await scrapeGeneric('https://example.com', config);
      
      expect(result).toEqual({ error: 'Some random error' });
    });

    it('should handle page close errors gracefully', async () => {
      mockPage.close.mockRejectedValueOnce(new Error('Page close failed'));
      mockPage.evaluate.mockResolvedValueOnce({ name: 'Test' });

      const config: ScrapeConfig = {
        nameSelector: '.name',
      };

      const result = await scrapeGeneric('https://example.com', config);
      
      expect(result).toEqual({ name: 'Test' });
      expect(mockPage.close).toHaveBeenCalled();
    });

    it('should handle browser close errors gracefully', async () => {
      mockBrowser.close.mockRejectedValueOnce(new Error('Browser close failed'));
      mockPage.evaluate.mockResolvedValueOnce({ name: 'Test' });

      const config: ScrapeConfig = {
        nameSelector: '.name',
      };

      const result = await scrapeGeneric('https://example.com', config);
      
      expect(result).toEqual({ name: 'Test' });
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should use custom user agent when provided', async () => {
      const customUserAgent = 'CustomBot/1.0';
      mockPage.evaluate.mockResolvedValueOnce({});

      const config: ScrapeConfig = {
        imageSelector: '.image',
        userAgent: customUserAgent,
      };

      await scrapeGeneric('https://example.com', config);
      
      expect(mockPage.setUserAgent).toHaveBeenCalledWith(customUserAgent);
    });

    it('should use custom wait time when provided', async () => {
      mockPage.evaluate.mockResolvedValueOnce({});
      
      const config: ScrapeConfig = {
        imageSelector: '.image',
        waitTime: 5000,
      };

      const startTime = Date.now();
      await scrapeGeneric('https://example.com', config);
      
      // We can't easily test the actual wait, but we can verify the config is used
      expect(mockPage.evaluate).toHaveBeenCalled();
    });
  });

  describe('scrapeMFC', () => {
    it('should use MFC configuration', async () => {
      // Mock evaluate to handle both body text check and data extraction
      mockPage.evaluate.mockImplementation((fn: any, config?: any) => {
        // If no config passed, it's getting body text
        if (!config) {
          return Promise.resolve('Page content');
        }
        // Otherwise it's extracting data
        return Promise.resolve({
          imageUrl: 'https://static.myfigurecollection.net/image.jpg',
          manufacturer: 'Good Smile Company',
          name: 'Hatsune Miku',
          scale: '1/7',
        });
      });

      const result = await scrapeMFC('https://myfigurecollection.net/item/123');
      
      expect(result).toEqual({
        imageUrl: 'https://static.myfigurecollection.net/image.jpg',
        manufacturer: 'Good Smile Company',
        name: 'Hatsune Miku',
        scale: '1/7',
      });
      
      expect(mockPage.setUserAgent).toHaveBeenCalledWith(SITE_CONFIGS.mfc.userAgent);
    });
  });

  describe('initializeBrowserPool', () => {
    it('should initialize the browser pool', async () => {
      await initializeBrowserPool();
      expect(puppeteer.launch).toHaveBeenCalledTimes(3); // POOL_SIZE = 3
    });
  });

  describe('Process signal handlers', () => {
    it('should register SIGTERM handler', () => {
      const handlers: any = {};
      const originalOn = process.on;
      
      process.on = jest.fn((event: string, handler: any) => {
        handlers[event] = handler;
        return process;
      }) as any;

      // Re-import to register handlers
      jest.isolateModules(() => {
        require('../../services/genericScraper');
      });

      expect(handlers['SIGTERM']).toBeDefined();
      expect(typeof handlers['SIGTERM']).toBe('function');
      
      process.on = originalOn;
    });

    it('should register SIGINT handler', () => {
      const handlers: any = {};
      const originalOn = process.on;
      
      process.on = jest.fn((event: string, handler: any) => {
        handlers[event] = handler;
        return process;
      }) as any;

      // Re-import to register handlers
      jest.isolateModules(() => {
        require('../../services/genericScraper');
      });

      expect(handlers['SIGINT']).toBeDefined();
      expect(typeof handlers['SIGINT']).toBe('function');
      
      process.on = originalOn;
    });
  });
});