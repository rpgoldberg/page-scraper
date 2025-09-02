"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const genericScraper_1 = require("../services/genericScraper");
const router = express_1.default.Router();
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
        }
        catch (urlError) {
            return res.status(400).json({
                success: false,
                message: 'Invalid URL format'
            });
        }
        console.log(`[SCRAPER API] Processing generic URL: ${url}`);
        console.log(`[SCRAPER API] Using config:`, config);
        const scrapedData = await (0, genericScraper_1.scrapeGeneric)(url, config);
        console.log('[SCRAPER API] Generic scraping completed:', scrapedData);
        res.json({
            success: true,
            data: scrapedData
        });
    }
    catch (error) {
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
        }
        catch (urlError) {
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
        const scrapedData = await (0, genericScraper_1.scrapeMFC)(url);
        console.log('[SCRAPER API] MFC scraping completed:', scrapedData);
        res.json({
            success: true,
            data: scrapedData
        });
    }
    catch (error) {
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
        data: genericScraper_1.SITE_CONFIGS
    });
});
exports.default = router;
//# sourceMappingURL=scraper.js.map