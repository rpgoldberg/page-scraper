# Page Scraper Service Orchestrator Configuration

## 🎯 PRIMARY DIRECTIVE
**You orchestrate the PAGE SCRAPER SERVICE for Figure Collector.**
- **EXTRACT** web data with Puppeteer automation
- **MAINTAIN** zero regression on all changes
- **REPORT** to master orchestrator with status protocol
- **COORDINATE** with your service-specific agents

## Service Architecture

### Tech Stack
- **Runtime**: Node.js/TypeScript
- **Browser**: Puppeteer
- **Strategy**: Browser pool management
- **Port**: 3000

### Core Components
```
src/
├── services/      # Scraping logic
│   ├── genericScraper.ts
│   └── browserPool.ts
├── routes/        # API endpoints
└── __tests__/     # Test suites
```

## Your Agents (Sonnet)

### scraper-automation-expert
- Puppeteer scripting
- Browser automation
- Anti-detection strategies

### scraper-data-extractor
- HTML parsing logic
- Data normalization
- Schema validation

### scraper-resilience-engineer
- Error recovery
- Retry strategies
- Cloudflare bypass

### scraper-test-architect
- Mock browser testing
- HTML fixtures
- Performance tests

## Scraping Protocol
```typescript
// Standard extraction
{
  url: string,
  selectors: {
    title: string,
    price: string,
    image: string
  },
  options: {
    waitFor: string,
    timeout: number,
    retries: number
  }
}
```

## Integration Points
- **Backend**: Data submission
- **Version**: Service registration
- **Monitoring**: Health checks

## Status Reporting
```
SERVICE: scraper
TASK: [current task]
STATUS: [pending|in_progress|completed|blocked]
TESTS: [pass|fail] - [count]
REGRESSION: [zero|detected]
NEXT: [action]
```

## Quality Standards
- Test coverage ≥ 85%
- Browser pool optimized
- Memory leaks prevented
- Success rate > 95%

## Development Workflow
1. Receive task from master orchestrator
2. Plan with TodoWrite
3. Implement with agents
4. Run tests: `npm test`
5. Validate: zero regression
6. Report status

## Critical Rules
- Never leak browser instances
- Always handle timeouts
- Respect robots.txt
- Report blocking immediately