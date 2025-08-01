import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import scraperRoutes from './routes/scraper';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'figure-scraper',
    timestamp: new Date().toISOString()
  });
});

// Scraper routes
app.use('/api', scraperRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`[SCRAPER] Server running on port ${PORT}`);
  console.log(`[SCRAPER] Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[SCRAPER] Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[SCRAPER] Received SIGINT, shutting down gracefully');
  process.exit(0);
});