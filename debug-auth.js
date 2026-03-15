const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:3000';

async function testAuth() {
  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome'
  });
  const page = await browser.newPage();

  page.on('console', msg => console.log('[CONSOLE]', msg.text()));

  try {
    console.log('=== Testing Registration ===');
    await page.goto(`${BASE_URL}/register`);
    await page.waitForLoadState('networkidle');

    const email = `player${Date.now()}@test.com`;

    await page.fill('input[type="text"]', 'TestUser');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"] >> nth=0', 'test123456');
    await page.fill('input[type="password"] >> nth=1', 'test123456');

    console.log('Clicking submit...');
    await page.click('button[type="submit"]');
    console.log('Clicked, waiting...');
    await page.waitForTimeout(10000);

    console.log('URL:', page.url());
    const html = await page.content();
    console.log('Contains 成功:', html.includes('成功'));
    console.log('Contains 错误:', html.includes('错误'));

    await page.screenshot({ path: 'debug.png' });

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
}

testAuth();
