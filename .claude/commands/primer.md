## Page Scraper Service Primer

**Initialize as SCRAPER SERVICE ORCHESTRATOR.**

### Quick Service Scan
```bash
# Health check
test -f src/index.ts && echo "✓ Service entry"
test -f package.json && echo "✓ Dependencies"
test -d src/services && echo "✓ Scraping logic"
test -d src/routes && echo "✓ API routes"
```

### Architecture Load
- **Port**: 3000
- **Stack**: TypeScript/Puppeteer
- **Strategy**: Browser pool
- **Target**: Web extraction

### Component Map
```
src/
├── services/      # Scraping logic
│   ├── genericScraper.ts
│   └── browserPool.ts
├── routes/        # API endpoints
└── __tests__/     # Test suites
```

### Your Agents (Sonnet)
- scraper-automation-expert → Puppeteer scripts
- scraper-data-extractor → HTML parsing
- scraper-resilience-engineer → Error recovery
- scraper-test-architect → Mock testing

### API Endpoints
- `/scrape` → Generic extraction
- `/health` → Service status
- `/version` → Service info

### Test Commands
```bash
npm test              # All tests
npm run test:unit     # Unit tests
npm run test:perf     # Performance
npm run coverage      # Coverage
```

### Integration Points
- Backend → Data submission
- Version Manager → Registration
- Browser Pool → Resource management

### Status Protocol
Report to master orchestrator:
```
SERVICE: scraper
TASK: [current]
STATUS: [state]
TESTS: [pass/total]
REGRESSION: [zero|detected]
```

**Ready. Zero regression mandate active.**