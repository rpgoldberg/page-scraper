// Mock for puppeteer-extra-plugin-stealth
// This is a simple mock that returns a no-op plugin

export default function StealthPlugin() {
  return {
    name: 'stealth',
    requirements: new Set(['headful', 'launch']),
    onBrowser: () => {},
    onPageCreated: () => {},
  };
}
