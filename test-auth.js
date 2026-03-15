const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:3000';

async function testAuth() {
  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome'
  });
  const page = await browser.newPage();

  try {
    // Test registration
    console.log('=== Testing Registration ===');
    await page.goto(`${BASE_URL}/register`);
    await page.waitForLoadState('networkidle');

    const email = `player${Date.now()}@test.com`;

    await page.fill('input[type="text"]', 'TestUser');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"] >> nth=0', 'test123456');
    await page.fill('input[type="password"] >> nth=1', 'test123456');

    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    console.log('URL after register:', page.url());
    const regText = await page.textContent('body');
    console.log('Registration success:', page.url().includes('login') || regText.includes('成功'));

    await page.screenshot({ path: 'register.png' });

    // Test login
    console.log('\n=== Testing Login ===');
    await page.waitForSelector('input[type="email"]');

    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', 'test123456');

    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    console.log('URL after login:', page.url());
    const loginText = await page.textContent('body');
    console.log('Login success:', loginText.includes('欢迎') || loginText.includes(email));

    await page.screenshot({ path: 'login.png' });

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
}

testAuth();
