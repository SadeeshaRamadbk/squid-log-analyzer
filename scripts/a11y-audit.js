const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function runAudit() {
  console.log('===========================================================');
  console.log(`Starting WCAG 2.2 AA Accessibility Audit at ${BASE_URL}`);
  console.log('===========================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
  });
  const page = await context.newPage();

  // Step 1: Login
  console.log('Logging in as admin...');
  await page.goto(`${BASE_URL}/login`);
  await page.evaluate(async () => {
    await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'Rama@123' }),
    });
  });
  await page.goto(BASE_URL);
  await page.waitForTimeout(1000);

  const targets = [
    { name: 'Squid Proxy View (Dark)', url: `${BASE_URL}/?view=squid`, theme: 'dark' },
    { name: 'Squid Proxy View (Light)', url: `${BASE_URL}/?view=squid`, theme: 'light' },
    { name: 'pfSense NetFlow View (Dark)', url: `${BASE_URL}/softflowd`, theme: 'dark' },
    { name: 'pfSense NetFlow View (Light)', url: `${BASE_URL}/softflowd`, theme: 'light' },
    { name: 'Split View Telemetry (Dark)', url: `${BASE_URL}/?view=split`, theme: 'dark' },
    { name: 'Split View Telemetry (Light)', url: `${BASE_URL}/?view=split`, theme: 'light' },
    { name: 'Syslog Events View (Dark)', url: `${BASE_URL}/syslog`, theme: 'dark' },
    { name: 'Syslog Events View (Light)', url: `${BASE_URL}/syslog`, theme: 'light' },
  ];

  let totalViolations = 0;
  const violationSummary = [];

  for (const target of targets) {
    process.stdout.write(`Auditing ${target.name}... `);
    await page.goto(target.url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);

    // Apply theme
    await page.evaluate((theme) => {
      if (theme === 'light') {
        document.documentElement.classList.add('light-theme');
      } else {
        document.documentElement.classList.remove('light-theme');
      }
    }, target.theme);
    await page.waitForTimeout(300);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    const seriousOrCritical = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    if (seriousOrCritical.length === 0) {
      console.log(`PASS (0 serious/critical violations)`);
    } else {
      console.log(`FAIL (${seriousOrCritical.length} serious/critical violations)`);
      totalViolations += seriousOrCritical.length;
      for (const v of seriousOrCritical) {
        violationSummary.push({
          target: target.name,
          id: v.id,
          impact: v.impact,
          description: v.description,
          nodes: v.nodes.map((n) => n.html).slice(0, 3),
        });
      }
    }
  }

  // Modal test: Keyboard Shortcuts Dialog
  console.log(`\nAuditing Modal: Keyboard Shortcuts Dialog... `);
  await page.goto(`${BASE_URL}/?view=squid`);
  await page.keyboard.press('Shift+Slash'); // '?'
  await page.waitForTimeout(500);

  const modalResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();

  const modalViolations = modalResults.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious'
  );

  if (modalViolations.length === 0) {
    console.log(`PASS (0 serious/critical violations)`);
  } else {
    console.log(`FAIL (${modalViolations.length} serious/critical violations)`);
    totalViolations += modalViolations.length;
    for (const v of modalViolations) {
      violationSummary.push({
        target: 'Keyboard Shortcuts Modal',
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodes: v.nodes.map((n) => n.html).slice(0, 3),
      });
    }
  }

  await browser.close();

  console.log('\n===========================================================');
  if (totalViolations === 0) {
    console.log('SUCCESS: All 4 views and modals passed with 0 serious/critical WCAG 2.2 AA violations!');
    console.log('===========================================================\n');
    process.exit(0);
  } else {
    console.error(`FAILURE: Found ${totalViolations} serious/critical violations:`);
    console.error(JSON.stringify(violationSummary, null, 2));
    console.log('===========================================================\n');
    process.exit(1);
  }
}

runAudit().catch((err) => {
  console.error('Audit encountered an unexpected error:', err);
  process.exit(1);
});
