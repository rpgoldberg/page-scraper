import express from 'express';
import { scrapeMFC, scrapeGeneric, SITE_CONFIGS, ScrapeConfig } from '../services/genericScraper';

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

export default router;