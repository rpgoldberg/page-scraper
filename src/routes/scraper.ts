import express from 'express';
import { scrapeMFC, scrapeGeneric, SITE_CONFIGS, ScrapeConfig, BrowserPool } from '../services/genericScraper';

const router = express.Router();

// Generic scraping endpoint
router.post('/scrape', async (req, res) => {
  console.log('[SCRAPER API] Received generic scrape request');
  
  try {
    const { url, config } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'URL is required'
      });
    }
    
    if (!config) {
      return res.status(400).json({
        success: false,
        message: 'Config is required for generic scraping'
      });
    }
    
    // Validate URL format
    try {
      new URL(url);
    } catch (urlError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid URL format'
      });
    }
    
    console.log(`[SCRAPER API] Processing generic URL: ${url}`);
    console.log(`[SCRAPER API] Using config:`, config);
    
    const scrapedData = await scrapeGeneric(url, config);
    
    console.log('[SCRAPER API] Generic scraping completed:', scrapedData);
    
    res.json({
      success: true,
      data: scrapedData
    });
    
  } catch (error: any) {
    console.error('[SCRAPER API] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Scraping failed',
      error: error.message
    });
  }
});

// MFC-specific endpoint (convenience wrapper)
router.post('/scrape/mfc', async (req, res) => {
  console.log('[SCRAPER API] Received MFC scrape request');
  
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'URL is required'
      });
    }
    
    // Validate URL format
    try {
      new URL(url);
    } catch (urlError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid URL format'
      });
    }
    
    // Check if it's an MFC URL
    if (!url.includes('myfigurecollection.net')) {
      return res.status(400).json({
        success: false,
        message: 'URL must be from myfigurecollection.net'
      });
    }
    
    console.log(`[SCRAPER API] Processing MFC URL: ${url}`);
    
    const scrapedData = await scrapeMFC(url);
    
    console.log('[SCRAPER API] MFC scraping completed:', scrapedData);
    
    res.json({
      success: true,
      data: scrapedData
    });
    
  } catch (error: any) {
    console.error('[SCRAPER API] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Scraping failed',
      error: error.message
    });
  }
});

// Get available site configurations
router.get('/configs', (req, res) => {
  console.log('[SCRAPER API] Received configs request');
  
  res.json({
    success: true,
    data: SITE_CONFIGS
  });
});

// Only expose reset endpoint in non-production environments
if (process.env.NODE_ENV !== 'production') {
  // Browser pool reset endpoint (for testing only)
  // Protected with admin-only authentication
  router.post('/reset-pool', async (req, res) => {
    console.log('[SCRAPER API] Reset pool request received');
    
    // Require admin token for authentication
    const adminToken = req.header('x-admin-token');
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      console.log('[SCRAPER API] Unauthorized reset attempt');
      return res.status(403).json({
        success: false,
        message: 'Forbidden'
      });
    }
    
    console.log('[SCRAPER API] Authorized - resetting browser pool');
    
    try {
      await BrowserPool.reset();
      
      res.json({
        success: true,
        message: 'Browser pool reset successfully'
      });
    } catch (error: any) {
      console.error('[SCRAPER API] Error resetting pool:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reset browser pool'
      });
    }
  });
}

export default router;