import { headlessActions } from '@/modules/code-generator/constants'

export const TEST_CASE_COLUMNS = [
  '编号',
  '功能',
  '用例标题',
  '前置条件',
  '测试数据',
  '操作步骤',
  '预期结果',
  '实际结果',
  '缺陷单号',
  '用例类型',
  '备注',
]

const DEFAULT_CASE_TYPE = '正向'
const DEFAULT_ACTUAL_RESULT = ''
// 对齐示例用例的用例类型分类
const CASE_TYPES = {
  POSITIVE: '正向',
  EXCEPTION: '异常',
  BOUNDARY: '边界',
  SECURITY: '安全',
  FUNCTION: '功能',
  USABILITY: '易用性',
  PERFORMANCE: '功能/性能',
}

const INTERACTIVE_ACTIONS = ['click', 'dblclick', 'keydown', 'change', 'select', 'submit']

function isNavigationAction(action) {
  return action === headlessActions.NAVIGATION
}

function isScreenshotAction(action) {
  return action === headlessActions.SCREENSHOT
}

function isPageSetupAction(action) {
  return [headlessActions.GOTO, headlessActions.VIEWPORT].includes(action)
}

function isInteractiveAction(action) {
  return INTERACTIVE_ACTIONS.includes(action)
}

/**
 * 将 CSS 选择器翻译为业务可读的控件标签。
 * 按「从具体到通用」的优先级顺序匹配，对应改进方向第 2 条。
 */
