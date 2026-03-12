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
    expect(testCase['操作步骤']).toContain('在"用户名"中输入：admin')
    expect(testCase['操作步骤']).toContain('在"密码"中输入：123456')
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
})
