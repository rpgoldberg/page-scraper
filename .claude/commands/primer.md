## Page Scraper Service Primer Command

**IMPORTANT**: This is the page-scraper service - a Puppeteer/TypeScript web scraping service for collecting figure data from external sources.

### Step 1: Service Configuration
1. Read `CLAUDE.md` for service-specific configuration and agent instructions
2. Understand this service's role as the data collection layer for the Figure Collector application

### Step 2: Service Structure Analysis

**Core Scraping Structure**:
- Read `src/index.ts` for Express server setup and scraping API endpoints
- Read `src/routes/scraper.ts` for scraping endpoint definitions and request handling
- Read `src/services/genericScraper.ts` for core scraping logic and browser automation
- Review browser pool management and Puppeteer configuration
- Check data extraction patterns and parsing logic

**Testing Structure**:
- Examine `src/__tests__/` directory for current test coverage patterns
- Review Jest configuration in `jest.config.js`
- Check TypeScript test configuration in `tsconfig.test.json`
- Review Puppeteer mocking and HTML fixtures for testing

**Build and Development**:
- Review `package.json` for dependencies and npm scripts
- Check TypeScript configuration in `tsconfig.json`
- Review Docker configuration in `Dockerfile` and `Dockerfile.test`
- Understand browser automation setup and dependencies

### Step 3: Service Understanding

**Scraping Capabilities**:
- Generic web scraping with configurable selectors
- Browser automation with Puppeteer
- Dynamic content handling and JavaScript execution
- Rate limiting and respectful scraping practices
- Error handling for network issues and bot detection

**Data Extraction**:
- HTML parsing and CSS selector-based extraction
- Image URL collection and validation
- Price and product information extraction
- Metadata collection (titles, descriptions, specifications)
- Data sanitization and validation

**Browser Management**:
- Browser pool for concurrent scraping operations
- Memory management and resource cleanup
- Headless browser configuration
- User agent rotation and stealth techniques
- Crash recovery and error handling

**Integration Points**:
- API endpoints for external scraping requests
- Backend service communication for data submission
- Error reporting and logging systems
- Rate limiting and throttling mechanisms

### Step 4: Available Tools and Agents

**Available Sub-Agents**:
- `test-generator-scraper` (Haiku) - Jest + Puppeteer mock test generation
- `documentation-manager` (Haiku) - Documentation synchronization
- `validation-gates` - Testing and validation specialist

**Development Commands**:
- `npm run dev` - Development server with scraping endpoints
- `npm run build` - TypeScript compilation
- `npm run test` - Jest test execution with Puppeteer mocks
- `npm run test:coverage` - Test coverage reporting
- `npm run lint` - ESLint code linting
- `npm run typecheck` - TypeScript type checking

### Step 5: Summary Report

After analysis, provide:
- **Service Purpose**: Web scraping and data collection for Figure Collector
- **Technology Stack**: Node.js, TypeScript, Puppeteer, Express, Jest
- **Key Functionality**: Web scraping, browser automation, data extraction, API endpoints
- **Scraping Capabilities**: Generic scraping, dynamic content, respectful practices
- **Browser Management**: Puppeteer automation, resource management, error handling
- **Data Processing**: HTML parsing, validation, sanitization, extraction
- **Test Coverage**: Mocked Puppeteer tests, HTML fixtures, error scenarios
- **Integration Points**: Backend communication, API endpoints, error reporting
- **Development Workflow**: Setup, testing, browser automation, and deployment

**Remember**: This service performs web scraping - respect for target websites, rate limiting, and ethical scraping practices are critical considerations for all changes.