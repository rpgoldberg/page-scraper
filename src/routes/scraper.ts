import express from 'express';
import { scrapeMFC } from '../services/mfcScraper';

const router = express.Router();

// Scrape MFC data endpoint
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
    
    console.log(`[SCRAPER API] Processing URL: ${url}`);
    
    const scrapedData = await scrapeMFC(url);
    
    console.log('[SCRAPER API] Scraping completed:', scrapedData);
    
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

export default router;