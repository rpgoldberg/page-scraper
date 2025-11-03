module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/__mocks__/',
    '/__tests__/fixtures/',
    '/__tests__/setup.ts'
  ],
  transform: {
    '^.+\.ts$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.test.json',
      diagnostics: {
        warnOnly: true
      }
    }]
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/utils/logger.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  testTimeout: 30000,
  maxWorkers: 4,
  forceExit: true, // Force Jest to exit after all tests complete

  // Enhanced Puppeteer Mocking
  moduleNameMapper: {
    '^puppeteer$': '<rootDir>/src/__tests__/__mocks__/puppeteer.ts',
    '^puppeteer-extra$': '<rootDir>/src/__tests__/__mocks__/puppeteer.ts',
    '^puppeteer-extra-plugin-stealth$': '<rootDir>/src/__tests__/__mocks__/puppeteer-extra-plugin-stealth.ts'
  },
  
  // Comprehensive Mock Management
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Performance and Stability Enhancements
  bail: false, // Allow all test suites to run even if some fail
  verbose: true,
  

};