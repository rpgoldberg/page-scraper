# Page Scraper Service

A generic web page scraping microservice with browser automation, featuring browser pooling and configurable site support. Designed to bypass Cloudflare protection and handle dynamic content. Includes comprehensive test coverage with 163 test cases.

## Features

- **Generic Scraping**: Configurable selectors for any website
- **Browser Pool**: Pre-launched browsers for instant responses (3-5 second scraping vs 15+ seconds)
- **Site Configurations**: Pre-built configs for common sites (MFC, extensible to others)
- **Cloudflare Bypass**: Real Chromium browsers with fresh sessions per request
- **Robust Error Handling**: Handles timeouts, challenges, and extraction failures
- **RESTful API**: Simple HTTP interface with both generic and site-specific endpoints
- **Docker Ready**: Optimized container with all browser dependencies
- **Comprehensive Testing**: 163 test cases with Jest and Puppeteer mocking

## API Endpoints

### POST /scrape
Generic scraping with custom configuration.

**Request Body:**
```json
{
  "url": "https://example.com/item/123",
  "config": {
    "imageSelector": ".product-image img",
    "manufacturerSelector": ".brand-name",
    "nameSelector": ".product-title",
    "scaleSelector": ".scale-info",
    "waitTime": 2000
  }
}
```

### POST /scrape/mfc
Convenience endpoint for MyFigureCollection (uses pre-built config).

**Request Body:**
```json
{
  "url": "https://myfigurecollection.net/item/597971"
}
```

**Response (both endpoints):**
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

### GET /configs
Get available pre-built site configurations.

**Response:**
```json
{
  "success": true,
  "data": {
    "mfc": {
      "imageSelector": ".item-picture .main img",
      "manufacturerSelector": "span[switch]",
      "nameSelector": "span[switch]:nth-of-type(2)",
      "scaleSelector": ".item-scale a[title=\"Scale\"]"
    }
  }
}
```

### GET /health
Health check endpoint for monitoring.

### GET /version
Get service version information for version management.

**Response:**
```json
{
  "name": "page-scraper",
  "version": "1.0.0",
  "status": "healthy"
}
```

## 🧪 Testing

The page-scraper includes comprehensive test coverage with 163 test cases across 7 test suites.

### Test Coverage Overview

- **Total Test Suites**: 7
- **Total Tests**: 163
- **Test Coverage**: >95%
- **Testing Framework**: Jest + TypeScript + Supertest
- **Mocking Strategy**: Complete Puppeteer API mocking

### Test Structure

```
src/__tests__/
├── unit/
│   ├── genericScraper.test.ts      # Core scraping functionality
│   ├── browserPool.test.ts         # Browser pool management
│   ├── puppeteerAutomation.test.ts # Browser automation
│   ├── errorHandling.test.ts       # Error scenarios
│   ├── mfcScraping.test.ts         # MFC-specific tests
│   └── performance.test.ts         # Performance benchmarks
└── integration/
    └── scraperRoutes.test.ts       # API endpoint tests
```

### Test Categories

**Unit Tests (6 suites):**
- **Generic Scraper**: SITE_CONFIGS validation, scraping logic, error handling
- **Browser Pool**: Pool management, concurrency, memory management
- **Puppeteer Automation**: Browser configuration, navigation, data extraction
- **Error Handling**: Network failures, timeouts, resource issues
- **MFC Scraping**: MFC-specific functionality and edge cases
- **Performance**: Response time benchmarks and efficiency tests

**Integration Tests (1 suite):**
- **API Routes**: All HTTP endpoints with various scenarios

### Key Testing Features

**Complete Puppeteer Mocking:**
```typescript
// Mock browser and page instances
const mockBrowser = {
  newPage: jest.fn(),
  close: jest.fn()
};

const mockPage = {
  goto: jest.fn(),
  evaluate: jest.fn(),
  close: jest.fn(),
  setViewport: jest.fn(),
  setUserAgent: jest.fn()
};
```

**Performance Testing:**
```typescript
// Example: Testing response time targets
it('should complete scraping within 5 seconds', async () => {
  const startTime = Date.now();
  await genericScraper.scrape(testUrl, config);
  const duration = Date.now() - startTime;
  expect(duration).toBeLessThan(5000);
});
```

