import puppeteer, { Browser, Page } from 'puppeteer';

export interface ScrapedData {
  imageUrl?: string;
  manufacturer?: string;
  name?: string;
  scale?: string;
  [key: string]: any; // Allow additional fields
}

export interface ScrapeConfig {
  imageSelector?: string;
  manufacturerSelector?: string;
  nameSelector?: string;
  scaleSelector?: string;
  cloudflareDetection?: {
    titleIncludes?: string[];
    bodyIncludes?: string[];
  };
  waitTime?: number; // milliseconds to wait after page load
  userAgent?: string;
}

// Predefined configurations for common sites
export const SITE_CONFIGS = {
  mfc: {
    imageSelector: '.item-picture .main img',
    manufacturerSelector: 'span[switch]',
    nameSelector: 'span[switch]:nth-of-type(2)',
    scaleSelector: '.item-scale a[title="Scale"]',
    cloudflareDetection: {
      titleIncludes: ['Just a moment'],
      bodyIncludes: ['Just a moment']
    },
    waitTime: 1000,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36'
  },
  // Future configs for other sites can be added here
  // hobbylink: { ... },
  // amiami: { ... }
};

class BrowserPool {
  private static browsers: Browser[] = [];
  private static readonly POOL_SIZE = 3; // Keep 3 browsers ready
  private static isInitialized = false;
  
  private static getBrowserConfig() {
    return {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-extensions',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--memory-pressure-off',
        '--single-process'
      ],
      timeout: 30000
    };
  }
  
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log(`[BROWSER POOL] Initializing pool with ${this.POOL_SIZE} browsers...`);
    
    for (let i = 0; i < this.POOL_SIZE; i++) {
      try {
        const browser = await puppeteer.launch(this.getBrowserConfig());
        this.browsers.push(browser);
        console.log(`[BROWSER POOL] Browser ${i + 1}/${this.POOL_SIZE} launched`);
      } catch (error) {
        console.error(`[BROWSER POOL] Failed to launch browser ${i + 1}:`, error);
      }
    }
    
    this.isInitialized = true;
    console.log(`[BROWSER POOL] Pool initialized with ${this.browsers.length} browsers`);
  }
  
  static async getBrowser(): Promise<Browser> {
    // Ensure pool is initialized
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    // Get a browser from the pool
    const browser = this.browsers.shift();
    
    if (!browser) {
      console.log('[BROWSER POOL] Pool empty, creating emergency browser...');
      return await puppeteer.launch(this.getBrowserConfig());
    }
    
    console.log(`[BROWSER POOL] Retrieved browser from pool (${this.browsers.length} remaining)`);
    
    // Immediately start replacing the browser we just took
    this.replenishPool().catch(error => {
      console.error('[BROWSER POOL] Failed to replenish pool:', error);
    });
    
    return browser;
  }
  
  private static async replenishPool(): Promise<void> {
    if (this.browsers.length < this.POOL_SIZE) {
      try {
        const browser = await puppeteer.launch(this.getBrowserConfig());
        this.browsers.push(browser);
        console.log(`[BROWSER POOL] Pool replenished (${this.browsers.length}/${this.POOL_SIZE})`);
      } catch (error) {
        console.error('[BROWSER POOL] Failed to replenish pool:', error);
      }
    }
  }
  
  static async closeAll(): Promise<void> {
    console.log(`[BROWSER POOL] Closing ${this.browsers.length} browsers...`);
    
    const closePromises = this.browsers.map(async (browser, index) => {
      try {
        await browser.close();
        console.log(`[BROWSER POOL] Browser ${index + 1} closed`);
      } catch (error) {
        console.error(`[BROWSER POOL] Error closing browser ${index + 1}:`, error);
      }
    });
    
    await Promise.all(closePromises);
    this.browsers = [];
    this.isInitialized = false;
    console.log('[BROWSER POOL] All browsers closed');
  }
}

// Initialize the browser pool
export async function initializeBrowserPool(): Promise<void> {
  await BrowserPool.initialize();
}

