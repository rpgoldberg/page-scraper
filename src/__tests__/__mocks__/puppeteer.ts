// Mock Puppeteer for unit tests
import { jest } from '@jest/globals';

export const mockPage = {
  setViewport: jest.fn().mockResolvedValue(undefined),
  setUserAgent: jest.fn().mockResolvedValue(undefined),
  setExtraHTTPHeaders: jest.fn().mockResolvedValue(undefined),
  goto: jest.fn().mockResolvedValue(undefined),
  title: jest.fn().mockResolvedValue('Test Page Title'),
  evaluate: jest.fn().mockResolvedValue({}),
  waitForFunction: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined),
};

export const mockBrowser = {
  newPage: jest.fn().mockResolvedValue(mockPage),
  close: jest.fn().mockResolvedValue(undefined),
};

const mockPuppeteer = {
  launch: jest.fn().mockResolvedValue(mockBrowser),
  Browser: jest.fn(),
  Page: jest.fn(),
};

export default mockPuppeteer;