**Error Scenario Testing:**
```typescript
// Example: Testing browser failure handling
it('should handle browser launch failure', async () => {
  mockPuppeteer.launch.mockRejectedValue(new Error('Browser launch failed'));
  
  await expect(browserPool.getBrowser())
    .rejects
    .toThrow('Browser launch failed');
});
```

### Running Tests

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run in watch mode (development)
npm run test:watch

# Run CI tests (no watch)
npm run test:ci

# Run specific test suite
npx jest src/__tests__/unit/genericScraper.test.ts

# Run tests matching pattern
npx jest --testNamePattern="MFC scraping"
```

### Test Configuration

**Jest Configuration (`jest.config.js`):**
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/__tests__/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html']
};
```

### Performance Benchmarks

**Target Metrics:**
- Response Time: 3-5 seconds per scraping operation
- Concurrent Capacity: 10+ simultaneous requests
- Browser Pool Efficiency: <1 second pool operations
- Memory Management: Proper cleanup after each operation

### Mock Test Data

**HTML Fixtures:**
```typescript
const MFC_FIGURE_HTML = `
<div class="item-picture">
  <img src="https://images.goodsmile.info/test.jpg" alt="Test Figure">
</div>
<div class="item-details">
  <span switch="Company">Test Company</span>
  <span switch="Character">Test Character</span>
</div>
`;
```

### CI/CD Integration

```bash
# CI test command
NODE_ENV=test npm run test:ci

# Coverage reporting for CI
NODE_ENV=test npm run test:coverage
```

### Testing Documentation

See `TESTING.md` for comprehensive testing documentation including:
- Complete test strategy and methodology
- Detailed coverage breakdown
- Performance benchmarking
- Mock data and fixtures
- Maintenance guidelines

## Development

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests in development
npm run test:watch
```

### Testing in Development

```bash
# Watch mode for continuous testing
npm run test:watch

# Test specific functionality
npx jest browserPool --watch

# Performance testing
npx jest performance.test.ts
```

## Deployment

### Docker
```bash
docker build -t page-scraper .
# Development (port 3010)
docker run -p 3010:3010 -e PORT=3010 page-scraper
# Test (port 3005)
docker run -p 3005:3005 -e PORT=3005 page-scraper
# Production (port 3000)  
docker run -p 3000:3000 -e PORT=3000 page-scraper
```

### Environment Variables
- `PORT`: Server port (default: 3000, dev: 3010, test: 3005)

## Integration

Update your main application to call this service instead of direct scraping:

```javascript
// MFC scraping (use environment-specific URL)
const scraperUrl = process.env.SCRAPER_SERVICE_URL || 'http://page-scraper:3000';
const response = await fetch(`${scraperUrl}/scrape/mfc`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: mfcLink })
});

// Generic scraping
const response = await fetch(`${scraperUrl}/scrape`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    url: 'https://example.com/item/123',
    config: { imageSelector: '.product img' }
  })
});
```

## Architecture

This service runs separately from your main application to:
- Isolate browser automation resource usage
- Prevent main app crashes from scraping failures  
- Allow independent scaling and updates
- Provide better browser fingerprinting

## Performance

- **Browser Pool**: 3 pre-launched browsers eliminate 2-3 second startup delay
- **Fresh Sessions**: Each request gets clean browser to bypass anti-bot detection
- **Auto-Replenishment**: Pool automatically replaces used browsers in background
- **Optimized Chrome**: Container-optimized flags for minimal resource usage
- **Graceful Shutdown**: Proper browser cleanup on service termination

## Adding New Sites

To add support for a new site, update `SITE_CONFIGS` in `src/services/genericScraper.ts`:

```javascript
export const SITE_CONFIGS = {
  mfc: { /* existing config */ },
  hobbylink: {
    imageSelector: '.product-main-image img',
    manufacturerSelector: '.maker-name',
    nameSelector: '.product-name h1',
    scaleSelector: '.scale-info .value',
    waitTime: 1500
  }
};
```