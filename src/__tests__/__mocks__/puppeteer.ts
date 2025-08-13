// Enhanced Puppeteer Mock Infrastructure
import { jest } from '@jest/globals';

// Comprehensive Type Definitions
interface MockBrowserContext {
  browser: MockBrowser;
  pages: MockPage[];
}

interface MockElementHandle {
  evaluate: jest.Mock;
  click: jest.Mock;
  type: jest.Mock;
  querySelector: jest.Mock;
}

interface MockPage {
  goto: jest.Mock;
  content: jest.Mock;
  title: jest.Mock;
  screenshot: jest.Mock;
  evaluate: jest.Mock;
  waitForSelector: jest.Mock;
  $: jest.Mock;
  $$: jest.Mock;
  close: jest.Mock;
  setViewport: jest.Mock;
  setUserAgent: jest.Mock;
  setExtraHTTPHeaders: jest.Mock;
  waitForFunction: jest.Mock;
  waitForTimeout: jest.Mock;
  on: jest.Mock;
}

interface MockBrowser {
  newPage: jest.Mock;
  close: jest.Mock;
  createIncognitoBrowserContext: jest.Mock;
}

// Comprehensive Mock Implementation
export const createMockElementHandle = (): MockElementHandle => ({
  evaluate: jest.fn().mockResolvedValue(null),
  click: jest.fn().mockResolvedValue(undefined),
  type: jest.fn().mockResolvedValue(undefined),
  querySelector: jest.fn().mockResolvedValue(null),
});

export const createMockPage = (): MockPage => ({
  goto: jest.fn().mockResolvedValue({ status: () => 200 }),
  content: jest.fn().mockResolvedValue('<html><body>Mock HTML Content</body></html>'),
  title: jest.fn().mockResolvedValue('Mock Page Title'),
  screenshot: jest.fn().mockResolvedValue(Buffer.from('screenshot')),
  evaluate: jest.fn().mockResolvedValue({}),
  waitForSelector: jest.fn().mockResolvedValue(createMockElementHandle()),
  $: jest.fn().mockResolvedValue(createMockElementHandle()),
  $$: jest.fn().mockResolvedValue([createMockElementHandle()]),
  close: jest.fn().mockResolvedValue(undefined),
  setViewport: jest.fn().mockResolvedValue(undefined),
  setUserAgent: jest.fn().mockResolvedValue(undefined),
  setExtraHTTPHeaders: jest.fn().mockResolvedValue(undefined),
  waitForFunction: jest.fn().mockResolvedValue(undefined),
  waitForTimeout: jest.fn().mockResolvedValue(undefined),
  on: jest.fn().mockReturnThis(),
});

export const createMockBrowser = (): MockBrowser => ({
  newPage: jest.fn().mockResolvedValue(createMockPage()),
  close: jest.fn().mockResolvedValue(undefined),
  createIncognitoBrowserContext: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue(createMockPage()),
  }),
});

// Puppeteer Mock Module
const mockPuppeteer = {
  launch: jest.fn().mockImplementation(() => {
    const browser = createMockBrowser();
    return Promise.resolve(browser);
  }),
  defaultViewport: null,
  connect: jest.fn(),
  
  // Static type compatibility
  Browser: jest.fn(),
  Page: jest.fn(),
};

export default mockPuppeteer;

// Utility for resetting all mocks
export const resetAllMocks = () => {
  Object.values(mockPuppeteer).forEach(mock => {
    if (typeof mock === 'function' && mock.mockReset) {
      mock.mockReset();
    }
  });
};