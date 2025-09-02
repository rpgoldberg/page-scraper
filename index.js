"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const scraper_1 = __importDefault(require("./routes/scraper"));
const packageJson = __importStar(require("../package.json"));
dotenv_1.default.config();
// Import browser pool functionality
const genericScraper_1 = require("./services/genericScraper");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Health check endpoints
const healthResponse = () => ({
    status: 'healthy',
    service: 'page-scraper',
    timestamp: new Date().toISOString()
});
// Root endpoint for health checks (Docker health checks hit this)
app.get('/', (req, res) => {
    res.json(healthResponse());
});
app.get('/health', (req, res) => {
    res.json(healthResponse());
});
// Version endpoint
app.get('/version', (req, res) => {
    res.json({
        name: 'page-scraper',
        version: packageJson.version,
        status: 'ok'
    });
});
// Scraper routes (no /api prefix for consistency)
app.use('/', scraper_1.default);
// Version registration with version manager
const registerWithVersionManager = async () => {
    const versionManagerPort = process.env.VERSION_MANAGER_PORT || '3001';
    const versionManagerHost = process.env.VERSION_MANAGER_HOST || 'version-manager';
    const versionManagerUrl = process.env.VERSION_MANAGER_URL || `http://${versionManagerHost}:${versionManagerPort}`;
    const registrationData = {
        serviceId: 'page-scraper',
        name: 'Page Scraper Service',
        version: packageJson.version,
        endpoints: {
            health: `http://page-scraper:${PORT}/health`,
            version: `http://page-scraper:${PORT}/version`,
            scrape: `http://page-scraper:${PORT}/scrape`,
            scrapeMfc: `http://page-scraper:${PORT}/scrape/mfc`,
            configs: `http://page-scraper:${PORT}/configs`
        },
        dependencies: {
        // Page scraper typically has no direct service dependencies
        // It can work standalone but may be called by backend
        }
    };
    try {
        const response = await fetch(`${versionManagerUrl}/services/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(registrationData)
        });
        if (response.ok) {
            const result = await response.json();
            console.log(`[PAGE-SCRAPER] Successfully registered with version manager:`, result.service);
        }
        else {
            const error = await response.text();
            console.warn(`[PAGE-SCRAPER] Failed to register with version manager: ${response.status} - ${error}`);
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`[PAGE-SCRAPER] Version manager registration failed:`, errorMessage);
        console.warn(`[PAGE-SCRAPER] Service will continue without version manager registration`);
    }
};
// Start server and initialize browser pool
app.listen(PORT, async () => {
    console.log(`[PAGE-SCRAPER] Server running on port ${PORT}`);
    console.log(`[PAGE-SCRAPER] Health check: http://localhost:${PORT}/health`);
    // Initialize browser pool in background
    console.log('[PAGE-SCRAPER] Initializing browser pool...');
    try {
        await (0, genericScraper_1.initializeBrowserPool)();
        console.log('[PAGE-SCRAPER] Browser pool ready!');
    }
    catch (error) {
        console.error('[PAGE-SCRAPER] Failed to initialize browser pool:', error);
    }
    // Register with version manager
    console.log('[PAGE-SCRAPER] Registering with version manager...');
    await registerWithVersionManager();
});
// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('[PAGE-SCRAPER] Received SIGTERM, shutting down gracefully');
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log('[PAGE-SCRAPER] Received SIGINT, shutting down gracefully');
    process.exit(0);
});
// Export app for testing
exports.default = app;
//# sourceMappingURL=index.js.map