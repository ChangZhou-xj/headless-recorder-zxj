import TestCaseGenerator, { TEST_CASE_COLUMNS, buildTestCase } from '../index'
import { headlessActions } from '@/modules/code-generator/constants'

describe('TestCaseGenerator', () => {
  test('使用固定列生成测试用例', () => {
    const testCase = buildTestCase([
      { action: headlessActions.GOTO, href: 'https://example.com/login' },
      { action: 'click', selector: '#login-button' },
    ])

    expect(Object.keys(testCase)).toEqual(TEST_CASE_COLUMNS)
    expect(testCase['功能']).toContain('example.com/login')
    expect(testCase['操作步骤']).toContain('打开页面：https://example.com/login')
  })

  test('空录制结果返回空数组', () => {
    const generator = new TestCaseGenerator()

    expect(generator.generate([])).toEqual([])
  })

  test('录制结果会按页面与功能拆分成多条中文测试用例', () => {
    const generator = new TestCaseGenerator()
    const rows = generator.generate([
      { action: headlessActions.GOTO, href: 'https://example.com/orders' },
      { action: headlessActions.VIEWPORT, value: { width: 1280, height: 720 } },
      { action: headlessActions.NAVIGATION },
      { action: 'keydown', selector: '#keyword', value: '测试数据' },
      { action: 'click', selector: '#search-button' },
      { action: headlessActions.NAVIGATION },
      { action: headlessActions.SCREENSHOT, value: '#result-panel' },
      { action: headlessActions.GOTO, href: 'https://example.com/profile' },
      { action: headlessActions.VIEWPORT, value: { width: 1280, height: 720 } },
    ])

    expect(rows).toHaveLength(4)
    expect(rows[0]['用例类型']).toBe('正向')
    expect(rows[1]['用例类型']).toBe('功能')
    expect(rows[2]['用例类型']).toBe('功能')
    expect(rows[3]['功能']).toContain('example.com/profile')
    // 测试数据：translateSelector('#keyword') → '搜索输入框' → 去后缀 → '搜索'
    expect(rows[1]['测试数据']).toContain('搜索：测试数据')
    expect(rows[1]['备注']).toContain('第 2 个场景')
    expect(rows[2]['预期结果']).toContain('#result-panel')
    expect(rows[3]['实际结果']).toBe('')
  })

  test('event.label 直接驱动步骤描述和测试数据，优先于 CSS 选择器翻译', () => {
    // 模拟 Recorder 采集真实标签后生成的事件
    const testCase = buildTestCase([
      {
        action: headlessActions.GOTO,
        href: 'https://example.com/login',
      },
      {
        action: 'keydown',
        selector: '.el-form > .is-required > .el-input__inner',
        value: 'admin',
        label: '用户名',  // Recorder 从 <label> 或 placeholder 采集
      },
      {
        action: 'keydown',
        selector: '.el-form > .el-input--suffix > .el-input__inner',
        value: '123456',
        label: '密码',
      },
      {
        action: 'click',
        selector: '.sys-password-login .el-button',
        label: '登录',   // Recorder 从 button textContent 采集
      },
      { action: headlessActions.NAVIGATION },
    ])

    // 操作步骤应使用真实标签，而非 CSS 选择器
    expect(testCase['操作步骤']).toContain('在"用户名"中输入"admin"')
    expect(testCase['操作步骤']).toContain('在"密码"中输入"123456"')
    expect(testCase['操作步骤']).toContain('点击"登录"')

    // 测试数据应使用真实字段名
    expect(testCase['测试数据']).toContain('用户名：admin')
    expect(testCase['测试数据']).toContain('密码：123456')

    // 场景名和标题应识别"登录"关键词
    expect(testCase['功能']).toContain('登录')
    expect(testCase['用例标题']).toContain('登录')

    // 预期结果应包含登录成功的业务描述
    expect(testCase['预期结果']).toContain('登录成功')
  })

  test('event.label 中文关键词能正确识别用例类型和场景名', () => {
    const generator = new TestCaseGenerator()
    const rows = generator.generate([
      { action: headlessActions.GOTO, href: 'https://example.com/user' },
      { action: headlessActions.NAVIGATION },
      {
        action: 'click',
        selector: '.add-btn',
        label: '新增',
      },
      {
        action: 'keydown',
        selector: '#name-input',
        value: '张三',
        label: '姓名',
      },
      {
        action: 'click',
        selector: '.el-dialog .el-button--primary',
        label: '确定',
      },
      { action: headlessActions.NAVIGATION },
    ])

    expect(rows.length).toBeGreaterThan(0)
    const funcCase = rows.find(r => r['用例类型'] === '功能' || r['用例类型'] === '正向')
    expect(funcCase).toBeTruthy()

    // 测试数据中字段名来自 label，不包含 CSS 选择器
    const testData = rows.map(r => r['测试数据']).join(' ')
    expect(testData).toContain('姓名：张三')
    expect(testData).not.toContain('name-input')
  })

  test('Element UI 图标和容器噪音被过滤，上溯成功的图标点击保留真实业务标签', () => {
    const testCase = buildTestCase([
      { action: headlessActions.GOTO, href: 'https://example.com/main' },
      { action: headlessActions.NAVIGATION },
      // SVG use 图标（tagName=USE，应被过滤）
      { action: 'click', selector: 'li.menu > span > svg > use', tagName: 'USE', label: '' },
      // el-icon-arrow-down 上溯成功：_getElementLabel 已取到父菜单标题，label 为真实业务名
      { action: 'click', selector: '.el-submenu__icon-arrow.el-icon-arrow-down', label: '绩效配置' },
      // el-icon-arrow-right 上溯失败（父元素无文字），translateSelector 翻译为"展开箭头"，应被过滤
      { action: 'click', selector: '.el-icon-arrow-right', label: '' },
      // 侧边栏菜单容器（MENU_NOISE_LABELS 命中，应被过滤）
      { action: 'click', selector: '.nav-menu ul.el-menu', label: '侧边栏菜单' },
      // translateSelector fallback 的双引号 class 片段标签（应被过滤）
      { action: 'click', selector: '.el-submenu__title', label: '"el submenu title"' },
      // 真实菜单导航路径（应折叠为路径描述）
      { action: 'click', selector: '.menu-item-1', label: '绩效管理' },
      { action: 'click', selector: '.menu-item-2', label: '业务设置' },
    ])

    const steps = testCase['操作步骤']

    // 噪音步骤不应出现
    expect(steps).not.toContain('use')
    expect(steps).not.toContain('展开箭头')
    expect(steps).not.toContain('侧边栏菜单')
    expect(steps).not.toContain('el submenu title')

    // el-icon-arrow-down 上溯成功后标签为"绩效配置"，应保留
    expect(steps).toContain('绩效配置')

    // 连续菜单文字点击应折叠为路径（无【】，用 → 分隔）
    expect(steps).toContain('绩效管理 → 业务设置')
  })

  test('更多 Element UI 结构元素：折叠面板箭头、树节点展开图标、对话框关闭按钮均被过滤', () => {
    const testCase = buildTestCase([
      { action: headlessActions.GOTO, href: 'https://example.com/page' },
      { action: headlessActions.NAVIGATION },
      // 折叠面板箭头（el-collapse-item__arrow，空 label + translateSelector = "折叠面板箭头"）
      { action: 'click', selector: '.el-collapse-item__arrow', label: '' },
      // 树节点展开图标（el-tree-node__expand-icon → "树节点展开图标"）
      { action: 'click', selector: '.el-tree-node__expand-icon', label: '' },
      // 对话框关闭按钮（el-dialog__headerbtn → "对话框关闭按钮"）
      { action: 'click', selector: '.el-dialog__headerbtn', label: '' },
      // 真正的业务操作
      { action: 'click', selector: '.add-btn', label: '新增' },
    ])

    const steps = testCase['操作步骤']
    expect(steps).not.toContain('折叠面板箭头')
    expect(steps).not.toContain('树节点展开图标')
    expect(steps).not.toContain('对话框关闭按钮')
    expect(steps).toContain('新增')
  })

  test('路由 URL 变化（NAVIGATION.href）触发 SPA 跨页面用例拆分', () => {
    // 模拟典型 SPA 登录后跳转场景：
    //   1. 用户在 /login 页填写表单并提交
    //   2. background.js 捕获 webNavigation 事件，NAVIGATION 携带新 href（/dashboard）
    //   3. TestCaseGenerator 检测到 pathname 变化 → 拆为两条独立 TC
    const generator = new TestCaseGenerator()
    const rows = generator.generate([
      // ── 登录页 ──────────────────────────────────────────────
      { action: headlessActions.GOTO, href: 'https://example.com/login' },
      {
        action: 'keydown',
        selector: '#username',
        value: 'admin',
        label: '用户名',
      },
      {
        action: 'keydown',
        selector: '#password',
        value: '123456',
        label: '密码',
      },
      {
        action: 'click',
        selector: '.login-btn',
        label: '登录',
      },
      // NAVIGATION 携带跳转后的新 URL（pathname 由 /login → /dashboard）
      // 这条事件由 background.js 的 handleNavigation 注入 href
      {
        action: headlessActions.NAVIGATION,
        href: 'https://example.com/dashboard',
      },
      // ── 落地页（/dashboard）业务操作 ─────────────────────────
      {
        action: 'click',
        selector: '.menu-item',
        label: '绩效管理',
      },
      {
        action: 'click',
        selector: '.menu-sub-item',
        label: '绩效配置',
      },
    ])

    // ── 断言 1：必须拆分为两条以上 TC（/login 与 /dashboard 各自独立）
    expect(rows.length).toBeGreaterThanOrEqual(2)

    // ── 断言 2：存在归属 /login 路径且包含登录操作步骤的 TC
    //    （/login 分组可能产生多行：smoke行仅含GOTO、功能行含交互步骤）
    //    这里取包含登录交互步骤的行
    const loginRow = rows.find(
      r =>
        r['功能'] &&
        r['功能'].includes('login') &&
        r['操作步骤'] &&
        r['操作步骤'].includes('用户名')
    )
    expect(loginRow).toBeTruthy()
    expect(loginRow['操作步骤']).toContain('在"用户名"中输入"admin"')
    expect(loginRow['操作步骤']).toContain('点击"登录"')
    expect(loginRow['测试数据']).toContain('用户名：admin')

    // ── 断言 3：存在归属 /dashboard 路径且含业务操作的 TC
    //    （/dashboard 分组也会产生 smoke 行，需过滤掉仅有 GOTO 的行）
    const dashRow = rows.find(
      r =>
        r['功能'] &&
        r['功能'].includes('dashboard') &&
        r['操作步骤'] &&
        r['操作步骤'].includes('绩效管理')
    )
    expect(dashRow).toBeTruthy()
    expect(dashRow['操作步骤']).toContain('绩效管理')

    // ── 断言 4：登录页 TC 的密码不应泄漏到 dashboard TC 的测试数据
    if (dashRow) {
      expect(dashRow['测试数据'] || '').not.toContain('密码：123456')
    }

    // ── 断言 5：两条 TC 的"功能"字段分别包含各自的路由路径（不能混淆）
    expect(loginRow['功能']).not.toContain('dashboard')
    expect(dashRow['功能']).not.toContain('login')
  })
})
