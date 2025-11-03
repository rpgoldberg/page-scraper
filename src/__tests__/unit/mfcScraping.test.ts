import { jest } from '@jest/globals';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import { scrapeMFC, SITE_CONFIGS, scrapeGeneric, BrowserPool } from '../../services/genericScraper';
import { MFC_FIGURE_HTML, CLOUDFLARE_CHALLENGE_HTML, CLOUDFLARE_CHALLENGE_VARIATIONS } from '../fixtures/test-html';
import { createMockBrowser } from '../__mocks__/puppeteer';

// Centralized Puppeteer mock from moduleNameMapper

describe('MFC-Specific Scraping Configuration Tests', () => {
  let mockPage: jest.Mocked<puppeteer.Page>;
  let mockBrowser: jest.Mocked<puppeteer.Browser>;

  beforeEach(() => {
    jest.clearAllMocks(); jest.resetModules();

    // Create mock page with resolved methods
    mockPage = {
      goto: jest.fn().mockResolvedValue({ status: () => 200 }),
      title: jest.fn().mockResolvedValue('Figure Page - My Figure Collection'),
      evaluate: jest.fn().mockImplementation((fn, ...args) => {
        // Handle specific case for document.body.innerText/textContent
        if (typeof fn === 'function') {
          const fnString = fn.toString();
          if (fnString.includes('document.body.innerText') || fnString.includes('document.body.textContent')) {
            return Promise.resolve('Mock page body text content');
          }
          // Handle data extraction calls (they have parameters)
          if (args.length > 0 || fnString.includes('selectors') || fnString.includes('data')) {
            return Promise.resolve({});
          }
        }
        // Default behavior for other evaluate calls
        return Promise.resolve({});
      }),
      close: jest.fn().mockResolvedValue(undefined),
      setViewport: jest.fn().mockResolvedValue(undefined),
      setUserAgent: jest.fn().mockResolvedValue(undefined),
      setExtraHTTPHeaders: jest.fn().mockResolvedValue(undefined),
      waitForFunction: jest.fn().mockResolvedValue(undefined),
      waitForSelector: jest.fn().mockResolvedValue(undefined),
      waitForTimeout: jest.fn().mockResolvedValue(undefined),
      on: jest.fn().mockReturnValue(undefined),
      $: jest.fn(),
      $$: jest.fn(),
    } as jest.Mocked<puppeteer.Page>;

    // Create mock browser with resolved methods
    mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue(undefined),
      createBrowserContext: jest.fn().mockResolvedValue({
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn().mockResolvedValue(undefined),
        pages: jest.fn().mockReturnValue([mockPage]),
      } as any),
      isConnected: jest.fn().mockReturnValue(true),
    } as jest.Mocked<puppeteer.Browser>;

    // Setup launch mock to return our mock browser
    (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);
    
    // Mock BrowserPool.getBrowser method with our custom browser
    jest.spyOn(BrowserPool, 'getBrowser').mockResolvedValue(mockBrowser);
  });

  describe('MFC Configuration Validation', () => {
    it('should have complete MFC configuration', () => {
      const mfcConfig = SITE_CONFIGS.mfc;
      
      expect(mfcConfig).toBeDefined();
      expect(mfcConfig.imageSelector).toBe('.item-picture .main img');
      expect(mfcConfig.manufacturerSelector).toContain(':contains("Company")');
      expect(mfcConfig.nameSelector).toContain(':contains("Character")');
      expect(mfcConfig.scaleSelector).toBe('.item-scale');
      expect(mfcConfig.waitTime).toBe(1000);
      expect(mfcConfig.userAgent).toContain('Chrome/127.0.0.0');
    });

    it('should have Cloudflare detection configured', () => {
      const mfcConfig = SITE_CONFIGS.mfc;
      
      expect(mfcConfig.cloudflareDetection).toBeDefined();
      expect(mfcConfig.cloudflareDetection?.titleIncludes).toContain('Just a moment');
      expect(mfcConfig.cloudflareDetection?.bodyIncludes).toContain('Just a moment');
    });

    it('should have expanded Cloudflare detection patterns', () => {
      const mfcConfig = SITE_CONFIGS.mfc;
      
      expect(mfcConfig.cloudflareDetection?.titleIncludes).toEqual(
        expect.arrayContaining([
          'Just a moment',
          'Please wait',
          'Checking your browser',
          'Security check',
          'Browser verification'
        ])
      );
      
      expect(mfcConfig.cloudflareDetection?.bodyIncludes).toEqual(
        expect.arrayContaining([
          'Just a moment',
          'Please wait while we verify',
          'Checking your browser before accessing',
          'verify you are a human',
          'JavaScript required',
          'DDoS protection',
          'Performance & security by Cloudflare',
          'Your browser will redirect automatically'
        ])
      );
    });

    it('should use realistic Chrome user agent', () => {
      const mfcConfig = SITE_CONFIGS.mfc;
      const userAgent = mfcConfig.userAgent;
      
      expect(userAgent).toMatch(/Mozilla\/5\.0/);
      expect(userAgent).toMatch(/Windows NT 10\.0/);
      expect(userAgent).toMatch(/Chrome\/127\.0\.0\.0/);
      expect(userAgent).toMatch(/Safari\/537\.36/);
    });
  });

  describe('MFC DOM Structure Parsing', () => {
    it('should parse MFC HTML fixture with Cheerio', () => {
      const $ = cheerio.load(MFC_FIGURE_HTML);
      
      const imageUrl = $('.item-picture .main img').attr('src');
      const manufacturerElement = $('.data-field').filter((_, el) => 
        $(el).find('.data-label').text().trim() === 'Company'
      ).find('.item-entries a span[switch]');
      const nameElement = $('.data-field').filter((_, el) => 
        $(el).find('.data-label').text().trim() === 'Character'
      ).find('.item-entries a span[switch]');
      const scaleText = $('.item-scale').text().trim();
      
      const manufacturer = manufacturerElement.text().trim();
      const name = nameElement.text().trim();
      
      expect(imageUrl).toBe('https://static.myfigurecollection.net/pics/figure/large/123456.jpg');
      expect(manufacturer).toBe('Good Smile Company');
      expect(name).toBe('Hatsune Miku');
      expect(scaleText).toBe('1/7');
    });

    it('should handle complex MFC DOM structures with nested selectors', () => {
      const $ = cheerio.load(`
        <!DOCTYPE html>
        <html><body>
          <div class="data-field complex">
            <div class="data-label">Company</div>
            <div class="data-value">
              <div class="item-entries">
                <a href="/manufacturer/123">
                  <span switch>Max Factory</span>
                  <small>(Distributed by Good Smile Company)</small>
                </a>
              </div>
            </div>
          </div>
          <div class="item-scale">Limited Edition 1/7 Scale</div>
        </body></html>
      `);
      
      const manufacturerElement = $('.data-field').filter((_, el) => 
        $(el).find('.data-label').text().trim() === 'Company'
      ).find('.item-entries a span[switch]');
      const scaleText = $('.item-scale').text().trim();
      
      const manufacturer = manufacturerElement.text().trim();
      const scaleMatch = scaleText.match(/1\/\d+/);
      
      expect(manufacturer).toBe('Max Factory');
      expect(scaleMatch?.[0]).toBe('1/7');
    });

    it('should handle MFC Cloudflare challenge detection with Cheerio', () => {
      const $ = cheerio.load(CLOUDFLARE_CHALLENGE_HTML);
      
      const titleText = $('title').text().trim();
      const bodyText = $('body div').text().trim();
      
      expect(titleText).toBe('Just a moment...');
      expect(bodyText).toContain('Please wait while we verify');
    });

    it('should detect various Cloudflare challenge variations', () => {
      const variations = CLOUDFLARE_CHALLENGE_VARIATIONS;
      
      const testVariations = [
        variations.BROWSER_CHECK,
        variations.DDOS_PROTECTION,
        variations.FUZZY_VARIATIONS,
        variations.MULTILINGUAL,
        variations.ACCESS_DENIED
      ];
      
      testVariations.forEach((variation) => {
        const $ = cheerio.load(variation);
        const titleText = $('title').text().trim();
        const bodyText = $('body div').text().trim();
        
        expect(titleText).toMatch(/moment|check|protection|denied/i);
        expect(bodyText).toMatch(/wait|verify|check|block|protection|espere|warten/i);
      });
    });
    it('should extract image from correct MFC selector', async () => {
      // Mock both cloudflare detection and scraping calls
      mockPage.evaluate.mockImplementation((fn) => {
        if (fn.toString().includes('document.body.innerText')) {
          return Promise.resolve('Normal page content text');
        }
        return Promise.resolve({
          imageUrl: 'https://static.myfigurecollection.net/pics/figure/large/123456.jpg',
        });
      });

      const result = await scrapeMFC('https://myfigurecollection.net/item/123456');
      
      expect(result.imageUrl).toBe('https://static.myfigurecollection.net/pics/figure/large/123456.jpg');
    });

    it('should extract manufacturer using MFC data-field structure', async () => {
      mockPage.evaluate.mockImplementation((fn) => {
        if (fn.toString().includes('document.body.innerText')) {
          return Promise.resolve('Normal page content text');
        }
        // Simulate MFC manufacturer extraction from data-field structure
        return Promise.resolve({
          manufacturer: 'Good Smile Company',
        });
      });

      const result = await scrapeMFC('https://myfigurecollection.net/item/123456');
      
      expect(result.manufacturer).toBe('Good Smile Company');
    });

    it('should extract character name from MFC structure', async () => {
      mockPage.evaluate.mockImplementation((fn) => {
        if (fn.toString().includes('document.body.innerText')) {
          return Promise.resolve('Normal page content text');
        }
        // Simulate MFC character name extraction
        return Promise.resolve({
          name: 'Hatsune Miku',
        });
      });

      const result = await scrapeMFC('https://myfigurecollection.net/item/123456');
      
      expect(result.name).toBe('Hatsune Miku');
    });

    it('should extract scale from MFC item-scale element', async () => {
      mockPage.evaluate.mockImplementation((fn) => {
        if (fn.toString().includes('document.body.innerText')) {
          return Promise.resolve('Normal page content text');
        }
        // Simulate scale extraction with regex matching
        return Promise.resolve({
          scale: '1/7',
        });
      });

      const result = await scrapeMFC('https://myfigurecollection.net/item/123456');
      
      expect(result.scale).toBe('1/7');
    });

    it('should handle complete MFC figure data extraction', async () => {
      const completeMFCData = {
        imageUrl: 'https://static.myfigurecollection.net/pics/figure/large/123456.jpg',
        manufacturer: 'Good Smile Company',
        name: 'Hatsune Miku',
        scale: '1/7',
      };

      mockPage.evaluate.mockImplementation((fn) => {
        if (fn.toString().includes('document.body.innerText')) {
          return Promise.resolve('Normal page content text');
        }
        return Promise.resolve(completeMFCData);
      });

      const result = await scrapeMFC('https://myfigurecollection.net/item/123456');
      
      expect(result).toEqual(completeMFCData);
    });
  });

  describe('MFC-Specific Selector Logic', () => {
    it('should handle data-field with label contains logic', async () => {
      mockPage.evaluate
        .mockResolvedValueOnce('Mock page body text content') // First call: bodyText check
        .mockImplementationOnce((extractorFn, config) => { // Second call: data extraction
        // Simulate the complex MFC DOM structure
        const mockDataFields = [
          {
            querySelector: jest.fn()
              .mockReturnValueOnce({ textContent: 'Company' })
              .mockReturnValueOnce({ textContent: 'Good Smile Company' }),
          },
          {
            querySelector: jest.fn()
              .mockReturnValueOnce({ textContent: 'Character' })
              .mockReturnValueOnce({ textContent: 'Hatsune Miku' }),
          },
          {
            querySelector: jest.fn()
              .mockReturnValueOnce({ textContent: 'Series' })
              .mockReturnValueOnce({ textContent: 'Vocaloid' }),
          },
        ];

        // Mock the document.querySelectorAll('.data-field') call
        const mockDocument = {
          querySelector: jest.fn(),
          querySelectorAll: jest.fn().mockReturnValue(mockDataFields),
        };

        // Execute the extraction logic simulation
        const data: any = {};
        
        // Simulate manufacturer extraction
        for (const field of mockDataFields) {
          const label = field.querySelector('.data-label');
          if (label && label.textContent && label.textContent.trim() === 'Company') {
            const manufacturerElement = field.querySelector('.item-entries a span[switch]');
            if (manufacturerElement && manufacturerElement.textContent) {
              data.manufacturer = manufacturerElement.textContent.trim();
              break;
            }
          }
        }

        // Simulate name extraction
        for (const field of mockDataFields) {
          const label = field.querySelector('.data-label');
          if (label && label.textContent && label.textContent.trim() === 'Character') {
            const nameElement = field.querySelector('.item-entries a span[switch]');
            if (nameElement && nameElement.textContent) {
              data.name = nameElement.textContent.trim();
              break;
            }
          }
        }

        return data;
      });

      const result = await scrapeMFC('https://myfigurecollection.net/item/123456');

      expect(result.manufacturer).toBe('Good Smile Company');
      expect(result.name).toBe('Hatsune Miku');
    });

    it('should handle scale extraction with regex pattern', async () => {
      mockPage.evaluate
        .mockResolvedValueOnce('Mock page body text content') // First call: bodyText check
        .mockImplementationOnce(() => { // Second call: data extraction
        // Simulate scale element with extra text
        const scaleText = 'Premium Figure 1/7 Scale Complete Figure';
        const scaleMatch = scaleText.match(/1\/\d+/);
        
        return {
          scale: scaleMatch ? scaleMatch[0] : scaleText,
        };
      });

      const result = await scrapeMFC('https://myfigurecollection.net/item/123456');
      
      expect(result.scale).toBe('1/7');
    });

    it('should handle missing data fields gracefully', async () => {
      mockPage.evaluate
        .mockResolvedValueOnce('Mock page body text content') // First call: bodyText check
        .mockImplementationOnce(() => { // Second call: data extraction
        // Simulate MFC page with missing data fields
        return {
          imageUrl: 'https://static.myfigurecollection.net/pics/figure/large/123456.jpg',
          // manufacturer, name, scale are missing
        };
      });

      const result = await scrapeMFC('https://myfigurecollection.net/item/123456');
      
      expect(result.imageUrl).toBeDefined();
      expect(result.manufacturer).toBeUndefined();
      expect(result.name).toBeUndefined();
      expect(result.scale).toBeUndefined();
    });
  });

  describe('MFC Cloudflare Challenge Handling', () => {
    it('should detect and handle MFC Cloudflare challenge', async () => {
      // Mock Cloudflare challenge detection
      mockPage.title.mockResolvedValueOnce('Just a moment...');
      mockPage.evaluate
        .mockResolvedValueOnce('Just a moment...') // First call for body text
        .mockResolvedValueOnce({ // Second call for data extraction
          imageUrl: 'https://static.myfigurecollection.net/pics/figure/large/123456.jpg',
          manufacturer: 'Good Smile Company',
          name: 'Hatsune Miku',
          scale: '1/7',
        });

      const result = await scrapeMFC('https://myfigurecollection.net/item/123456');

      expect(mockPage.waitForFunction).toHaveBeenCalled();
      expect(result).toEqual({
        imageUrl: 'https://static.myfigurecollection.net/pics/figure/large/123456.jpg',
        manufacturer: 'Good Smile Company',
        name: 'Hatsune Miku',
        scale: '1/7',
      });
    });

    it('should handle Cloudflare challenge timeout with robust error recovery', async () => {
      // Mock Cloudflare challenge with timeout
      mockPage.title.mockResolvedValueOnce('Just a moment...');
      mockPage.evaluate
        .mockResolvedValueOnce('Just a moment...') // First call: bodyText check
        .mockResolvedValueOnce({ // Second call: data extraction
          imageUrl: 'https://static.myfigurecollection.net/pics/figure/large/123456.jpg',
        });
      mockPage.waitForFunction.mockRejectedValueOnce(new Error('Challenge timeout'));

      const result = await scrapeMFC('https://myfigurecollection.net/item/123456');

      expect(result.imageUrl).toBe('https://static.myfigurecollection.net/pics/figure/large/123456.jpg');
      expect(mockPage.close).toHaveBeenCalled();  // Ensure page is closed
      expect(mockPage.waitForFunction).toHaveBeenCalledTimes(1);  // Verify challenge attempt
    });

    it('should detect enhanced Cloudflare patterns', async () => {
      const testCases = [
        { title: 'Checking your browser', body: 'Checking your browser before accessing' },
        { title: 'DDoS protection', body: 'DDoS protection by Cloudflare' },
        { title: 'Security check', body: 'Please enable JavaScript and cookies' },
        { title: 'Browser verification', body: 'verify you are a human' },
      ];

      for (const testCase of testCases) {
        mockPage.title.mockResolvedValueOnce(testCase.title);
        mockPage.evaluate
          .mockResolvedValueOnce(testCase.body)
          .mockResolvedValueOnce({ imageUrl: 'test.jpg' });
        
        const result = await scrapeMFC('https://myfigurecollection.net/item/123456');
        
        expect(mockPage.waitForFunction).toHaveBeenCalled();
        expect(result.imageUrl).toBeDefined();
      }
    });

    it('should handle fuzzy pattern matching with typos and spacing', async () => {
      const testCases = [
        { title: 'Just  a   moment...', body: 'Please wait while  we  verify' },
        { title: 'Jst a moment', body: 'Please wat while we verify you are human' },
        { title: 'Checking  your  browser...', body: 'Checking your browsr before accessing' },
      ];

      for (const testCase of testCases) {
        mockPage.title.mockResolvedValueOnce(testCase.title);
        mockPage.evaluate
          .mockResolvedValueOnce(testCase.body)
          .mockResolvedValueOnce({ imageUrl: 'test.jpg' });
        
        const result = await scrapeMFC('https://myfigurecollection.net/item/123456');
        
        expect(mockPage.waitForFunction).toHaveBeenCalled();
        expect(result.imageUrl).toBeDefined();
      }
    });

    it('should detect multilingual Cloudflare patterns', async () => {
      const testCases = [
        { title: 'Un moment', body: 'Por favor espere' },
        { title: 'Bitte warten', body: 'Bitte warten Sie' },
        { title: 'Espere por favor', body: 'Veuillez patienter' },
      ];

      for (const testCase of testCases) {
        mockPage.title.mockResolvedValueOnce(testCase.title);
        mockPage.evaluate
          .mockResolvedValueOnce(testCase.body)
          .mockResolvedValueOnce({ imageUrl: 'test.jpg' });
        
        const result = await scrapeMFC('https://myfigurecollection.net/item/123456');
        
        expect(mockPage.waitForFunction).toHaveBeenCalled();
        expect(result.imageUrl).toBeDefined();
      }
    });

    it('should detect access denied and blocking patterns', async () => {
      const testCases = [
        { title: 'Access denied', body: 'Website is under attack mode' },
        { title: 'Forbidden', body: 'blocked by security policy' },
        { title: 'High security', body: 'Browser integrity check' },
      ];

      for (const testCase of testCases) {
        mockPage.title.mockResolvedValueOnce(testCase.title);
        mockPage.evaluate
          .mockResolvedValueOnce(testCase.body)
          .mockResolvedValueOnce({ imageUrl: 'test.jpg' });
        
        const result = await scrapeMFC('https://myfigurecollection.net/item/123456');
        
        expect(mockPage.waitForFunction).toHaveBeenCalled();
        expect(result.imageUrl).toBeDefined();
      }
    });
  });

  describe('MFC URL Variations', () => {
    const testMFCUrls = [
      'https://myfigurecollection.net/item/123456',
      'https://www.myfigurecollection.net/item/123456',
      'http://myfigurecollection.net/item/123456',
      'https://myfigurecollection.net/browse/123456',
    ];

    testMFCUrls.forEach((url) => {
      it(`should handle MFC URL format: ${url}`, async () => {
        mockPage.evaluate
          .mockResolvedValueOnce('Mock page body text content') // First call: bodyText check
          .mockResolvedValueOnce({ // Second call: data extraction
            name: 'Test Figure',
          });

        const result = await scrapeMFC(url);

        expect(result.name).toBe('Test Figure');
        expect(mockPage.goto).toHaveBeenCalledWith(
          url,
          expect.objectContaining({
            waitUntil: 'domcontentloaded',
            timeout: 20000,
          })
        );
      });
    });
  });

  describe('MFC-Specific Error Handling', () => {
    it('should handle MFC item not found (404)', async () => {
      const notFoundError = new Error('HTTP 404 Not Found');
      mockPage.goto.mockRejectedValueOnce(notFoundError);

      await expect(scrapeMFC('https://myfigurecollection.net/item/999999'))
        .rejects.toThrow('HTTP 404 Not Found');
    });

    it('should handle MFC server errors', async () => {
      const serverError = new Error('HTTP 500 Internal Server Error');
      mockPage.goto.mockRejectedValueOnce(serverError);

      await expect(scrapeMFC('https://myfigurecollection.net/item/123456'))
        .rejects.toThrow('HTTP 500 Internal Server Error');
    });

    it('should handle MFC rate limiting', async () => {
      const rateLimitError = new Error('HTTP 429 Too Many Requests');
      mockPage.goto.mockRejectedValueOnce(rateLimitError);

      await expect(scrapeMFC('https://myfigurecollection.net/item/123456'))
        .rejects.toThrow('HTTP 429 Too Many Requests');
    });

    it('should handle MFC maintenance mode', async () => {
      mockPage.title.mockResolvedValueOnce('Maintenance - My Figure Collection');
      mockPage.evaluate
        .mockResolvedValueOnce('Mock page body text content') // First call: bodyText check
        .mockResolvedValueOnce({}); // Second call: data extraction

      const result = await scrapeMFC('https://myfigurecollection.net/item/123456');

      // Should return empty result during maintenance
      expect(result).toEqual({});
    });
  });

  describe('MFC Data Quality and Edge Cases', () => {
    it('should handle figures with multiple manufacturers', async () => {
      mockPage.evaluate
        .mockResolvedValueOnce('Mock page body text content') // First call: bodyText check
        .mockImplementationOnce(() => { // Second call: data extraction
          return {
            manufacturer: 'Good Smile Company, Max Factory',
          };
      });

      const result = await scrapeMFC('https://myfigurecollection.net/item/123456');
      
      expect(result.manufacturer).toBe('Good Smile Company, Max Factory');
    });

    it('should handle figures with multiple characters', async () => {
      mockPage.evaluate
        .mockResolvedValueOnce('Mock page body text content') // First call: bodyText check
        .mockImplementationOnce(() => { // Second call: data extraction
          return {
            name: 'Hatsune Miku, Kagamine Rin',
          };
      });

      const result = await scrapeMFC('https://myfigurecollection.net/item/123456');
      
      expect(result.name).toBe('Hatsune Miku, Kagamine Rin');
    });

    it('should handle non-standard scale formats', async () => {
      const nonStandardScales = [
        'NON-scale',
        'REAL',
        '1/4',
        '1/12',
        'Prize Figure',
      ];

      for (const scale of nonStandardScales) {
        mockPage.evaluate
          .mockResolvedValueOnce('Mock page body text content') // First call: bodyText check
          .mockResolvedValueOnce({ scale }); // Second call: data extraction
        
        const result = await scrapeMFC('https://myfigurecollection.net/item/123456');
        expect(result.scale).toBe(scale);
      }
    });

    it('should handle figures with no image', async () => {
      mockPage.evaluate
        .mockResolvedValueOnce('Mock page body text content') // First call: bodyText check
        .mockImplementationOnce(() => { // Second call: data extraction
          return {
            manufacturer: 'Good Smile Company',
            name: 'Hatsune Miku',
            scale: '1/7',
            // imageUrl is missing
        };
      });

      const result = await scrapeMFC('https://myfigurecollection.net/item/123456');
      
      expect(result.imageUrl).toBeUndefined();
      expect(result.manufacturer).toBe('Good Smile Company');
    });

    it('should handle MFC placeholder images', async () => {
      mockPage.evaluate
        .mockResolvedValueOnce('Mock page body text content') // First call: bodyText check
        .mockImplementationOnce(() => { // Second call: data extraction
          return {
            imageUrl: 'https://static.myfigurecollection.net/pics/figure/large/placeholder.jpg',
          };
      });

      const result = await scrapeMFC('https://myfigurecollection.net/item/123456');
      
      expect(result.imageUrl).toBe('https://static.myfigurecollection.net/pics/figure/large/placeholder.jpg');
    });
  });

  describe('MFC Performance Optimization', () => {
    it('should use MFC-optimized wait time', async () => {
      const mfcConfig = SITE_CONFIGS.mfc;
      expect(mfcConfig.waitTime).toBe(1000); // Optimized for MFC loading
    });

    it('should complete MFC scraping within strict performance and resource management parameters', async () => {
      mockPage.evaluate
        .mockResolvedValueOnce('Mock page body text content') // First call: bodyText check
        .mockResolvedValueOnce({ // Second call: data extraction
          imageUrl: 'https://static.myfigurecollection.net/pics/figure/large/123456.jpg',
          manufacturer: 'Good Smile Company',
          name: 'Hatsune Miku',
          scale: '1/7',
        });

      const startTime = performance.now();
      const result = await scrapeMFC('https://myfigurecollection.net/item/123456');
      const endTime = performance.now();

      // Comprehensive result validation
      expect(result).toEqual({
        imageUrl: 'https://static.myfigurecollection.net/pics/figure/large/123456.jpg',
        manufacturer: 'Good Smile Company',
        name: 'Hatsune Miku',
        scale: '1/7',
      });

      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds

      // Resource management assertions
      expect(mockPage.goto).toHaveBeenCalledTimes(1);
      expect(mockPage.evaluate).toHaveBeenCalledTimes(2);
      expect(mockPage.close).toHaveBeenCalledTimes(1);
      expect(mockPage.setUserAgent).toHaveBeenCalledWith(SITE_CONFIGS.mfc.userAgent);

      // Memory and performance assertions
      // Note: Browser is NOT closed - it's managed by the pool for reuse
      // Only the context and its pages are closed
      expect(mockBrowser.close).not.toHaveBeenCalled();
    });
  });

  describe('MFC Integration with Generic Scraper', () => {
    it('should use generic scraper with MFC config', async () => {
      mockPage.evaluate
        .mockResolvedValueOnce('Mock page body text content') // First call: bodyText check
        .mockResolvedValueOnce({ name: 'Test Figure' }); // Second call: data extraction

      const result = await scrapeMFC('https://myfigurecollection.net/item/123456');

      // Verify that the MFC configuration was used by checking the result
      expect(result.name).toBe('Test Figure');
      expect(mockPage.setUserAgent).toHaveBeenCalledWith(SITE_CONFIGS.mfc.userAgent);
    });

    it('should pass through all MFC configuration options', async () => {
      mockPage.evaluate
        .mockResolvedValueOnce('Mock page body text content') // First call: bodyText check
        .mockResolvedValueOnce({}); // Second call: data extraction

      await scrapeMFC('https://myfigurecollection.net/item/123456');

      expect(mockPage.setUserAgent).toHaveBeenCalledWith(SITE_CONFIGS.mfc.userAgent);
    });
  });

  describe('MFC Selector Robustness', () => {
    it('should handle MFC DOM structure changes gracefully', async () => {
      // Simulate changed DOM structure where selectors don't match
      mockPage.evaluate.mockImplementation((fn) => {
        if (fn.toString().includes('document.body.innerText')) {
          return Promise.resolve('Normal page content text');
        }
        // Return empty object as if selectors didn't find anything
        return Promise.resolve({});
      });

      const result = await scrapeMFC('https://myfigurecollection.net/item/123456');
      
      expect(result).toEqual({});
    });

    it('should handle partial data extraction', async () => {
      mockPage.evaluate
        .mockResolvedValueOnce('Mock page body text content') // First call: bodyText check
        .mockImplementationOnce(() => { // Second call: data extraction
          // Only some fields are found
          return {
            imageUrl: 'https://static.myfigurecollection.net/pics/figure/large/123456.jpg',
            name: 'Hatsune Miku',
            // manufacturer and scale missing
        };
      });

      const result = await scrapeMFC('https://myfigurecollection.net/item/123456');
      
      expect(result.imageUrl).toBeDefined();
      expect(result.name).toBeDefined();
      expect(result.manufacturer).toBeUndefined();
      expect(result.scale).toBeUndefined();
    });
  });
});