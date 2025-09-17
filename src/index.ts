import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import scraperRoutes from './routes/scraper';
import * as packageJson from '../package.json';

dotenv.config();

// Import browser pool functionality
import { initializeBrowserPool } from './services/genericScraper';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoints
const healthResponse = () => ({ 
  status: 'healthy', 
  service: 'page-scraper',
  timestamp: new Date().toISOString()
});

// Root endpoint for health checks (Docker health checks hit this)
app.get('/', (req, res) => {
  res.json(healthResponse());
});

app.get('/health', (req, res) => {
  res.json(healthResponse());
});

// Version endpoint
app.get('/version', (req, res) => {
  res.json({
    name: 'page-scraper',
    version: packageJson.version,
    status: 'ok'
  });
});

// Scraper routes (no /api prefix for consistency)
app.use('/', scraperRoutes);

// Version registration with version manager
const registerWithVersionManager = async () => {
  const versionManagerPort = process.env.VERSION_MANAGER_PORT || '3001';
  const versionManagerHost = process.env.VERSION_MANAGER_HOST || 'version-manager';
  const versionManagerUrl = process.env.VERSION_MANAGER_URL || `http://${versionManagerHost}:${versionManagerPort}`;

  console.log('[PAGE-SCRAPER DEBUG] Registration attempt:');
  console.log('[PAGE-SCRAPER DEBUG] VERSION_MANAGER_URL:', versionManagerUrl);
  console.log('[PAGE-SCRAPER DEBUG] SERVICE_AUTH_TOKEN present:', !!process.env.SERVICE_AUTH_TOKEN);

  const registrationData = {
    serviceId: 'page-scraper',
    name: 'Page Scraper Service',
    version: packageJson.version,
    endpoints: {
      health: `http://page-scraper:${PORT}/health`,
      version: `http://page-scraper:${PORT}/version`,
      scrape: `http://page-scraper:${PORT}/scrape`,
      scrapeMfc: `http://page-scraper:${PORT}/scrape/mfc`,
      configs: `http://page-scraper:${PORT}/configs`
    },
    dependencies: {
      // Page scraper typically has no direct service dependencies
      // It can work standalone but may be called by backend
    }
  };

  try {
    const serviceAuthToken = process.env.SERVICE_AUTH_TOKEN;
    if (!serviceAuthToken) {
      console.warn('[PAGE-SCRAPER] SERVICE_AUTH_TOKEN not configured - skipping registration');
      return;
    }

    console.log('[PAGE-SCRAPER DEBUG] Attempting registration to:', `${versionManagerUrl}/services/register`);
    console.log('[PAGE-SCRAPER DEBUG] Registration data:', JSON.stringify(registrationData, null, 2));

    const response = await fetch(`${versionManagerUrl}/services/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceAuthToken}`
      },
      body: JSON.stringify(registrationData)
    });

    console.log('[PAGE-SCRAPER DEBUG] Registration response status:', response.status);
    if (response.ok) {
      const result = await response.json();
      console.log(`[PAGE-SCRAPER] Successfully registered with version manager:`, result.service);
    } else {
      const error = await response.text();
      console.warn(`[PAGE-SCRAPER] Failed to register with version manager: ${response.status} - ${error}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[PAGE-SCRAPER] Version manager registration failed:', errorMessage);
    console.error('[PAGE-SCRAPER DEBUG] Full error details:', error);
    if (error instanceof Error) {
      console.error('[PAGE-SCRAPER DEBUG] Error stack:', error.stack);
    }
    console.warn('[PAGE-SCRAPER] Service will continue without version manager registration');
  }
};

// Start server and initialize browser pool
app.listen(PORT, async () => {
  console.log(`[PAGE-SCRAPER] Server running on port ${PORT}`);
  console.log(`[PAGE-SCRAPER] Health check: http://localhost:${PORT}/health`);
  
  // Initialize browser pool in background
  console.log('[PAGE-SCRAPER] Initializing browser pool...');
  try {
    await initializeBrowserPool();
    console.log('[PAGE-SCRAPER] Browser pool ready!');
  } catch (error) {
    console.error('[PAGE-SCRAPER] Failed to initialize browser pool:', error);
  }

  // Register with version manager
  console.log('[PAGE-SCRAPER] Registering with version manager...');
  await registerWithVersionManager();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[PAGE-SCRAPER] Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[PAGE-SCRAPER] Received SIGINT, shutting down gracefully');
  process.exit(0);
});

// Export app for testing
export default app;