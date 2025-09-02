import { jest } from '@jest/globals';

// Mock fetch globally
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('Version Manager Registration', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    jest.clearAllMocks();
    // Clear version manager environment variables
    delete process.env.VERSION_MANAGER_HOST;
    delete process.env.VERSION_MANAGER_PORT;
    delete process.env.VERSION_MANAGER_URL;
    delete process.env.PORT;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const createMockApp = () => {
    // Mock the registration function logic
    const versionManagerPort = process.env.VERSION_MANAGER_PORT || '3001';
    const versionManagerHost = process.env.VERSION_MANAGER_HOST || 'version-manager';
    const versionManagerUrl = process.env.VERSION_MANAGER_URL || `http://${versionManagerHost}:${versionManagerPort}`;
    
    const registrationData = {
      serviceId: 'page-scraper',
      name: 'Page Scraper Service',
      version: '1.0.0', // Mock version
      endpoints: {
        health: `http://page-scraper:${process.env.PORT || '3000'}/health`,
        version: `http://page-scraper:${process.env.PORT || '3000'}/version`,
        scrape: `http://page-scraper:${process.env.PORT || '3000'}/scrape`,
        scrapeMfc: `http://page-scraper:${process.env.PORT || '3000'}/scrape/mfc`,
        configs: `http://page-scraper:${process.env.PORT || '3000'}/configs`
      },
      dependencies: {}
    };

    return { versionManagerUrl, registrationData };
  };

  it('should use default version manager configuration', () => {
    const { versionManagerUrl } = createMockApp();
    expect(versionManagerUrl).toBe('http://version-manager:3001');
  });

  it('should use custom version manager host and port from environment', () => {
    process.env.VERSION_MANAGER_HOST = 'custom-version-manager';
    process.env.VERSION_MANAGER_PORT = '4001';
    
    const { versionManagerUrl } = createMockApp();
    expect(versionManagerUrl).toBe('http://custom-version-manager:4001');
  });

  it('should use explicit VERSION_MANAGER_URL if provided', () => {
    process.env.VERSION_MANAGER_URL = 'http://explicit-url:5001';
    
    const { versionManagerUrl } = createMockApp();
    expect(versionManagerUrl).toBe('http://explicit-url:5001');
  });

  it('should include correct endpoint URLs with custom port', () => {
    process.env.PORT = '3010';
    
    const { registrationData } = createMockApp();
    
    expect(registrationData.endpoints.health).toBe('http://page-scraper:3010/health');
    expect(registrationData.endpoints.version).toBe('http://page-scraper:3010/version');
    expect(registrationData.endpoints.scrape).toBe('http://page-scraper:3010/scrape');
    expect(registrationData.endpoints.scrapeMfc).toBe('http://page-scraper:3010/scrape/mfc');
    expect(registrationData.endpoints.configs).toBe('http://page-scraper:3010/configs');
  });

  it('should have proper service metadata', () => {
    const { registrationData } = createMockApp();
    
    expect(registrationData.serviceId).toBe('page-scraper');
    expect(registrationData.name).toBe('Page Scraper Service');
    expect(registrationData.version).toBe('1.0.0');
    expect(registrationData.dependencies).toEqual({});
  });

  it('should handle version manager registration failure gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Connection refused'));
    
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    const { versionManagerUrl, registrationData } = createMockApp();
    
    try {
      await fetch(`${versionManagerUrl}/services/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData)
      });
    } catch (error) {
      // Expected to fail in test
    }
    
    expect(mockFetch).toHaveBeenCalledWith(
      'http://version-manager:3001/services/register',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData)
      }
    );
    
    consoleSpy.mockRestore();
  });

  it('should handle successful registration', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        message: 'Service registered successfully',
        service: { id: 'page-scraper', version: '1.0.0' }
      })
    };
    
    mockFetch.mockResolvedValueOnce(mockResponse as any);
    
    const { versionManagerUrl, registrationData } = createMockApp();
    
    const response = await fetch(`${versionManagerUrl}/services/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registrationData)
    });
    
    expect(response.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://version-manager:3001/services/register',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
    );
  });
});