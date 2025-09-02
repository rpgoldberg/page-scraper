# Page Scraper Service Claude Configuration

## Technology Stack
- TypeScript
- Puppeteer
- Jest for Testing
- Web Scraping & Browser Automation

## Service-Specific Testing Approaches

### Testing Configurations
- Puppeteer mocking for browser interactions
- Comprehensive error handling tests
- Performance and reliability testing
- Cloudflare detection strategies

### Test Modes
- Unit Tests: Individual scraping logic
- Integration Tests: Web interaction workflows
- Performance Tests: Scraping efficiency
- Error Handling Tests: Resilience scenarios

## Development Workflow

### Key Development Commands
- `npm run dev`: Start development server
- `npm run test`: Run all tests
- `npm run test:unit`: Run unit tests
- `npm run test:integration`: Run integration tests
- `npm run test:performance`: Run performance tests
- `npm run lint`: Run TypeScript linter

## Available Sub-Agents

### Atomic Task Agents (Haiku Model)
- **`test-generator-scraper`**: Jest + Puppeteer mock test generation
  - Browser automation testing with mocked Puppeteer
  - HTML fixture-based scraping tests
  - Error handling and resilience testing
  - Performance and memory usage validation
  
- **`documentation-manager`**: Documentation synchronization specialist
  - Updates README and API docs after code changes
  - Maintains documentation accuracy
  - Synchronizes docs with code modifications
  
- **`validation-gates`**: Testing and validation specialist
  - Runs comprehensive test suites
  - Validates code quality gates
  - Iterates on fixes until all tests pass
  - Ensures production readiness

## Agent Invocation Instructions

### Manual Orchestration Pattern (Required)
Use TodoWrite to plan tasks, then call sub-agents directly with proper Haiku configuration:

```
Task:
subagent_type: test-generator-scraper
description: Generate comprehensive scraper tests
prompt:
MODEL_OVERRIDE: claude-3-haiku-20240307
AGENT_MODEL: haiku

ATOMIC TASK: Create comprehensive Jest test suite for web scraping service

REQUIREMENTS:
- Generate tests for all scraping functions
- Mock Puppeteer browser interactions
- Test error handling and edge cases
- Achieve >85% code coverage
- Follow existing test patterns

Start with: I am using claude-3-haiku-20240307 to generate comprehensive tests for scraping service.
```

### Post-Implementation Validation
Always call validation-gates after implementing features:

```
Task:
subagent_type: validation-gates
description: Validate scraper implementation
prompt:
MODEL_OVERRIDE: claude-3-haiku-20240307
AGENT_MODEL: haiku

ATOMIC TASK: Validate all tests pass and quality gates are met

FEATURES IMPLEMENTED: [Specify what was implemented]
VALIDATION NEEDED: Run test suite, check coverage, ensure quality

Start with: I am using claude-3-haiku-20240307 to validate implementation quality.
```

### Documentation Updates
Call documentation-manager after code changes:

```
Task:
subagent_type: documentation-manager  
description: Update documentation after changes
prompt:
MODEL_OVERRIDE: claude-3-haiku-20240307
AGENT_MODEL: haiku

ATOMIC TASK: Synchronize documentation with code changes

FILES CHANGED: [List of modified files]
CHANGES MADE: [Brief description of changes]

Start with: I am using claude-3-haiku-20240307 to update documentation.
```

## Scraping Test Example
```typescript
describe('Generic Web Scraper', () => {
  it('handles Cloudflare protection', async () => {
    const mockBrowser = await mockPuppeteerBrowser();
    const scraper = new GenericScraper(mockBrowser);
    
    const result = await scraper.scrape('test-url');
    expect(result).toHaveProperty('data');
    expect(result.status).toBe('success');
  });
});
```

## Atomic Task Principles
- Isolate scraping logic in atomic tests
- Mock external web resources
- Test edge cases and error scenarios
- Validate scraping performance
- Ensure robust browser interaction handling

## File Structure

```
.claude/
├── agents/
│   ├── test-generator-scraper.md
│   ├── documentation-manager.md
│   └── validation-gates.md
└── commands/
    └── primer.md
```

## Quality Assurance Workflow

1. **Implementation**: Write code changes
2. **Testing**: Call `test-generator-scraper` if new tests needed
3. **Validation**: Call `validation-gates` to ensure quality
4. **Documentation**: Call `documentation-manager` to update docs
5. **Verification**: Confirm all tests pass and docs are current