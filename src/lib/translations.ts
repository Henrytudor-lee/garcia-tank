export type Language = 'zh' | 'en'

export const translations = {
  zh: {
    // Language
    language: '语言',
    chinese: '中文',
    english: 'English',

    // Main game page
    welcome: '欢迎',
    guestMode: '游客模式',
    login: '登录',
    logout: '退出登录',
    tankBattle: '坦克大战',
    startGame: '开始游戏',
    customMaps: '自定义地图',
    leaderboard: '排行榜',
    selectMap: '选择自定义地图',
    selectMapPlaceholder: '-- 选择地图 --',
    useMapStart: '使用此地图开始',
    defaultMap: '默认地图',

    // Game controls
    controls: 'WASD / 方向键 移动',
    controls2: '空格键 射击 | P键 暂停',
    multiplayerControls: '双人模式: 玩家1(WASD+空格) 玩家2(方向键+0)',
    singlePlayer: '单人模式',
    multiplayer: '双人模式',

    // Game states
    paused: '暂停',
    resumeGame: '继续游戏',
    returnToMenu: '返回主菜单',
    pressPToResume: '按 P 键继续',
    gameOver: '游戏结束',
    finalScore: '最终得分',
    reachedLevel: '到达关卡',
    restart: '重新开始',
    victory: '恭喜过关!',
    playAgain: '再玩一次',

    // Login page
    email: '邮箱',
    password: '密码',
    loginButton: '登录',
    loggingIn: '登录中...',
    noAccount: '还没有账号？',
    register: '注册',
    backToHome: '返回首页（游客模式）',
    invalidCredentials: '邮箱或密码错误',

    // Register page
    username: '用户名',
    confirmPassword: '确认密码',
    registerButton: '注册',
    registering: '注册中...',
    hasAccount: '已有账号？',
    passwordMismatch: '两次输入的密码不一致',
    passwordTooShort: '密码长度至少6位',
    registrationSuccess: '注册成功！请登录',

    // Custom maps page
    customMapsTitle: '自定义地图',
    loggedInAs: '登录账号',
    createNewMap: '创建新地图',
    edit: '编辑',
    delete: '删除',
    confirmDelete: '确定要删除这个地图吗？',
    noCustomMaps: '还没有自定义地图',
    clickToCreate: '点击"创建新地图"开始制作',
    guestModeNotice: '您当前是游客模式。登录后可保存地图到云端，更换设备后也能继续使用。',
    size: '大小',
    walls: '墙体数',
    playerSpawn: '玩家出生点',
    basePosition: '基地位置',

    // Map editor page
    editMap: '编辑地图',
    createMap: '创建地图',
    mapSettings: '地图设置',
    mapName: '地图名称',
    width: '宽度',
    height: 'height',
    saveMap: '保存地图',
    tools: '工具',
    placeWall: '放置墙体',
    brick: '砖墙',
    steel: '铁墙',
    grass: '草地',
    water: '水域',
    setPlayerSpawn: '设置玩家出生点',
    setBasePosition: '设置基地位置',
    addEnemySpawn: '添加敌方出生点',
    eraser: '橡皮擦 / 移除敌人生成点',
    tips: '提示：',
    tip1: '点击画布放置',
    tip2: '按住拖动连续绘制',
    tip3: '右键点击移除敌人生成点',
    mapSize: '地图尺寸',
    enemySpawns: '敌人生成点',
    enemies: '个',
    enterMapName: '请输入地图名称',
    mapSizeError: '地图大小必须在 8 到 20 之间',

    // Leaderboard page
    leaderboardTitle: '排行榜',
    filterMap: '筛选地图',
    filterMode: '筛选模式',
    allModes: '全部',
    allMaps: '全部地图',
    totalRecords: '共 条记录',
    noRecords: '暂无记录',
    startGameToRecord: '开始游戏来创造你的最高分吧！',
    rank: '排名',
    score: '分数',
    map: '地图',
    mode: '模式',
    date: '日期',
    
    // Auth errors
    pleaseLoginFirst: '请先登录后才能创建和管理自定义地图',
    pleaseLoginToCreateMap: '请先登录后才能创建自定义地图',

    // Loading
    loading: '加载中...',
  },
  en: {
    // Language
    language: 'Language',
    chinese: '中文',
    english: 'English',

    // Main game page
    welcome: 'Welcome',
    guestMode: 'Guest Mode',
    login: 'Login',
    logout: 'Logout',
    tankBattle: 'Tank Battle',
    startGame: 'Start Game',
    customMaps: 'Custom Maps',
    leaderboard: 'Leaderboard',
    selectMap: 'Select Custom Map',
    selectMapPlaceholder: '-- Select Map --',
    useMapStart: 'Start with This Map',
    defaultMap: 'Default Map',

    // Game controls
    controls: 'WASD / Arrow Keys to Move',
    controls2: 'Space to Fire | P to Pause',
    multiplayerControls: 'Multiplayer: Player1(WASD+Space) Player2(Arrows+0)',
    singlePlayer: 'Single Player',
    multiplayer: 'Multiplayer',

    // Game states
    paused: 'Paused',
    resumeGame: 'Resume',
    returnToMenu: 'Main Menu',
    pressPToResume: 'Press P to Resume',
    gameOver: 'Game Over',
    finalScore: 'Final Score',
    reachedLevel: 'Level Reached',
    restart: 'Play Again',
    victory: 'Victory!',
    playAgain: 'Play Again',

    // Login page
    email: 'Email',
    password: 'Password',
    loginButton: 'Login',
    loggingIn: 'Logging in...',
    noAccount: "Don't have an account?",
    register: 'Register',
    backToHome: 'Back to Home (Guest)',
    invalidCredentials: 'Invalid email or password',

    // Register page
    username: 'Username',
    confirmPassword: 'Confirm Password',
    registerButton: 'Register',
    registering: 'Registering...',
    hasAccount: 'Already have an account?',
    passwordMismatch: 'Passwords do not match',
    passwordTooShort: 'Password must be at least 6 characters',
    registrationSuccess: 'Registration successful! Please login.',

    // Custom maps page
    customMapsTitle: 'Custom Maps',
    loggedInAs: 'Logged in as',
    createNewMap: 'Create New Map',
    edit: 'Edit',
    delete: 'Delete',
    confirmDelete: 'Are you sure you want to delete this map?',
    noCustomMaps: 'No custom maps yet',
    clickToCreate: 'Click "Create New Map" to start',
    guestModeNotice: 'You are in guest mode. Login to save maps to cloud and access from any device.',
    size: 'Size',
    walls: 'Walls',
    playerSpawn: 'Player Spawn',
    basePosition: 'Base',

    // Map editor page
    editMap: 'Edit Map',
    createMap: 'Create Map',
    mapSettings: 'Map Settings',
    mapName: 'Map Name',
    width: 'Width',
    height: 'Height',
    saveMap: 'Save Map',
    tools: 'Tools',
    placeWall: 'Place Wall',
    brick: 'Brick',
    steel: 'Steel',
    grass: 'Grass',
    water: 'Water',
    setPlayerSpawn: 'Set Player Spawn',
    setBasePosition: 'Set Base Position',
    addEnemySpawn: 'Add Enemy Spawn',
    eraser: 'Eraser / Remove Enemy Spawn',
    tips: 'Tips:',
    tip1: 'Click to place',
    tip2: 'Hold and drag to draw',
    tip3: 'Right-click to remove enemy spawn',
    mapSize: 'Map Size',
    enemySpawns: 'Enemy Spawns',
    enemies: '',
    enterMapName: 'Please enter a map name',
    mapSizeError: 'Map size must be between 8 and 20',

    // Leaderboard page
    leaderboardTitle: 'Leaderboard',
    filterMap: 'Filter by Map',
    filterMode: 'Filter by Mode',
    allModes: 'All',
    allMaps: 'All Maps',
    totalRecords: 'records',
    noRecords: 'No records yet',
    startGameToRecord: 'Start playing to set your high score!',
    rank: 'Rank',
    score: 'Score',
    map: 'Map',
    mode: 'Mode',
    date: 'Date',
    
    // Auth errors
    pleaseLoginFirst: 'Please login first to create and manage custom maps',
    pleaseLoginToCreateMap: 'Please login first to create custom maps',

    // Loading
    loading: 'Loading...',
  },
} as const

export type TranslationKey = keyof typeof translations.zh
