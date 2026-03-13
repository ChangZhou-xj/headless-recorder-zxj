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
        label: '用户名', // Recorder 从 <label> 或 placeholder 采集
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
        label: '登录', // Recorder 从 button textContent 采集
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
      {
        action: 'click',
        selector: '.el-submenu__icon-arrow.el-icon-arrow-down',
        label: '绩效配置',
      },
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

  test('uni-app 占位提示会被规范化为明确字段名，重复输入仅保留最终测试数据', () => {
    const testCase = buildTestCase([
      { action: headlessActions.GOTO, href: 'https://example.com/reimburse' },
      { action: headlessActions.NAVIGATION },
      { action: 'click', selector: 'uni textarea textarea', label: '' },
      { action: 'click', selector: 'uni textarea textarea', label: '请输入报销事由' },
      {
        action: 'keydown',
        selector: 'uni textarea textarea',
        value: '申请测试',
        label: '请输入报销事由',
      },
      {
        action: 'keydown',
        selector: 'uni textarea textarea',
        value: '申请测试录制',
        label: '请输入报销事由',
      },
      {
        action: 'change',
        selector: 'uni-picker .uni-picker__input',
        value: '日常报销',
        label: '请选择报销类型',
      },
    ])

    expect(testCase['测试数据']).toBe('报销事由：申请测试录制；报销类型（选择）：日常报销')
    expect(testCase['操作步骤']).toContain('在"报销事由"中输入"申请测试录制"')
    expect(testCase['操作步骤']).toContain('在"报销类型"中选择"日常报销"')
    expect(testCase['操作步骤']).not.toContain('申请测试；')
    expect(testCase['操作步骤']).not.toContain('')
    expect(testCase['操作步骤']).not.toContain('点击"请输入报销事由"')
  })

  test('uni-app 通用 textarea/body 选择器会输出更易懂的字段名称', () => {
    const testCase = buildTestCase([
      { action: headlessActions.GOTO, href: 'https://example.com/editor' },
      { action: 'keydown', selector: 'uni textarea textarea', value: '申请说明', label: '' },
      { action: 'keydown', selector: 'body', value: '补充备注', label: '' },
    ])

    expect(testCase['测试数据']).toContain('文本域：申请说明')
    expect(testCase['测试数据']).toContain('编辑区域：补充备注')
    expect(testCase['操作步骤']).toContain('在"文本域"中输入"申请说明"')
    expect(testCase['操作步骤']).toContain('在"编辑区域"中输入"补充备注"')
    expect(testCase['操作步骤']).not.toContain('uni textarea textarea')
    expect(testCase['操作步骤']).not.toContain('""body""')
  })

  test('hash 路由变化也会触发跨页面拆分，并为导航场景生成更具体标题与前置条件', () => {
    const generator = new TestCaseGenerator()
    const rows = generator.generate([
      { action: headlessActions.GOTO, href: 'https://example.com/#/login' },
      { action: 'keydown', selector: '#username', value: 'admin', label: '用户名' },
      { action: 'click', selector: '.login-btn', label: '登录' },
      { action: headlessActions.NAVIGATION, href: 'https://example.com/#/dashboard' },
      { action: 'click', selector: '.menu-root', label: '绩效管理' },
      { action: 'click', selector: '.menu-leaf', label: '绩效配置' },
    ])

    const loginRow = rows.find(
      row => row['功能'] && row['功能'].includes('example.com/login') && row['操作步骤'].includes('登录')
    )
    const dashboardRow = rows.find(
      row =>
        row['功能'] &&
        row['功能'].includes('example.com/dashboard') &&
        row['操作步骤'].includes('绩效管理 → 绩效配置')
    )

    expect(loginRow).toBeTruthy()
    expect(loginRow['用例标题']).toContain('登录-')
    expect(loginRow['前置条件']).toContain('存在可用测试账号')

    expect(dashboardRow).toBeTruthy()
    expect(dashboardRow['功能']).toContain('绩效配置导航访问')
    expect(dashboardRow['用例标题']).toContain('绩效配置-')
    expect(dashboardRow['前置条件']).toContain('已具备进入"绩效配置"功能模块的访问权限')
  })

  test('截图场景会生成更具体的标题和前置条件文案', () => {
    const testCase = buildTestCase([
      { action: headlessActions.GOTO, href: 'https://example.com/report' },
      { action: headlessActions.SCREENSHOT, value: '结果面板' },
    ])

    expect(testCase['功能']).toContain('结果面板截图校验')
    expect(testCase['用例标题']).toContain('结果面板截图-')
    expect(testCase['前置条件']).toContain('"结果面板"区域已稳定渲染，可进行截图校验')
    expect(testCase['测试数据']).toContain('截图对象：结果面板')
  })

  test('保存成功提示后开始的新交互会被拆分为独立场景，并改进查询类用例分类与前置条件', () => {
    const generator = new TestCaseGenerator()
    const rows = generator.generate([
      { action: headlessActions.GOTO, href: 'https://example.com/order' },
      { action: 'click', selector: '.add-btn', label: '新增' },
      { action: 'keydown', selector: '#name', value: '测试订单', label: '订单名称' },
      { action: 'click', selector: '.save-btn', label: '保存' },
      { action: headlessActions.NOTICE, noticeType: 'success', value: '保存成功' },
      { action: 'click', selector: '.search-btn', label: '搜索' },
      { action: headlessActions.NAVIGATION },
    ])

    const createRow = rows.find(
      row => row['功能'] && row['功能'].includes('新增操作') && row['操作步骤'].includes('测试订单')
    )
    const queryRow = rows.find(
      row => row['功能'] && row['功能'].includes('查询功能') && row['操作步骤'].includes('点击"搜索"')
    )

    expect(createRow).toBeTruthy()
    expect(createRow['预期结果']).toContain('保存成功')

    expect(queryRow).toBeTruthy()
    expect(queryRow['用例类型']).toBe('功能')
    expect(queryRow['前置条件']).toContain('待操作业务数据已存在，且具备对应查询或维护权限')
    expect(queryRow['用例标题']).toContain('查询-功能正常')
  })

  test('formType 会驱动输入类 change 使用“输入”动词并带上控件后缀', () => {
    const testCase = buildTestCase([
      { action: headlessActions.GOTO, href: 'https://example.com/expense' },
      {
        action: 'change',
        selector: '.amount-input',
        formType: 'formatInput',
        value: '200',
        label: '请输入报销金额',
      },
    ])

    expect(testCase['测试数据']).toContain('报销金额输入框：200')
    expect(testCase['操作步骤']).toContain('在"报销金额输入框"中输入"200"')
    expect(testCase['操作步骤']).not.toContain('在"报销金额输入框"中选择"200"')
    expect(testCase['预期结果']).toContain('"报销金额输入框"成功录入"200"')
  })

  test('formType 会驱动日期、开关与文件上传的步骤和预期结果文案', () => {
    const testCase = buildTestCase([
      { action: headlessActions.GOTO, href: 'https://example.com/apply' },
      {
        action: 'change',
        selector: '.travel-date',
        formType: 'dateTime',
        value: '2026-03-13 10:00',
        label: '请选择出发时间',
      },
      {
        action: 'change',
        selector: '.need-invoice',
        formType: 'switch',
        checked: true,
        label: '是否开票',
      },
      {
        action: 'change',
        selector: '.upload-proof',
        formType: 'file',
        value: 'invoice.png',
        label: '上传凭证',
      },
    ])

    expect(testCase['测试数据']).toContain('出发时间日期时间选择（选择）：2026-03-13 10:00')
    expect(testCase['测试数据']).toContain('是否开票开关：开启')
    expect(testCase['测试数据']).toContain('上传凭证文件上传框（上传）：invoice.png')
    expect(testCase['操作步骤']).toContain('在"出发时间日期时间选择"中选择"2026-03-13 10:00"')
    expect(testCase['操作步骤']).toContain('开启"是否开票开关"')
    expect(testCase['操作步骤']).toContain('上传文件至"上传凭证文件上传框"：「invoice.png」')
    expect(testCase['预期结果']).toContain('"出发时间日期时间选择"已选中日期"2026-03-13 10:00"')
    expect(testCase['预期结果']).toContain('"是否开票开关"已开启')
    expect(testCase['预期结果']).toContain('文件已选择并成功上传至"上传凭证文件上传框"')
    expect(testCase['预期结果']).not.toContain('点击"请选择出发时间"后页面正常响应')
  })

  test('选择/日期类字段的打开面板 click 步骤会在紧随 change 时被省略', () => {
    const testCase = buildTestCase([
      { action: headlessActions.GOTO, href: 'https://example.com/booking' },
      {
        action: 'click',
        selector: '.date-trigger',
        formType: 'dateTime',
        label: '请选择出发时间',
      },
      {
        action: 'change',
        selector: '.date-panel input',
        formType: 'dateTime',
        value: '2026-03-13 10:00',
        label: '请选择出发时间',
      },
      {
        action: 'click',
        selector: '.type-trigger',
        formType: 'select',
        label: '请选择报销类型',
      },
      {
        action: 'change',
        selector: '.type-panel',
        formType: 'select',
        value: '日常报销',
        label: '请选择报销类型',
      },
    ])

    expect(testCase['操作步骤']).toContain('在"出发时间日期时间选择"中选择"2026-03-13 10:00"')
    expect(testCase['操作步骤']).toContain('在"报销类型下拉选择框"中选择"日常报销"')
    expect(testCase['操作步骤']).not.toContain('点击"请选择出发时间"（打开日期选择）')
    expect(testCase['操作步骤']).not.toContain('点击"请选择报销类型"（展开选择）')
    expect(testCase['预期结果']).not.toContain('点击"请选择出发时间"后页面正常响应')
    expect(testCase['预期结果']).not.toContain('点击"请选择报销类型"后页面正常响应')
  })
})
