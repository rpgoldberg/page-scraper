import { jest } from '@jest/globals';
import puppeteer from 'puppeteer';
import { scrapeGeneric, ScrapeConfig, BrowserPool } from '../../services/genericScraper';
import { CLOUDFLARE_CHALLENGE_VARIATIONS } from '../fixtures/test-html';

// Import the fuzzy matching functions for unit testing
// Note: These are internal functions, so we'll test them through the public API

describe('Enhanced Cloudflare Detection Tests', () => {
  let mockPage: jest.Mocked<puppeteer.Page>;
  let mockBrowser: jest.Mocked<puppeteer.Browser>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    mockPage = {
      goto: jest.fn().mockResolvedValue({ status: () => 200 }),
      title: jest.fn().mockResolvedValue('Normal Page'),
      evaluate: jest.fn().mockResolvedValue('Normal page content'),
      close: jest.fn().mockResolvedValue(undefined),
      setViewport: jest.fn().mockResolvedValue(undefined),
      setUserAgent: jest.fn().mockResolvedValue(undefined),
      setExtraHTTPHeaders: jest.fn().mockResolvedValue(undefined),
      waitForFunction: jest.fn().mockResolvedValue(undefined),
    } as jest.Mocked<puppeteer.Page>;

    mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue(undefined),
      isConnected: jest.fn().mockReturnValue(true),
    } as jest.Mocked<puppeteer.Browser>;

    (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);
    jest.spyOn(BrowserPool, 'getBrowser').mockResolvedValue(mockBrowser);
  });

  describe('Fuzzy String Matching', () => {
    const createTestConfig = (): ScrapeConfig => ({
      cloudflareDetection: {
        titleIncludes: ['Just a moment'],
        bodyIncludes: ['Just a moment']
      }
    });

    it('should detect exact pattern matches', async () => {
      mockPage.title.mockResolvedValueOnce('Just a moment...');
      mockPage.evaluate
        .mockResolvedValueOnce('Just a moment...')
        .mockResolvedValueOnce({ data: 'scraped' });

      await scrapeGeneric('https://test.com', createTestConfig());
      
      expect(mockPage.waitForFunction).toHaveBeenCalled();
    });

    it('should detect patterns with extra whitespace', async () => {
      mockPage.title.mockResolvedValueOnce('Just  a   moment   please...');
      mockPage.evaluate
        .mockResolvedValueOnce('Just  a   moment...')
        .mockResolvedValueOnce({ data: 'scraped' });

      await scrapeGeneric('https://test.com', createTestConfig());
      
      expect(mockPage.waitForFunction).toHaveBeenCalled();
    });

    it('should detect patterns with case variations', async () => {
      mockPage.title.mockResolvedValueOnce('JUST A MOMENT...');
      mockPage.evaluate
        .mockResolvedValueOnce('just a moment...')
        .mockResolvedValueOnce({ data: 'scraped' });

      await scrapeGeneric('https://test.com', createTestConfig());
      
      expect(mockPage.waitForFunction).toHaveBeenCalled();
    });

    it('should detect patterns with minor typos', async () => {
      mockPage.title.mockResolvedValueOnce('Jst a moment...');
      mockPage.evaluate
        .mockResolvedValueOnce('Jst a moment...')
        .mockResolvedValueOnce({ data: 'scraped' });

      await scrapeGeneric('https://test.com', createTestConfig());
      
      expect(mockPage.waitForFunction).toHaveBeenCalled();
    });

    it('should not detect completely different patterns', async () => {
      mockPage.title.mockResolvedValueOnce('Welcome to our website');
      mockPage.evaluate
        .mockResolvedValueOnce('Welcome to our website')
        .mockResolvedValueOnce({ data: 'scraped' });

      await scrapeGeneric('https://test.com', createTestConfig());
      
      expect(mockPage.waitForFunction).not.toHaveBeenCalled();
    });
  });

  describe('Expanded Pattern Library', () => {
    const createExpandedConfig = (): ScrapeConfig => ({
      cloudflareDetection: {
        titleIncludes: ['Just a moment'],
        bodyIncludes: ['Just a moment']
      }
    });

    it('should detect browser check patterns', async () => {
      mockPage.title.mockResolvedValueOnce('Checking your browser');
      mockPage.evaluate
        .mockResolvedValueOnce('Checking your browser before accessing')
        .mockResolvedValueOnce({ data: 'scraped' });

      await scrapeGeneric('https://test.com', createExpandedConfig());
      
      expect(mockPage.waitForFunction).toHaveBeenCalled();
    });

    it('should detect DDoS protection patterns', async () => {
      mockPage.title.mockResolvedValueOnce('DDoS protection');
      mockPage.evaluate
        .mockResolvedValueOnce('DDoS protection by Cloudflare')
        .mockResolvedValueOnce({ data: 'scraped' });

      await scrapeGeneric('https://test.com', createExpandedConfig());
      
      expect(mockPage.waitForFunction).toHaveBeenCalled();
    });

    it('should detect human verification patterns', async () => {
      mockPage.title.mockResolvedValueOnce('Security check');
      mockPage.evaluate
        .mockResolvedValueOnce('verify you are a human')
        .mockResolvedValueOnce({ data: 'scraped' });

      await scrapeGeneric('https://test.com', createExpandedConfig());
      
      expect(mockPage.waitForFunction).toHaveBeenCalled();
    });

    it('should detect JavaScript requirement patterns', async () => {
      mockPage.title.mockResolvedValueOnce('Please wait');
      mockPage.evaluate
        .mockResolvedValueOnce('JavaScript required')
        .mockResolvedValueOnce({ data: 'scraped' });

      await scrapeGeneric('https://test.com', createExpandedConfig());
      
      expect(mockPage.waitForFunction).toHaveBeenCalled();
    });

    it('should detect Ray ID patterns', async () => {
      mockPage.title.mockResolvedValueOnce('Security service');
      mockPage.evaluate
        .mockResolvedValueOnce('Ray ID: 123456789abcdef')
        .mockResolvedValueOnce({ data: 'scraped' });

      await scrapeGeneric('https://test.com', createExpandedConfig());
      
      expect(mockPage.waitForFunction).toHaveBeenCalled();
    });
  });

  describe('Multilingual Pattern Detection', () => {
    const createMultilingualConfig = (): ScrapeConfig => ({
      cloudflareDetection: {
        titleIncludes: ['Just a moment'],
        bodyIncludes: ['Just a moment']
      }
    });

    it('should detect Spanish patterns', async () => {
      mockPage.title.mockResolvedValueOnce('Espere por favor');
      mockPage.evaluate
        .mockResolvedValueOnce('Por favor espere')
        .mockResolvedValueOnce({ data: 'scraped' });

      await scrapeGeneric('https://test.com', createMultilingualConfig());
      
      expect(mockPage.waitForFunction).toHaveBeenCalled();
    });

    it('should detect German patterns', async () => {
      mockPage.title.mockResolvedValueOnce('Bitte warten');
      mockPage.evaluate
        .mockResolvedValueOnce('Bitte warten Sie')
        .mockResolvedValueOnce({ data: 'scraped' });

      await scrapeGeneric('https://test.com', createMultilingualConfig());
      
      expect(mockPage.waitForFunction).toHaveBeenCalled();
    });

    it('should detect French patterns', async () => {
      mockPage.title.mockResolvedValueOnce('Un moment');
      mockPage.evaluate
        .mockResolvedValueOnce('Veuillez patienter')
        .mockResolvedValueOnce({ data: 'scraped' });

      await scrapeGeneric('https://test.com', createMultilingualConfig());
      
      expect(mockPage.waitForFunction).toHaveBeenCalled();
    });

    it('should detect Italian patterns', async () => {
      mockPage.title.mockResolvedValueOnce('Attendere prego');
      mockPage.evaluate
        .mockResolvedValueOnce('Attendere prego')
        .mockResolvedValueOnce({ data: 'scraped' });

      await scrapeGeneric('https://test.com', createMultilingualConfig());
      
      expect(mockPage.waitForFunction).toHaveBeenCalled();
    });
  });

  describe('Access Denied and Security Patterns', () => {
    const createSecurityConfig = (): ScrapeConfig => ({
      cloudflareDetection: {
        titleIncludes: ['Just a moment'],
        bodyIncludes: ['Just a moment']
      }
    });

    it('should detect access denied patterns', async () => {
      mockPage.title.mockResolvedValueOnce('Access denied');
      mockPage.evaluate
        .mockResolvedValueOnce('Website is under attack mode')
        .mockResolvedValueOnce({ data: 'scraped' });

      await scrapeGeneric('https://test.com', createSecurityConfig());
      
      expect(mockPage.waitForFunction).toHaveBeenCalled();
    });

    it('should detect blocking patterns', async () => {
      mockPage.title.mockResolvedValueOnce('Forbidden');
      mockPage.evaluate
        .mockResolvedValueOnce('blocked by security policy')
        .mockResolvedValueOnce({ data: 'scraped' });

      await scrapeGeneric('https://test.com', createSecurityConfig());
      
      expect(mockPage.waitForFunction).toHaveBeenCalled();
    });

    it('should detect high security mode patterns', async () => {
      mockPage.title.mockResolvedValueOnce('High security');
      mockPage.evaluate
        .mockResolvedValueOnce('Browser integrity check')
        .mockResolvedValueOnce({ data: 'scraped' });

      await scrapeGeneric('https://test.com', createSecurityConfig());
      
      expect(mockPage.waitForFunction).toHaveBeenCalled();
    });
  });

  describe('Pattern Combination Tests', () => {
    const createCombinationConfig = (): ScrapeConfig => ({
      cloudflareDetection: {
        titleIncludes: ['Just a moment'],
        bodyIncludes: ['Just a moment']
      }
    });

    it('should detect challenge with Cloudflare branding', async () => {
      mockPage.title.mockResolvedValueOnce('Cloudflare');
      mockPage.evaluate
        .mockResolvedValueOnce('Performance & security by Cloudflare')
        .mockResolvedValueOnce({ data: 'scraped' });

      await scrapeGeneric('https://test.com', createCombinationConfig());
      
      expect(mockPage.waitForFunction).toHaveBeenCalled();
    });

    it('should detect combined patterns with Ray ID', async () => {
      mockPage.title.mockResolvedValueOnce('Challenge in progress');
      mockPage.evaluate
        .mockResolvedValueOnce('Cloudflare Ray ID: abc123def456')
        .mockResolvedValueOnce({ data: 'scraped' });

      await scrapeGeneric('https://test.com', createCombinationConfig());
      
      expect(mockPage.waitForFunction).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    const createEdgeCaseConfig = (): ScrapeConfig => ({
      cloudflareDetection: {
        titleIncludes: ['Just a moment'],
        bodyIncludes: ['Just a moment']
      }
    });

    it('should handle empty title and body gracefully', async () => {
      mockPage.title.mockResolvedValueOnce('');
      mockPage.evaluate
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce({ data: 'scraped' });

      await scrapeGeneric('https://test.com', createEdgeCaseConfig());
      
      expect(mockPage.waitForFunction).not.toHaveBeenCalled();
    });

    it('should handle very long text with embedded patterns', async () => {
      const longText = 'Lorem ipsum '.repeat(100) + 'Just a moment please wait' + ' dolor sit amet '.repeat(100);
      
      mockPage.title.mockResolvedValueOnce('Long title');
      mockPage.evaluate
        .mockResolvedValueOnce(longText)
        .mockResolvedValueOnce({ data: 'scraped' });

      await scrapeGeneric('https://test.com', createEdgeCaseConfig());
      
      expect(mockPage.waitForFunction).toHaveBeenCalled();
    });

    it('should handle pattern fragments that should not match', async () => {
      mockPage.title.mockResolvedValueOnce('Just');
      mockPage.evaluate
        .mockResolvedValueOnce('moment')
        .mockResolvedValueOnce({ data: 'scraped' });

      await scrapeGeneric('https://test.com', createEdgeCaseConfig());
      
      // Should not match fragments that are too different
      expect(mockPage.waitForFunction).not.toHaveBeenCalled();
    });
  });
});
