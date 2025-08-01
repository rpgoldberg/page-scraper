import puppeteer, { Browser, Page } from 'puppeteer';

export interface MFCScrapedData {
  imageUrl?: string;
  manufacturer?: string;
  name?: string;
  scale?: string;
}

class BrowserManager {
  private static browser: Browser | null = null;
  
  static async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      console.log('[BROWSER] Launching new browser instance...');
      this.browser = await puppeteer.launch({
        headless: 'new',
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
      });
      console.log('[BROWSER] Browser launched successfully');
    }
    return this.browser;
  }
  
  static async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log('[BROWSER] Browser closed');
    }
  }
}

export async function scrapeMFC(url: string): Promise<MFCScrapedData> {
  console.log(`[MFC SCRAPER] Starting scrape for: ${url}`);
  
  let page: Page | null = null;
  
  try {
    const browser = await BrowserManager.getBrowser();
    page = await browser.newPage();
    
    // Set realistic browser configuration
    await page.setViewport({ width: 1280, height: 720 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36');
    
    // Set extra headers to appear more like a real browser
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    });
    
    console.log('[MFC SCRAPER] Navigating to page...');
    
    // Navigate with proper wait conditions
    await page.goto(url, { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    
    console.log('[MFC SCRAPER] Page loaded, waiting for content...');
    
    // Wait a bit for any dynamic content
    await page.waitForTimeout(2000);
    
    // Check if we hit a Cloudflare challenge
    const pageTitle = await page.title();
    const bodyText = await page.evaluate(() => document.body.innerText);
    
    if (pageTitle.includes('Just a moment') || bodyText.includes('Just a moment')) {
      console.log('[MFC SCRAPER] Detected Cloudflare challenge, waiting...');
      
      // Wait for the challenge to complete
      await page.waitForFunction(
        () => !document.body.innerText.includes('Just a moment'),
        { timeout: 15000 }
      ).catch(() => {
        console.log('[MFC SCRAPER] Cloudflare challenge timeout - proceeding anyway');
      });
      
      // Wait a bit more after challenge completion
      await page.waitForTimeout(3000);
    }
    
    console.log('[MFC SCRAPER] Extracting data...');
    
    // Extract data using page.evaluate
    const scrapedData = await page.evaluate(() => {
      const data: any = {};
      
      try {
        // Try to find image
        const imageElement = document.querySelector('.item-picture .main img') as HTMLImageElement;
        if (imageElement && imageElement.src) {
          data.imageUrl = imageElement.src;
        }
        
        // Try to find manufacturer
        const manufacturerSpan = document.querySelector('span[switch]') as HTMLElement;
        if (manufacturerSpan && manufacturerSpan.textContent) {
          data.manufacturer = manufacturerSpan.textContent.trim();
        }
        
        // Try to find name (second span with switch)
        const nameSpans = document.querySelectorAll('span[switch]');
        if (nameSpans.length > 1) {
          const nameSpan = nameSpans[1] as HTMLElement;
          if (nameSpan && nameSpan.textContent) {
            data.name = nameSpan.textContent.trim();
          }
        }
        
        // Try to find scale
        const scaleElement = document.querySelector('.item-scale a[title="Scale"]') as HTMLElement;
        if (scaleElement && scaleElement.textContent) {
          data.scale = scaleElement.textContent.trim();
        }
        
        // Debug: Log what we found
        console.log('Extracted data:', data);
        
      } catch (extractError) {
        console.error('Error during data extraction:', extractError);
      }
      
      return data;
    });
    
    console.log('[MFC SCRAPER] Extraction completed:', scrapedData);
    
    return scrapedData;
    
  } catch (error: any) {
    console.error(`[MFC SCRAPER] Error: ${error.message}`);
    throw error;
  } finally {
    if (page) {
      await page.close();
      console.log('[MFC SCRAPER] Page closed');
    }
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[MFC SCRAPER] Received SIGTERM, closing browser...');
  await BrowserManager.closeBrowser();
});

process.on('SIGINT', async () => {
  console.log('[MFC SCRAPER] Received SIGINT, closing browser...');
  await BrowserManager.closeBrowser();
});