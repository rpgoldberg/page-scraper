// Global test setup
import { jest } from '@jest/globals';
import { resetAllMocks } from './__mocks__/puppeteer';

// Mock console methods to reduce test noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: console.error, // Keep error for debugging
};

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '0'; // Use random port for tests

// Global test timeout
jest.setTimeout(30000);

// Reset all mocks before each test
beforeEach(() => {
  resetAllMocks();
  jest.clearAllMocks();
});