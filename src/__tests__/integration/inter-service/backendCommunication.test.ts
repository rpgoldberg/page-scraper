import request from 'supertest';
import { app } from '../../../app';
import { createMockDockerContainer } from '../../setup';

describe('Inter-Service Integration: Backend-Scraper Communication', () => {
  let mockDockerContainer: any;

  beforeAll(async () => {
    mockDockerContainer = await createMockDockerContainer();
  });

  afterAll(async () => {
    if (mockDockerContainer) {
      await mockDockerContainer.stop();
    }
  });

  describe('MFC Scraping Endpoint', () => {
    it('should handle valid MFC scrape request from backend', async () => {
      const scrapeMfcPayload = {
        url: 'https://myfigurecollection.net/item/12345',
        type: 'mfc',
        config: {
          timeout: 10000,
          retries: 2
        }
      };

      const response = await request(app)
        .post('/scrape/mfc')
        .send(scrapeMfcPayload)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('manufacturer');
    });

    it('should handle invalid MFC scrape request', async () => {
      const invalidPayload = {
        url: 'invalid-url',
        type: 'mfc'
      };

      const response = await request(app)
        .post('/scrape/mfc')
        .send(invalidPayload)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.success).toBe(false);
    });
  });

  describe('Generic Scraping Endpoint', () => {
    it('should handle custom scraping configuration', async () => {
      const genericScrapePayload = {
        url: 'https://example.com/figure',
        type: 'custom',
        config: {
          selector: '.figure-details',
          attributes: ['name', 'price']
        }
      };

      const response = await request(app)
        .post('/scrape')
        .send(genericScrapePayload)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('Service Health and Versioning', () => {
    it('should return health check information', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('uptime');
    });

    it('should return version information', async () => {
      const response = await request(app)
        .get('/version')
        .expect(200);

      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('buildDate');
    });
  });

  describe('Performance and Concurrency', () => {
    it('should handle concurrent scraping requests', async () => {
      const concurrentRequests = Array(5).fill(null).map(() => 
        request(app)
          .post('/scrape/mfc')
          .send({
            url: 'https://myfigurecollection.net/item/12345',
            type: 'mfc'
          })
      );

      const responses = await Promise.all(concurrentRequests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
      });
    }, 30000); // Increased timeout for concurrent tests
  });
});