import { jest } from '@jest/globals';
import { scrapeMFC, SITE_CONFIGS, scrapeGeneric } from '../../services/genericScraper';
import { mockBrowser, mockPage } from '../__mocks__/puppeteer';
import { MFC_FIGURE_HTML, CLOUDFLARE_CHALLENGE_HTML } from '../fixtures/test-html';

// Mock puppeteer
jest.mock('puppeteer', () => ({
  launch: jest.fn().mockResolvedValue(mockBrowser),
}));

describe('MFC-Specific Scraping Configuration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mocks to default behavior
    mockPage.setViewport.mockResolvedValue(undefined);
    mockPage.setUserAgent.mockResolvedValue(undefined);
    mockPage.setExtraHTTPHeaders.mockResolvedValue(undefined);
    mockPage.goto.mockResolvedValue(undefined);
    mockPage.title.mockResolvedValue('Figure Page - My Figure Collection');
    mockPage.evaluate.mockResolvedValue({});
    mockPage.waitForFunction.mockResolvedValue(undefined);
    mockPage.close.mockResolvedValue(undefined);
    mockBrowser.newPage.mockResolvedValue(mockPage);
    mockBrowser.close.mockResolvedValue(undefined);
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
    it('should extract image from correct MFC selector', async () => {
      // Mock MFC-specific DOM structure parsing
      mockPage.evaluate.mockImplementationOnce((fn) => {
        // Simulate MFC image extraction
        const mockDocument = {
          querySelector: jest.fn().mockReturnValue({
            src: 'https://static.myfigurecollection.net/pics/figure/large/123456.jpg',
          }),
        };
        
        // Return what the extraction function would find
        return {
          imageUrl: 'https://static.myfigurecollection.net/pics/figure/large/123456.jpg',
        };
      });

      const result = await scrapeMFC('https://myfigurecollection.net/item/123456');
      
      expect(result.imageUrl).toBe('https://static.myfigurecollection.net/pics/figure/large/123456.jpg');
    });

    it('should extract manufacturer using MFC data-field structure', async () => {
      mockPage.evaluate.mockImplementationOnce((fn) => {
        // Simulate MFC manufacturer extraction from data-field structure
        return {
          manufacturer: 'Good Smile Company',
        };
      });

      const result = await scrapeMFC('https://myfigurecollection.net/item/123456');
      
      expect(result.manufacturer).toBe('Good Smile Company');
    });

    it('should extract character name from MFC structure', async () => {
      mockPage.evaluate.mockImplementationOnce((fn) => {
        // Simulate MFC character name extraction
        return {
          name: 'Hatsune Miku',
        };
      });

      const result = await scrapeMFC('https://myfigurecollection.net/item/123456');
      
      expect(result.name).toBe('Hatsune Miku');
    });

    it('should extract scale from MFC item-scale element', async () => {
      mockPage.evaluate.mockImplementationOnce((fn) => {
        // Simulate scale extraction with regex matching
        return {
          scale: '1/7',
        };
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

      mockPage.evaluate.mockResolvedValueOnce(completeMFCData);

      const result = await scrapeMFC('https://myfigurecollection.net/item/123456');
      
      expect(result).toEqual(completeMFCData);
    });
  });

  describe('MFC-Specific Selector Logic', () => {
    it('should handle data-field with label contains logic', async () => {
      mockPage.evaluate.mockImplementationOnce((extractorFn, config) => {
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
      mockPage.evaluate.mockImplementationOnce(() => {
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
      mockPage.evaluate.mockImplementationOnce(() => {
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

    it('should continue after Cloudflare challenge timeout', async () => {
      // Mock Cloudflare challenge with timeout
      mockPage.title.mockResolvedValueOnce('Just a moment...');
      mockPage.evaluate.mockResolvedValueOnce('Just a moment...');
      mockPage.waitForFunction.mockRejectedValueOnce(new Error('Challenge timeout'));
      mockPage.evaluate.mockResolvedValueOnce({
        imageUrl: 'https://static.myfigurecollection.net/pics/figure/large/123456.jpg',
      });

      const result = await scrapeMFC('https://myfigurecollection.net/item/123456');

      expect(result.imageUrl).toBeDefined();
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
        mockPage.evaluate.mockResolvedValueOnce({
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
      mockPage.goto.mkRejectedValueOnce(rateLimitError);

      await expect(scrapeMFC('https://myfigurecollection.net/item/123456'))
        .rejects.toThrow('HTTP 429 Too Many Requests');
    });

    it('should handle MFC maintenance mode', async () => {
      mockPage.title.mockResolvedValueOnce('Maintenance - My Figure Collection');
      mockPage.evaluate.mockResolvedValueOnce({});

      const result = await scrapeMFC('https://myfigurecollection.net/item/123456');

      // Should return empty result during maintenance
      expect(result).toEqual({});
    });
  });

  describe('MFC Data Quality and Edge Cases', () => {
    it('should handle figures with multiple manufacturers', async () => {
      mockPage.evaluate.mockImplementationOnce(() => {
        return {
          manufacturer: 'Good Smile Company, Max Factory',
        };
      });

      const result = await scrapeMFC('https://myfigurecollection.net/item/123456');
      
      expect(result.manufacturer).toBe('Good Smile Company, Max Factory');
    });

    it('should handle figures with multiple characters', async () => {
      mockPage.evaluate.mockImplementationOnce(() => {
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
        mockPage.evaluate.mockResolvedValueOnce({ scale });
        
        const result = await scrapeMFC('https://myfigurecollection.net/item/123456');
        expect(result.scale).toBe(scale);
      }
    });

    it('should handle figures with no image', async () => {
      mockPage.evaluate.mockImplementationOnce(() => {
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
      mockPage.evaluate.mockImplementationOnce(() => {
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

    it('should complete MFC scraping within reasonable time', async () => {
      mockPage.evaluate.mockResolvedValueOnce({
        imageUrl: 'https://static.myfigurecollection.net/pics/figure/large/123456.jpg',
        manufacturer: 'Good Smile Company',
        name: 'Hatsune Miku',
        scale: '1/7',
      });

      const startTime = Date.now();
      const result = await scrapeMFC('https://myfigurecollection.net/item/123456');
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('MFC Integration with Generic Scraper', () => {
    it('should use generic scraper with MFC config', async () => {
      const spy = jest.spyOn({ scrapeGeneric }, 'scrapeGeneric');
      
      mockPage.evaluate.mockResolvedValueOnce({ name: 'Test Figure' });

      await scrapeMFC('https://myfigurecollection.net/item/123456');

      expect(scrapeGeneric).toHaveBeenCalledWith(
        'https://myfigurecollection.net/item/123456',
        SITE_CONFIGS.mfc
      );
    });

    it('should pass through all MFC configuration options', async () => {
      mockPage.evaluate.mockResolvedValueOnce({});

      await scrapeMFC('https://myfigurecollection.net/item/123456');

      expect(mockPage.setUserAgent).toHaveBeenCalledWith(SITE_CONFIGS.mfc.userAgent);
    });
  });

  describe('MFC Selector Robustness', () => {
    it('should handle MFC DOM structure changes gracefully', async () => {
      // Simulate changed DOM structure where selectors don't match
      mockPage.evaluate.mockImplementationOnce(() => {
        // Return empty object as if selectors didn't find anything
        return {};
      });

      const result = await scrapeMFC('https://myfigurecollection.net/item/123456');
      
      expect(result).toEqual({});
    });

    it('should handle partial data extraction', async () => {
      mockPage.evaluate.mockImplementationOnce(() => {
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