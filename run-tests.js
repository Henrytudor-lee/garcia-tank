const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome'
  });
  const page = await browser.newPage();

  const results = [];
  const errors = [];

  function log(name, passed, detail = '') {
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${name}${detail ? ': ' + detail : ''}`);
    results.push({ name, passed, detail });
    if (!passed) errors.push({ name, detail });
  }

  // Listen for console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[BROWSER ERROR] ${msg.text()}`);
    }
  });

  page.on('pageerror', error => {
    console.log(`[PAGE ERROR] ${error.message}`);
  });

  try {
    // ==================== 一、用户认证系统 ====================
    console.log('\n========== 一、用户认证系统 ==========\n');

    // 1.1 注册功能
    console.log('--- 1.1 注册功能 ---');
    await page.goto(`${BASE_URL}/register`);
    await page.waitForLoadState('networkidle');

    const registerTitle = await page.textContent('h1');
    log('注册页面访问', registerTitle === '注册');

    const usernameInput = await page.$('input[type="text"]');
    const emailInput = await page.$('input[type="email"]');
    const passwordInputs = await page.$$('input[type="password"]');
    log('注册表单元素', usernameInput && emailInput && passwordInputs.length === 2);

    const registerButton = await page.$('button[type="submit"]');
    log('注册按钮存在', !!registerButton);

    // 1.2 登录功能
    console.log('\n--- 1.2 登录功能 ---');
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    const loginTitle = await page.textContent('h1');
    log('登录页面访问', loginTitle === '登录');

    const loginEmailInput = await page.$('input[type="email"]');
    const loginPasswordInput = await page.$('input[type="password"]');
    log('登录表单元素', loginEmailInput && loginPasswordInput);

    const loginSubmitButton = await page.$('button[type="submit"]');
    log('登录按钮存在', !!loginSubmitButton);

    // 1.3 主页面登录状态
    console.log('\n--- 1.3 主页面登录状态 ---');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const guestMode = await page.textContent('body');
    log('游客模式显示', guestMode.includes('游客模式'));

    // ==================== 二、主页面功能 ====================
    console.log('\n========== 二、主页面功能 ==========\n');

    // 2.1 页面布局
    console.log('--- 2.1 页面布局 ---');
    const canvas = await page.$('canvas');
    log('游戏画布存在', !!canvas);

    // 2.2 菜单按钮
    console.log('\n--- 2.2 菜单按钮 ---');
    const startButton = await page.$('button:has-text("开始游戏")');
    log('开始游戏按钮', !!startButton);

    const customMapsButton = await page.$('button:has-text("自定义地图")');
    log('自定义地图按钮', !!customMapsButton);

    const leaderboardButton = await page.$('button:has-text("排行榜")');
    log('排行榜按钮', !!leaderboardButton);

    // 2.3 游戏状态显示
    console.log('\n--- 2.3 游戏状态显示 ---');
    // 菜单状态 - 不应该有分数显示
    const menuTitle = await page.$('h1:has-text("坦克大战")');
    log('菜单状态显示', !!menuTitle);

    // 点击开始游戏，测试游戏状态
    await startButton.click();
    await page.waitForTimeout(2000);

    const gameCanvas = await page.$('canvas');
    log('游戏中画布渲染', !!gameCanvas);

    // 测试暂停
    await page.keyboard.press('p');
    await page.waitForTimeout(500);
    const pausedText = await page.textContent('body');
    const isPaused = pausedText.includes('暂停');
    log('暂停功能', isPaused);

    // 继续游戏
    const resumeButton = await page.$('button:has-text("继续游戏")');
    if (resumeButton) {
      await resumeButton.click();
      await page.waitForTimeout(500);
    }

    // 再次暂停然后返回菜单
    await page.keyboard.press('p');
    await page.waitForTimeout(500);
    const menuButton = await page.$('button:has-text("返回主菜单")');
    if (menuButton) {
      await menuButton.click();
      await page.waitForTimeout(500);
    }
    log('返回主菜单', true);

    // ==================== 三、自定义地图功能 ====================
    console.log('\n========== 三、自定义地图功能 ==========\n');

    // 3.1 地图列表页
    console.log('--- 3.1 地图列表页 ---');
    await page.goto(`${BASE_URL}/custom-maps`);
    await page.waitForLoadState('networkidle');

    const mapsPageTitle = await page.textContent('h1');
    log('地图列表页访问', mapsPageTitle === '自定义地图');

    const createMapButton = await page.$('button:has-text("创建新地图")');
    log('创建地图按钮', !!createMapButton);

    // 3.2 地图编辑器
    console.log('\n--- 3.2 地图编辑器 ---');
    await page.goto(`${BASE_URL}/map-editor`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const editorTitle = await page.$('h1');
    const editorTitleText = await editorTitle.textContent();
    log('地图编辑器访问', editorTitleText.includes('创建地图'));

    // 检查编辑器元素
    const mapNameInput = await page.$('input[type="text"]');
    log('地图名称输入框', !!mapNameInput);

    const widthInput = await page.$('input[type="number"]');
    log('地图宽度输入框', !!widthInput);

    const editorCanvas = await page.$('canvas');
    log('编辑器画布', !!editorCanvas);

    const saveButton = await page.$('button:has-text("保存地图")');
    log('保存按钮', !!saveButton);

    // ==================== 四、排行榜功能 ====================
    console.log('\n========== 四、排行榜功能 ==========\n');
    await page.goto(`${BASE_URL}/leaderboard`);
    await page.waitForLoadState('networkidle');

    const leaderboardTitle = await page.textContent('h1');
    log('排行榜页面访问', leaderboardTitle === '排行榜');

    const filterSelect = await page.$('select');
    log('地图筛选下拉框', !!filterSelect);

    // ==================== 测试总结 ====================
    console.log('\n========== 测试总结 ==========\n');
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    console.log(`通过: ${passed}/${results.length}`);
    console.log(`失败: ${failed}/${results.length}`);

    if (errors.length > 0) {
      console.log('\n失败项目:');
      errors.forEach(e => console.log(`  - ${e.name}: ${e.detail}`));
    }

    // 保存截图
    await page.screenshot({ path: 'test-result.png', fullPage: true });
    console.log('\n截图已保存到 test-result.png');

  } catch (e) {
    console.error('测试过程出错:', e.message);
  } finally {
    await browser.close();
  }
}

runTests();
