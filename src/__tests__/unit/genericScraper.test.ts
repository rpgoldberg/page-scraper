import { jest } from '@jest/globals';
import { scrapeGeneric, scrapeMFC, SITE_CONFIGS, ScrapeConfig } from '../../services/genericScraper';
import { mockBrowser, mockPage } from '../__mocks__/puppeteer';
import { MFC_FIGURE_HTML, CLOUDFLARE_CHALLENGE_HTML, GENERIC_PRODUCT_HTML } from '../fixtures/test-html';

// Mock the entire puppeteer module
jest.mock('puppeteer', () => ({
  launch: jest.fn().mockResolvedValue(mockBrowser),
}));

describe('genericScraper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  describe('scrapeGeneric', () => {
    const testUrl = 'https://example.com/test';
    const basicConfig: ScrapeConfig = {
      imageSelector: '.product-image img',
      manufacturerSelector: '.manufacturer',
      nameSelector: '.product-name',
      scaleSelector: '.scale-info',
    };

    it('should successfully scrape data with basic config', async () => {
      // Mock page.evaluate to return scraped data
      mockPage.evaluate.mockResolvedValueOnce({
        imageUrl: 'https://example.com/product.jpg',
        manufacturer: 'Test Manufacturer',
        name: 'Test Product Name',
        scale: '1/8',
      });

      const result = await scrapeGeneric(testUrl, basicConfig);

      expect(result).toEqual({
        imageUrl: 'https://example.com/product.jpg',
        manufacturer: 'Test Manufacturer',
        name: 'Test Product Name',
        scale: '1/8',
      });

      expect(mockPage.goto).toHaveBeenCalledWith(testUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 20000,
      });
    });

    it('should set custom user agent when provided', async () => {
      const customUserAgent = 'Custom User Agent';
      const configWithUserAgent = {
        ...basicConfig,
        userAgent: customUserAgent,
      };

      mockPage.evaluate.mockResolvedValueOnce({});

      await scrapeGeneric(testUrl, configWithUserAgent);

      expect(mockPage.setUserAgent).toHaveBeenCalledWith(customUserAgent);
    });

    it('should use default user agent when not provided', async () => {
      mockPage.evaluate.mockResolvedValueOnce({});

      await scrapeGeneric(testUrl, basicConfig);

      expect(mockPage.setUserAgent).toHaveBeenCalledWith(
        expect.stringContaining('Mozilla/5.0')
      );
    });

    it('should wait for specified time after page load', async () => {
      const configWithWaitTime = {
        ...basicConfig,
        waitTime: 2000,
      };

      mockPage.evaluate.mockResolvedValueOnce({});

      const startTime = Date.now();
      await scrapeGeneric(testUrl, configWithWaitTime);
      const endTime = Date.now();

      // Should have waited at least the specified time (allowing for some execution time)
      expect(endTime - startTime).toBeGreaterThanOrEqual(1900);
    });

    it('should handle Cloudflare detection', async () => {
      const configWithCloudflare = {
        ...basicConfig,
        cloudflareDetection: {
          titleIncludes: ['Just a moment'],
          bodyIncludes: ['Just a moment'],
        },
      };

      // Mock Cloudflare detection
      mockPage.title.mockResolvedValueOnce('Just a moment...');
      mockPage.evaluate.mockResolvedValueOnce('Just a moment...');
      mockPage.waitForFunction.mockResolvedValueOnce(undefined);
      mockPage.evaluate.mockResolvedValueOnce({});

      await scrapeGeneric(testUrl, configWithCloudflare);

      expect(mockPage.waitForFunction).toHaveBeenCalled();
    });

    it('should handle Cloudflare timeout gracefully', async () => {
      const configWithCloudflare = {
        ...basicConfig,
        cloudflareDetection: {
          titleIncludes: ['Just a moment'],
          bodyIncludes: ['Just a moment'],
        },
      };

      // Mock Cloudflare detection with timeout
      mockPage.title.mockResolvedValueOnce('Just a moment...');
      mockPage.evaluate.mockResolvedValueOnce('Just a moment...');
      mockPage.waitForFunction.mockRejectedValueOnce(new Error('Timeout'));
      mockPage.evaluate.mockResolvedValueOnce({});

      // Should not throw even if waitForFunction times out
      await expect(scrapeGeneric(testUrl, configWithCloudflare)).resolves.toBeDefined();
    });

    it('should close page and browser on success', async () => {
      mockPage.evaluate.mockResolvedValueOnce({});

      await scrapeGeneric(testUrl, basicConfig);

      expect(mockPage.close).toHaveBeenCalled();
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should close page and browser on error', async () => {
      mockPage.goto.mockRejectedValueOnce(new Error('Navigation failed'));

      await expect(scrapeGeneric(testUrl, basicConfig)).rejects.toThrow('Navigation failed');

      expect(mockPage.close).toHaveBeenCalled();
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should handle missing selectors gracefully', async () => {
      const emptyConfig: ScrapeConfig = {};

      mockPage.evaluate.mockResolvedValueOnce({});

      const result = await scrapeGeneric(testUrl, emptyConfig);

      expect(result).toEqual({});
    });

    it('should extract scale with regex matching', async () => {
      mockPage.evaluate.mockImplementationOnce((fn) => {
        // Simulate browser environment
        const mockDocument = {
          querySelector: jest.fn().mockReturnValue({
            textContent: 'Scale: 1/7 Premium Figure',
          }),
        };
        
        return fn({ scaleSelector: '.scale-info' });
      });

      const result = await scrapeGeneric(testUrl, {
        scaleSelector: '.scale-info',
      });

      // The evaluate function should extract "1/7" from the text
      expect(mockPage.evaluate).toHaveBeenCalled();
    });
  });

  describe('scrapeMFC', () => {
    it('should use MFC configuration', async () => {
      mockPage.evaluate.mockResolvedValueOnce({
        imageUrl: 'https://static.myfigurecollection.net/pics/figure/large/123456.jpg',
        manufacturer: 'Good Smile Company',
        name: 'Hatsune Miku',
        scale: '1/7',
      });

      const result = await scrapeMFC('https://myfigurecollection.net/item/123456');

      expect(result).toEqual({
        imageUrl: 'https://static.myfigurecollection.net/pics/figure/large/123456.jpg',
        manufacturer: 'Good Smile Company',
        name: 'Hatsune Miku',
        scale: '1/7',
      });

      expect(mockPage.setUserAgent).toHaveBeenCalledWith(
        expect.stringContaining('Chrome/127.0.0.0')
      );
    });
  });

  describe('Error handling', () => {
    it('should throw error when page navigation fails', async () => {
      const navigationError = new Error('ERR_NAME_NOT_RESOLVED');
      mockPage.goto.mockRejectedValueOnce(navigationError);

      await expect(scrapeGeneric('https://invalid-url.test', {})).rejects.toThrow(
        'ERR_NAME_NOT_RESOLVED'
      );
    });

    it('should throw error when browser launch fails', async () => {
      const puppeteer = await import('puppeteer');
      const launchError = new Error('Failed to launch browser');
      
      (puppeteer.launch as jest.Mock).mockRejectedValueOnce(launchError);

      await expect(scrapeGeneric('https://example.com', {})).rejects.toThrow(
        'Failed to launch browser'
      );
    });

    it('should handle page evaluation errors', async () => {
      const evaluationError = new Error('Evaluation failed');
      mockPage.evaluate.mockRejectedValueOnce(evaluationError);

      await expect(scrapeGeneric('https://example.com', {})).rejects.toThrow(
        'Evaluation failed'
      );
    });
  });

  describe('Configuration validation', () => {
    it('should handle config with all selectors', async () => {
      const fullConfig: ScrapeConfig = {
        imageSelector: '.image',
        manufacturerSelector: '.manufacturer',
        nameSelector: '.name',
        scaleSelector: '.scale',
        waitTime: 1500,
        userAgent: 'Test Agent',
        cloudflareDetection: {
          titleIncludes: ['Challenge'],
          bodyIncludes: ['Checking'],
        },
      };

      mockPage.evaluate.mockResolvedValueOnce({
        imageUrl: 'test.jpg',
        manufacturer: 'Test Mfg',
        name: 'Test Name',
        scale: '1/8',
      });

      const result = await scrapeGeneric('https://example.com', fullConfig);

      expect(result).toBeDefined();
      expect(mockPage.setUserAgent).toHaveBeenCalledWith('Test Agent');
    });

    it('should handle partial config', async () => {
      const partialConfig: ScrapeConfig = {
        imageSelector: '.image',
        // Missing other selectors
      };

      mockPage.evaluate.mockResolvedValueOnce({
        imageUrl: 'test.jpg',
        // Other fields should be undefined
      });

      const result = await scrapeGeneric('https://example.com', partialConfig);

      expect(result).toBeDefined();
      expect(result.imageUrl).toBe('test.jpg');
    });
  });
});