export async function scrapeGeneric(url: string, config: ScrapeConfig): Promise<ScrapedData> {
  console.log(`[GENERIC SCRAPER] Starting scrape for: ${url}`);
  console.log(`[GENERIC SCRAPER] Config:`, config);
  
  let browser: Browser | null = null;
  let page: Page | null = null;
  
  try {
    // Get fresh browser from pool (much faster than launching)
    browser = await BrowserPool.getBrowser();
    page = await browser.newPage();
    
    // Set realistic browser configuration
    await page.setViewport({ width: 1280, height: 720 });
    const userAgent = config.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36';
    await page.setUserAgent(userAgent);
    
    // Set extra headers to appear more like a real browser
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    });
    
    console.log('[GENERIC SCRAPER] Navigating to page...');
    
    // Navigate with faster wait conditions
    await page.goto(url, { 
      waitUntil: 'domcontentloaded', 
      timeout: 20000 
    });
    
    console.log('[GENERIC SCRAPER] Page loaded, waiting for content...');
    
    // Wait for dynamic content (configurable)
    const waitTime = config.waitTime || 1000;
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    // Check for Cloudflare challenge if configured
    if (config.cloudflareDetection) {
      const pageTitle = await page.title();
      const bodyText = await page.evaluate(() => document.body.innerText);
      
      const titleMatches = config.cloudflareDetection.titleIncludes?.some(text => pageTitle.includes(text));
      const bodyMatches = config.cloudflareDetection.bodyIncludes?.some(text => bodyText.includes(text));
      
      if (titleMatches || bodyMatches) {
        console.log('[GENERIC SCRAPER] Detected challenge page, waiting...');
        
        // Wait for the challenge to complete (shorter timeout)
        await page.waitForFunction(
          (detectionStrings) => !detectionStrings.some((str: string) => document.body.innerText.includes(str)),
          { timeout: 10000 },
          config.cloudflareDetection.bodyIncludes || []
        ).catch(() => {
          console.log('[GENERIC SCRAPER] Challenge timeout - proceeding anyway');
        });
        
        // Wait less after challenge completion (speed optimization)
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
    
    console.log('[GENERIC SCRAPER] Extracting data...');
    
    // Extract data using page.evaluate
    const scrapedData = await page.evaluate((selectors) => {
      const data: any = {};
      
      try {
        // Extract image
        if (selectors.imageSelector) {
          const imageElement = document.querySelector(selectors.imageSelector) as HTMLImageElement;
          if (imageElement && imageElement.src) {
            data.imageUrl = imageElement.src;
          }
        }
        
        // Extract manufacturer
        if (selectors.manufacturerSelector) {
          const manufacturerElement = document.querySelector(selectors.manufacturerSelector) as HTMLElement;
          if (manufacturerElement && manufacturerElement.textContent) {
            data.manufacturer = manufacturerElement.textContent.trim();
          }
        }
        
        // Extract name
        if (selectors.nameSelector) {
          const nameElement = document.querySelector(selectors.nameSelector) as HTMLElement;
          if (nameElement && nameElement.textContent) {
            data.name = nameElement.textContent.trim();
          }
        }
        
        // Extract scale
        if (selectors.scaleSelector) {
          const scaleElement = document.querySelector(selectors.scaleSelector) as HTMLElement;
          if (scaleElement && scaleElement.textContent) {
            data.scale = scaleElement.textContent.trim();
          }
        }
        
        // Debug: Log what we found
        console.log('Extracted data:', data);
        
      } catch (extractError) {
        console.error('Error during data extraction:', extractError);
      }
      
      return data;
    }, config);
    
    console.log('[GENERIC SCRAPER] Extraction completed:', scrapedData);
    
    return scrapedData;
    
  } catch (error: any) {
    console.error(`[GENERIC SCRAPER] Error: ${error.message}`);
    throw error;
  } finally {
    if (page) {
      await page.close();
      console.log('[GENERIC SCRAPER] Page closed');
    }
    if (browser) {
      await browser.close();
      console.log('[GENERIC SCRAPER] Browser closed');
    }
  }
}

// Convenience function for MFC scraping
export async function scrapeMFC(url: string): Promise<ScrapedData> {
  return scrapeGeneric(url, SITE_CONFIGS.mfc);
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[GENERIC SCRAPER] Received SIGTERM, closing browser pool...');
  await BrowserPool.closeAll();
});

process.on('SIGINT', async () => {
  console.log('[GENERIC SCRAPER] Received SIGINT, closing browser pool...');
  await BrowserPool.closeAll();
});