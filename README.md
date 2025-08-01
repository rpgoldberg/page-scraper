# Figure Scraper Service

A dedicated microservice for scraping figure data from MyFigureCollection.net, designed to bypass Cloudflare protection using Puppeteer browser automation.

## Features

- **Cloudflare Bypass**: Uses real Chromium browser to appear as legitimate user
- **Browser Pooling**: Maintains persistent browser instance for performance
- **Robust Error Handling**: Handles timeouts, challenges, and extraction failures
- **RESTful API**: Simple HTTP interface for integration
- **Docker Ready**: Optimized container with all browser dependencies

## API Endpoints

### POST /api/scrape/mfc
Scrapes figure data from MyFigureCollection URL.

**Request Body:**
```json
{
  "url": "https://myfigurecollection.net/item/597971"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "imageUrl": "https://images.goodsmile.info/...",
    "manufacturer": "Good Smile Company",
    "name": "Nendoroid Hatsune Miku",
    "scale": "1/1"
  }
}
```

### GET /health
Health check endpoint for monitoring.

## Deployment

### Docker
```bash
docker build -t figure-scraper .
docker run -p 3000:3000 figure-scraper
```

### Environment Variables
- `PORT`: Server port (default: 3000)

## Integration

Update your main application to call this service instead of direct scraping:

```javascript
const response = await fetch('http://figure-scraper:3000/api/scrape/mfc', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: mfcLink })
});
```

## Architecture

This service runs separately from your main application to:
- Isolate browser automation resource usage
- Prevent main app crashes from scraping failures  
- Allow independent scaling and updates
- Provide better browser fingerprinting

## Performance

- Browser instance reuse for faster subsequent requests
- Optimized Chrome flags for container environments
- Graceful shutdown handling
- Memory and CPU optimized for Coolify deployment