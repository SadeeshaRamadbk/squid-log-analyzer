const { chromium } = require('playwright');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const viewports = [
  { name: 'Narrow (~768px)', width: 768, height: 1024 },
  { name: 'Laptop (1366x768)', width: 1366, height: 768 },
  { name: 'Desktop (1920x1080)', width: 1920, height: 1080 },
];

async function verifyViewports() {
  console.log('Testing responsive viewports and horizontal reflow...');
  const browser = await chromium.launch({ headless: true });

  for (const vp of viewports) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();

    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.evaluate(async () => {
      await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'Rama@123' }),
      });
    });

    const routes = ['/?view=squid', '/softflowd', '/?view=split', '/syslog'];
    for (const route of routes) {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);

      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      console.log(`[${vp.name}] ${route}: Horizontal page overflow = ${hasHorizontalScroll ? 'YES (FAIL)' : 'NO (PASS)'}`);
    }
    await context.close();
  }

  await browser.close();
  console.log('Viewport responsiveness checks complete.\n');
}

verifyViewports().catch((e) => {
  console.error(e);
  process.exit(1);
});