function translateSelector(selector = '') {
  if (!selector) return ''
  const s = selector.toLowerCase()

  // ── 登录相关输入框
  if (/username|user.?name|loginname|login.?name|account/.test(s)) return '用户名输入框'
  if (/password|passwd|pwd/.test(s)) return '密码输入框'
  if (/captcha|verify.?code|vcode|kaptcha/.test(s)) return '验证码输入框'
  if (/phone|mobile/.test(s)) return '手机号输入框'
  if (/email|mail/.test(s)) return '邮箱输入框'

  // ── 常用表单字段
  if (/search|keyword|query/.test(s)) return '搜索输入框'
  if (/remark|note|comment|description|desc/.test(s)) return '备注输入框'
  if (/\bname\b(?!space)/.test(s)) return '名称输入框'
  if (/amount|price|money|fee/.test(s)) return '金额输入框'
  if (/start.?date|begin.?date/.test(s)) return '开始日期'
  if (/end.?date|expir/.test(s)) return '结束日期'
  if (/date|time/.test(s)) return '日期/时间选择'
  if (/el-upload|upload.?input/.test(s)) return '文件上传控件'

  // ── 具体按钮（优先于通用按钮）
  if (/login.?btn|btn.?login|sys-password-login.*el-button|login.*submit/.test(s)) return '登录按钮'
  if (/logout|sign.?out/.test(s)) return '退出登录按钮'
  if (/search.?btn|btn.?search|query.?btn|search.*button/.test(s)) return '搜索按钮'
  if (/add.?btn|btn.?add|create.?btn|new.?btn|btn.*add/.test(s)) return '新增按钮'
  if (/edit.?btn|btn.?edit|modify.?btn|update.?btn/.test(s)) return '编辑按钮'
  if (/delete.?btn|btn.?delete|del.?btn|remove.?btn/.test(s)) return '删除按钮'
  if (/save.?btn|btn.?save/.test(s)) return '保存按钮'
  if (/confirm.?btn|btn.?confirm|submit.?btn|btn.?submit/.test(s)) return '确认/提交按钮'
  if (/cancel.?btn|btn.?cancel|close.?btn/.test(s)) return '取消/关闭按钮'
  if (/export.?btn|btn.?export|download.?btn/.test(s)) return '导出按钮'
  if (/import.?btn|btn.?import|upload.?btn/.test(s)) return '导入/上传按钮'
  if (/reset.?btn|btn.?reset|clear.?btn/.test(s)) return '重置按钮'
  if (/detail.?btn|btn.?detail|view.?btn/.test(s)) return '查看详情按钮'
  if (/el-dialog.*footer.*el-button|modal.*confirm/.test(s)) return '弹窗确认按钮'
  // 通用 Element UI 按钮（最后匹配）
  if (/el-button|\.btn\b/.test(s)) return '按钮'

  // ── 导航/菜单
  if (/nav-menu-name|menu-name/.test(s)) return '菜单项'
  if (/el-icon-arrow-right|icon.*arrow-right/.test(s)) return '展开箭头'
  if (/el-breadcrumb/.test(s)) return '面包屑导航'
  if (/el-tabs__item|tab-item/.test(s)) return '选项卡标签'
  if (/el-tabs|\.tabs/.test(s)) return '选项卡'
  if (/nav-menu|el-menu|side.*menu|sidebar/.test(s)) return '侧边栏菜单'

  // ── 表格操作
  if (/el-table.*el-button|table.*(edit|delete|detail)/.test(s)) return '表格行操作按钮'
  if (/el-table__row|table.*row/.test(s)) return '表格行'
  if (/el-pagination|page.*btn/.test(s)) return '分页控件'
  if (/el-table/.test(s)) return '表格'

  // ── 选择/开关
  if (/el-cascader/.test(s)) return '级联选择框'
  if (/el-select|el-dropdown/.test(s)) return '下拉选择框'
  if (/el-checkbox/.test(s)) return '复选框'
  if (/el-radio/.test(s)) return '单选框'
  if (/el-switch/.test(s)) return '开关'

  // ── 通用输入
  if (/el-input|input/.test(s)) return '输入框'

  // ── 对话框
  if (/el-dialog|modal|popup/.test(s)) return '弹窗'

  // ── fallback：提取最后可读的 class 片段
  const parts = selector
    .split(/[\s>+~]/)
    .map(p => p.trim())
    .filter(Boolean)
  const last = parts[parts.length - 1] || selector
  const clean = last
    .replace(/^[.#]/, '')
    .replace(/\\[0-9a-f]+ /gi, '') // 去掉 CSS 转义（如 \31 247）
    .replace(/\[.*?\]/g, '') // 去掉属性选择器
    .replace(/-/g, ' ')
    .trim()
  return clean ? `"${clean}"` : selector
}

/**
 * 去除连续重复的点击操作（同 action + 同 selector）。
 * 对应改进方向第 3 条：合并重复或无意义的操作。
 */
function deduplicateEvents(events = []) {
  return events.filter((event, index) => {
    if (index === 0) return true
    const prev = events[index - 1]
    if (['click', 'dblclick'].includes(event.action)) {
      return !(event.action === prev.action && event.selector === prev.selector)
    }
    return true
  })
}

function getPageFeature(recording = []) {
  const gotoEvent = recording.find(({ action }) => action === headlessActions.GOTO)

  if (!gotoEvent?.href) {
    return '页面交互流程'
  }

  try {
    const url = new URL(gotoEvent.href)
    const path = url.pathname && url.pathname !== '/' ? url.pathname : ''
    return `${url.host}${path}`
  } catch (error) {
    return gotoEvent.href
  }
}

function inferActionKeyword(text = '') {
  const content = `${text}`.toLowerCase()

  // 英文选择器关键词
  if (/login|signin|log-in|account/.test(content)) return '登录'
  if (/search|query|keyword|filter/.test(content)) return '查询'
  if (/add|create|new/.test(content)) return '新增'
  if (/edit|update|modify/.test(content)) return '编辑'
  if (/delete|remove/.test(content)) return '删除'
  if (/save|submit|confirm|ok/.test(content)) return '提交'
  if (/upload|import/.test(content)) return '上传'
  if (/download|export/.test(content)) return '下载'

  // 中文标签关键词（event.label 采集到中文后直接命中）
  if (/登录|登陆/.test(content)) return '登录'
  if (/搜索|查询|筛选/.test(content)) return '查询'
  if (/新增|添加|创建/.test(content)) return '新增'
  if (/编辑|修改|更新/.test(content)) return '编辑'
  if (/删除|移除/.test(content)) return '删除'
  if (/保存|提交|确认|确定/.test(content)) return '提交'
  if (/上传|导入/.test(content)) return '上传'
  if (/下载|导出/.test(content)) return '下载'
  if (/注册/.test(content)) return '注册'
  if (/重置|清空|清除/.test(content)) return '重置'
  if (/详情|查看/.test(content)) return '查看'

  return ''
}

/**
 * 解析事件的可读标签：优先使用 Recorder 直接采集的 event.label，
 * 降级时才使用 translateSelector 对 CSS 选择器做模式匹配翻译。
 * 这是改进方向 2 的核心——录制层采集语义，生成层直接使用。
 */
function resolveLabel(event = {}) {
  const live = (event.label || '').trim()
  if (live) return live
  return translateSelector(event.selector || '')
}

function getScenarioName(events = [], pageFeature = '页面交互流程') {
  // 优先用录制时的真实标签（event.label）+ 选择器 + 带入幺的 value/href 做语义推断
  const inferText = events
    .map(
      event =>
        `${event.label || ''} ${event.selector || ''} ${event.href || ''} ${event.value || ''}`
    )
    .join(' ')

  if (events.some(event => isScreenshotAction(event.action))) {
    return `${pageFeature}-截图校验`
  }

  const keyword = inferActionKeyword(inferText)
  if (keyword) {
    return `${pageFeature}-${keyword}功能`
  }

  if (events.some(event => ['keydown', 'change', 'select', 'submit'].includes(event.action))) {
    return `${pageFeature}-表单操作`
  }

  if (events.some(event => ['click', 'dblclick'].includes(event.action))) {
    return `${pageFeature}-页面交互`
  }

  return `${pageFeature}-基础检查`
}

/**
 * 根据录制事件推断用例类型，对齐示例用例分类：
 * 正向 / 异常 / 边界 / 安全 / 功能 / 易用性 / 功能/性能
 */
function getCaseType(events = [], fallback = DEFAULT_CASE_TYPE) {
  // 同时纳入 event.label 和 selector，中文标签能更准确啇动局部分类规则
  const selectors = events
    .map(
      event =>
        `${event.label || ''} ${event.selector || ''} ${event.value || ''} ${event.href || ''}`
    )
    .join(' ')
    .toLowerCase()

  // 截图场景 → 回归校验性用例，归类为"功能"
  if (events.some(event => isScreenshotAction(event.action))) {
    return CASE_TYPES.FUNCTION
  }

  // 仅页面跳转/导航 → 正向（冒烟性质）
  if (events.every(event => isPageSetupAction(event.action) || isNavigationAction(event.action))) {
    return CASE_TYPES.POSITIVE
  }

  // 安全相关关键词
  if (/sql|inject|xss|script|alert\(|or '1'='1|logout|session|token/.test(selectors)) {
    return CASE_TYPES.SECURITY
  }

  // 边界相关关键词（最大值、最小值、空值等）
  if (/max|min|limit|boundary|empty|null|0{3,}|9{3,}|overflow/.test(selectors)) {
    return CASE_TYPES.BOUNDARY
  }

  // 包含表单输入/选择 → 功能用例
  if (
    events.some(event =>
      ['keydown', 'change', 'select', 'submit', 'dblclick'].includes(event.action)
    )
  ) {
    return CASE_TYPES.FUNCTION
  }

  return fallback
}

function splitRecordingByPage(recording = []) {
  const groups = []
  let current = []

  recording.forEach(event => {
    if (event.action === headlessActions.GOTO && current.length > 0) {
      groups.push(current)
      current = [event]
      return
    }

    current.push(event)
  })

  if (current.length > 0) {
    groups.push(current)
  }

  return groups
}

function splitPageScenarios(pageEvents = []) {
  const scenarios = []
  const businessStartIndex = pageEvents.findIndex(
    event => isInteractiveAction(event.action) || isScreenshotAction(event.action)
  )

  const setupEvents =
    businessStartIndex === -1
      ? pageEvents.filter(
          event => isPageSetupAction(event.action) || isNavigationAction(event.action)
        )
      : pageEvents
          .slice(0, businessStartIndex)
          .filter(event => isPageSetupAction(event.action) || isNavigationAction(event.action))

  if (setupEvents.length > 0) {
    scenarios.push({
      type: CASE_TYPES.SMOKE,
      events: setupEvents,
    })
  }

  if (businessStartIndex === -1) {
    return scenarios
  }

  let current = []
  for (let i = businessStartIndex; i < pageEvents.length; i += 1) {
    const event = pageEvents[i]

    if (isScreenshotAction(event.action)) {
      if (current.length > 0) {
        scenarios.push({ type: getCaseType(current), events: current })
        current = []
      }

      scenarios.push({ type: CASE_TYPES.REGRESSION, events: [event] })
      continue
    }

    if (isInteractiveAction(event.action) || isNavigationAction(event.action)) {
      current.push(event)

      if (
        isNavigationAction(event.action) &&
        current.some(item => isInteractiveAction(item.action))
      ) {
        scenarios.push({ type: getCaseType(current), events: current })
        current = []
      }
    }
  }

  if (current.length > 0) {
    scenarios.push({ type: getCaseType(current), events: current })
  }

  return scenarios
}

function getPrecondition(recording = [], caseType = DEFAULT_CASE_TYPE) {
  const gotoEvent = recording.find(({ action }) => action === headlessActions.GOTO)
  const conditions = []

  if (gotoEvent?.href) {
    conditions.push(`已进入目标页面（${gotoEvent.href}）`)
  } else {
    conditions.push('已进入待测页面')
  }

  // 有输入/表单操作 → 需要账号或业务数据
  const hasInput = recording.some(event => ['keydown', 'change', 'select'].includes(event.action))
  if (hasInput) {
    conditions.push('业务前置数据已准备完成')
  }

  if (caseType === CASE_TYPES.SECURITY) {
    conditions.push('具备安全测试权限，测试环境与生产环境已隔离')
  }

  return conditions.join('；')
}

function getEventActionText(event = {}) {
  const { action, value, href } = event
  // resolveLabel 优先用录制时采集的真实标签，降级才用选择器翻译
  const label = resolveLabel(event)
  const labelStr = label ? `"${label}"` : '该元素'

  switch (action) {
    case headlessActions.GOTO:
      return `打开页面：${href}`
    case headlessActions.VIEWPORT:
      return `设置浏览器窗口大小为 ${value?.width || 0} × ${value?.height || 0}`
    case 'click':
      return `点击${labelStr}`
    case 'keydown':
      return `在${labelStr}中输入${value ? `：${value}` : ''}`
    case 'change':
      return `在${labelStr}中选择"${value}"`
    case headlessActions.NAVIGATION:
      return '等待页面加载完成'
    case headlessActions.SCREENSHOT:
      return value ? `对"${value}"进行截图` : '进行整页截图'
    default:
      return ''
  }
}

function getEventExpectationText(event = {}, caseType = DEFAULT_CASE_TYPE) {
  const { action, value, href } = event
  // 优先使用录制时的真实标签
  const label = resolveLabel(event)

  switch (action) {
    case headlessActions.GOTO:
      return `成功打开页面，地址为 ${href}`
    case headlessActions.VIEWPORT:
      return `浏览器窗口尺寸调整为 ${event?.value?.width || 0} × ${event?.value?.height || 0}`
    case 'click': {
      // 根据真实标签给出具体预期，对应改进方向第 4 条
      if (/退出登录/.test(label)) return '退出成功，跳转到登录页'
      if (/新增按钮/.test(label)) return '弹出新增表单对话框'
      if (/编辑按钮/.test(label)) return '弹出编辑表单对话框，回显当前数据'
      if (/删除按钮/.test(label)) return '弹出删除确认对话框'
      if (/弹窗确认按钮|确认\/提交按钮/.test(label)) return '操作成功，页面给出成功提示'
      if (/取消\/关闭按钮/.test(label)) return '弹窗关闭，返回列表页面'
      if (/搜索按钮/.test(label)) return '列表按输入条件筛选并刷新结果'
      if (/导出按钮/.test(label)) return '触发文件下载，文件内容与列表数据一致'
      if (/导入\/上传按钮/.test(label)) return '导入任务提交成功，系统给出成功提示'
      if (/保存按钮/.test(label)) return '数据保存成功，列表中可查看到最新记录'
      if (/展开箭头/.test(label)) return '菜单展开，显示子菜单项'
      if (/菜单项/.test(label)) return '进入对应功能模块页面'
      if (/选项卡/.test(label)) return '切换至对应选项卡内容'
      if (/重置按钮/.test(label)) return '筛选条件清空，列表恢复默认展示'
      if (/查看详情/.test(label)) return '弹出详情对话框或跳转详情页'
      return `点击${label}后页面正常响应`
    }
    case 'keydown':
      return `"${label || '输入框'}"成功录入${value ? `：${value}` : '操作内容'}`
    case 'change':
      return `"${label || '下拉框'}"成功选中"${value}"`
    case headlessActions.NAVIGATION:
      return '页面跳转并加载成功'
    case headlessActions.SCREENSHOT:
      return value
        ? `"${value}"截图生成成功，页面展示符合预期`
        : '整页截图生成成功，页面展示符合预期'
    default:
      return caseType === CASE_TYPES.POSITIVE ? '页面基础功能符合预期' : '页面响应符合预期'
  }
}

function listText(items = [], fallback = '无') {
  return items.length > 0 ? items.join('\n') : fallback
}

function getTestData(recording = []) {
  function extractFieldName(event) {
    // 优先用录制时的真实标签（已经是人类可读的字段名）
    const live = (event.label || '').trim()
    if (live) {
      // 去掉尾部「输入框/选择框/控件」等对字段名无意义的后缀
      return live.replace(/(输入框|选择框|下拉选择框|控件|按钮)$/, '').trim() || live
    }
    // 降级：用 translateSelector 并去后缀
    const raw = translateSelector(event.selector || '')
    return (
      raw
        .replace(/(输入框|选择框|下拉选择框|控件|按钮)$/, '')
        .replace(/^"|"$/g, '')
        .trim() || event.selector
    )
  }

  const rows = recording.reduce((result, event) => {
    if (event.action === 'keydown' && event.selector && event.value) {
      // 优先使用录制时字段标签，对应改进方向第 5 条
      const fieldName = extractFieldName(event)
      result.push(`${fieldName}：${event.value}`)
    }

    if (event.action === 'change' && event.selector && event.value) {
      const fieldName = extractFieldName(event)
      result.push(`${fieldName}（选择）：${event.value}`)
    }

    if (event.action === headlessActions.SCREENSHOT) {
      result.push(event.value ? `截图对象：${event.value}` : '截图对象：整页')
    }

    return result
  }, [])

  return Array.from(new Set(rows)).join('；') || '无特殊测试数据'
}

function buildSteps(recording = []) {
  // 先去除连续重复点击，再生成步骤（改进方向第 3 条）
  const rows = deduplicateEvents(recording)
    .map(getEventActionText)
    .filter(Boolean)
    .map((text, index) => `${index + 1}. ${text}`)

  return listText(rows)
}

function buildExpectations(recording = [], caseType = DEFAULT_CASE_TYPE) {
  // 先去重，再取预期——与 buildSteps 保持一致（改进方向第 3 条）
  const stepExpectations = deduplicateEvents(recording)
    .map(event => getEventExpectationText(event, caseType))
    .filter(Boolean)

  // 去重
  const unique = Array.from(new Set(stepExpectations))

  // 补充结论性预期（对齐示例末尾的「登录成功/跳转首页」模式）
  const hasNavigation = recording.some(e => isNavigationAction(e.action))
  const keyword = inferActionKeyword(
    recording
      .map(e => `${e.label || ''} ${e.selector || ''} ${e.value || ''} ${e.href || ''}`)
      .join(' ')
  )

  if (keyword === '登录' && hasNavigation) {
    if (!unique.some(t => t.includes('登录成功'))) unique.push('登录成功，跳转系统首页')
  } else if (keyword === '新增' || keyword === '编辑') {
    if (!unique.some(t => t.includes('保存'))) unique.push('操作成功，数据正确保存并展示')
  } else if (keyword === '删除') {
    if (!unique.some(t => t.includes('删除'))) unique.push('记录已从列表中删除')
  } else if (keyword === '查询') {
    if (!unique.some(t => t.includes('查询'))) unique.push('查询结果符合预期，数据展示正确')
  } else if (keyword === '提交') {
    if (!unique.some(t => t.includes('提交'))) unique.push('表单提交成功，系统给出成功提示')
  }

  return listText(
    unique.map((text, index) => `${index + 1}. ${text}`),
    '页面响应符合预期'
  )
}

function getRemark(recording = [], caseType = DEFAULT_CASE_TYPE, pageIndex = 1, scenarioIndex = 1) {
  const hasScreenshot = recording.some(event => isScreenshotAction(event.action))
  const remarks = []

  if (hasScreenshot) {
    remarks.push('包含截图校验，建议对比基线样式或关键区域展示效果')
  }

  const hasInput = recording.some(event => ['keydown', 'change', 'select'].includes(event.action))
  if (hasInput) {
    remarks.push('执行前请确认测试数据仍然有效')
  }

  if (caseType === CASE_TYPES.SECURITY) {
    remarks.push('安全场景，需在隔离环境执行，执行后清理测试数据')
  }

  // 场景超过1个时标注位置（对齐示例，便于追踪自动拆分结果）
  if (pageIndex > 1 || scenarioIndex > 1) {
    remarks.push(`第 ${pageIndex} 个页面，第 ${scenarioIndex} 个场景（自动拆分）`)
  }

  return remarks.join('；')
}

export function buildTestCase(recording = [], index = 1, meta = {}) {
  const pageFeature = meta.pageFeature || getPageFeature(recording)
  const caseType = meta.caseType || getCaseType(recording)
  const feature = meta.feature || getScenarioName(recording, pageFeature)

  // 用例标题：对齐示例「登录-边界值测试-密码为6位数字」风格（改进方向第 6/7 条）
  const keyword = inferActionKeyword(
    recording
      .map(e => `${e.label || ''} ${e.selector || ''} ${e.value || ''} ${e.href || ''}`)
      .join(' ')
  )
  const featureLabel = keyword || feature

  // 提取输入的具体测试数据，拼到标题末尾（如「密码：123456」→「123456」）
  const firstInput = recording.find(e => e.action === 'keydown' && e.value)
  const dataHint = firstInput?.value ? `（${firstInput.value}）` : ''

  const titleSuffix =
    caseType === CASE_TYPES.POSITIVE
      ? '功能验证通过'
      : caseType === CASE_TYPES.EXCEPTION
      ? '异常处理正确'
      : caseType === CASE_TYPES.SECURITY
      ? '安全拦截正常'
      : caseType === CASE_TYPES.BOUNDARY
      ? `边界值处理${dataHint}`
      : caseType === CASE_TYPES.FUNCTION
      ? '功能正常'
      : '操作验证通过'

  return {
    编号: `TC-${`${index}`.padStart(3, '0')}`,
    功能: feature,
    用例标题: `${featureLabel}-${titleSuffix}`,
    // 示例格式：登录-边界值处理（123456）
    前置条件: getPrecondition(recording, caseType),
    测试数据: getTestData(recording),
    操作步骤: buildSteps(recording),
    预期结果: buildExpectations(recording, caseType),
    实际结果: DEFAULT_ACTUAL_RESULT,
    缺陷单号: '',
    用例类型: caseType,
    备注: getRemark(recording, caseType, meta.pageIndex, meta.scenarioIndex),
  }
}

export default class TestCaseGenerator {
  generate(recording = []) {
    if (!Array.isArray(recording) || recording.length === 0) {
      return []
    }

    const pages = splitRecordingByPage(recording)
    const results = []
    let index = 1

    pages.forEach((pageEvents, pageIndex) => {
      const pageFeature = getPageFeature(pageEvents)
      const scenarios = splitPageScenarios(pageEvents)

      scenarios.forEach((scenario, scenarioIndex) => {
        if (!scenario.events.length) {
          return
        }

        results.push(
          buildTestCase(scenario.events, index, {
            pageFeature,
            caseType: scenario.type || getCaseType(scenario.events),
            pageIndex: pageIndex + 1,
            scenarioIndex: scenarioIndex + 1,
          })
        )
        index += 1
      })
    })

    return results
  }
}
