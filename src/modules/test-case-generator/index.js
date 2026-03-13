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
  // 以下两个类型仅供内部拆分使用，最终输出时映射为对外展示类型
  SMOKE: '正向', // 仅页面跳转/加载的冒烟场景，对外显示为"正向"
  REGRESSION: '功能', // 截图比对回归场景，对外显示为"功能"
}

const INTERACTIVE_ACTIONS = ['click', 'dblclick', 'keydown', 'change', 'select', 'submit']

/**
 * 表单类型分组——与业务侧 FORM_TYPE 常量对齐。
 * 用于在 getEventActionText / getEventExpectationText 中选择正确的动词。
 */
/** 文本输入类：用「输入」动词 */
const INPUT_FORM_TYPES = new Set(['input', 'formatInput', 'textarea'])
/** 日期/时间选择类：用「选择日期/时间」 */
const DATE_FORM_TYPES = new Set([
  'date',
  'dateTime',
  'dateTimeSeconds',
  'month',
  'dateRange',
  'time',
  'time_second',
  'date_time_minute',
])
/** 下拉/枚举选择类：用「选择」 */
const SELECT_FORM_TYPES = new Set([
  'select',
  'radio',
  'checkbox',
  'tree',
  'selectInput',
  'selectFollower',
  'areaSelect',
  'bankInput',
])

/**
 * 根据 formType 推导操作语义动词：
 *   'input'  → 文本输入
 *   'date'   → 日期/时间选择
 *   'select' → 枚举/下拉选择
 *   'switch' → 开关切换
 *   'file'   → 文件上传
 *   null     → 未知，由调用方决定 fallback
 */
function getFormVerb(formType = '') {
  if (!formType) return null
  if (INPUT_FORM_TYPES.has(formType)) return 'input'
  if (DATE_FORM_TYPES.has(formType)) return 'date'
  if (SELECT_FORM_TYPES.has(formType)) return 'select'
  if (formType === 'switch') return 'switch'
  if (formType === 'file') return 'file'
  return 'select' // 未知类型默认「选择」
}

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
  if (/date|time/.test(s)) return '日期时间选择'
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

  // ── 导航/菜单 ── 结构性骨架（translateSelector 结果会被 MENU_NOISE_LABELS 过滤）
  if (/el-icon-arrow-(?:right|down|left|up)|el-submenu__icon-arrow/.test(s)) return '展开箭头'
  if (/el-collapse-item__arrow/.test(s)) return '折叠面板箭头'
  if (/el-tree-node__expand-icon/.test(s)) return '树节点展开图标'
  if (/el-table__expand-icon/.test(s)) return '表格展开图标'
  // ── 导航/菜单 ── 业务元素（保留）
  if (/nav-menu-name|menu-name/.test(s)) return '菜单项'
  if (/el-breadcrumb/.test(s)) return '面包屑导航'
  if (/el-tabs__item|tab-item/.test(s)) return '选项卡标签'
  if (/el-tabs|\.tabs/.test(s)) return '选项卡'
  if (/nav-menu|el-menu|side.*menu|sidebar/.test(s)) return '侧边栏菜单'

  // ── 表单内部装饰槽（会被 MENU_NOISE_LABELS 过滤）
  if (/el-input__(suffix|prefix|suffix-inner|prefix-inner)/.test(s)) return '输入框后缀'
  if (/el-select__caret/.test(s)) return '下拉箭头'
  if (/el-input__clear/.test(s)) return '清除按钮'

  // ── 对话框 / 标签 结构元素（会被 MENU_NOISE_LABELS 过滤）
  if (/el-dialog__headerbtn|el-dialog__close/.test(s)) return '对话框关闭按钮'
  if (/el-tag__close/.test(s)) return '标签关闭按钮'

  // ── 日期选择器导航箭头（会被 MENU_NOISE_LABELS 过滤）
  if (/el-date-picker.*prev|el-picker.*prev-month|el-icon-d-arrow-left/.test(s)) return '日期前一月'
  if (/el-date-picker.*next|el-picker.*next-month|el-icon-d-arrow-right/.test(s))
    return '日期后一月'

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

/**
 * 已知的「噪音」标签——这些 label 代表 UI 骨架/装饰，而非业务动作，点击事件应被过滤。
 * 主要来源：translateSelector 对 Element UI 内部结构元素的翻译结果。
 * 当 _getElementLabel 上溯成功拿到真实业务标签时，这里不会命中，不影响有效事件。
 */
const MENU_NOISE_LABELS = new Set([
  // 导航 / 菜单 骨架
  '展开箭头',
  '折叠箭头',
  '侧边栏菜单',
  '菜单项',
  '导航菜单',
  // 表单内部装饰
  '输入框后缀',
  '输入框前缀',
  '下拉箭头',
  '清除按钮',
  // 折叠面板 / 树 / 表格 结构
  '折叠面板箭头',
  '树节点展开图标',
  '表格展开图标',
  // 对话框 / 标签 关闭按钮
  '对话框关闭按钮',
  '标签关闭按钮',
  // 日期选择器导航箭头
  '日期前一月',
  '日期后一月',
  '日期前一年',
  '日期后一年',
  // 通用弹窗容器——点击弹窗背景/容器本身不是有意义的业务动作
  '弹窗',
])

/**
 * 通用表单控件标签集合——这些 label 仅描述控件类型，不含具体业务语义。
 * 当 click 事件的 label 落在此集合中，且下一个事件是任意交互型操作时，
 * 该 click 视为「打开控件入口」，在操作步骤中省略（避免重复冗余步骤）。
 * 典型场景：录制时 click 落在 .el-input 外层容器，change/keydown 落在 .el-input__inner
 * 内层，selector 不同，原有的"同 selector 过滤"无法命中。
 */
const GENERIC_FORM_CLICK_LABELS = new Set([
  '输入框',
  '文本域',
  '金额输入框',
  '下拉选择框',
  '级联选择框',
  '日期/时间选择',
  '日期时间选择',
  '日期选择',
  '日期时间选择',
  '日期时间选择（带时分秒）',
  '月份选择',
  '日期范围选择',
  '时分选择',
  '时分秒选择',
  '年月日时分选择',
  '单选框',
  '复选框',
  '开关',
  '树形选择框',
  '输入选择框',
  '文件上传控件',
  '文件上传框',
  '区划选择框',
  '银行选择框',
  '同行人选择框',
])

/** SVG 图标相关的 tagName（大写）*/
const SVG_TAG_NAMES = new Set([
  'SVG',
  'USE',
  'PATH',
  'CIRCLE',
  'RECT',
  'POLYGON',
  'POLYLINE',
  'ELLIPSE',
  'LINE',
  'G',
  'SYMBOL',
  'DEFS',
])

/**
 * 判断一个事件是否有业务意义——过滤 SVG 图标点击、纯容器菜单点击等噪音事件。
 * 只对 click / dblclick 做过滤，其他事件类型（GOTO、NAVIGATION、SCREENSHOT 等）直接保留。
 *
 * 与录制层协作逻辑：
 *   - _getElementLabel 对 el-icon-* 等图标元素会向上溯源取真实业务标签；
 *     上溯成功 → label 有业务意义 → 此函数保留该事件；
 *     上溯失败 → label 为空 → resolveLabel 用 translateSelector 兜底生成结构性标签
 *               （如"展开箭头"）→ MENU_NOISE_LABELS 过滤。
 */
function isMeaningfulEvent(event) {
  // 非点击事件（GOTO、VIEWPORT、NAVIGATION、SCREENSHOT 等）直接保留
  if (!['click', 'dblclick'].includes(event.action)) return true

  // 按 tagName 过滤 SVG 图标元素（Recorder 已在 payload 中携带 tagName）
  if (event.tagName && SVG_TAG_NAMES.has(event.tagName.toUpperCase())) return false

  const label = normalizeTextLabel(resolveLabel(event))

  // 空标签 / SVG fallback 的 "use" 标签
  if (!label || label === 'use') return false

  // iconfont 私有区字符（如 ""）不具备业务语义，应过滤
  if (PRIVATE_USE_ICON_LABEL.test(label)) return false

  // 已知噪音标签（结构性 Element UI 元素翻译结果）
  if (MENU_NOISE_LABELS.has(label)) return false

  // translateSelector fallback 会把未知 class 名转成拼接的 class 片段，如 "el submenu title"
  // 这类标签仅由 CSS class 片段拼凑，不具备业务语义，统一过滤
  if (
    /^[a-z][\w\s-]{2,}$/.test(label) &&
    /[\s_-]/.test(label) &&
    !ACTION_BUTTON_LABELS.has(label)
  ) {
    return false
  }

  // 加载状态类标签（"加载中"、"Loading..."等）：系统状态，不是用户操作
  if (/^(加载中|加载\.+|loading\.+|请稍候|请稍等|处理中)$/i.test(label)) return false

  return true
}

/**
 * 操作型按钮标签集合——这些标签代表独立业务动作，绝不应被合并进菜单导航路径。
 * 若 collapseMenuPath 检测到序列中包含这些标签，则放弃合并，改为逐条输出步骤。
 */
const ACTION_BUTTON_LABELS = new Set([
  '保存',
  '提交',
  '确认',
  '确定',
  '发布',
  '审核',
  '新增',
  '创建',
  '添加',
  '删除',
  '编辑',
  '修改',
  '取消',
  '关闭',
  '返回',
  '退出',
  '重置',
  '清空',
  '搜索',
  '查询',
  '导出',
  '导入',
  '上传',
  '下载',
  '刷新',
  '复制',
  '粘贴',
  '登录',
  '注销',
  '退出登录',
  '完成',
  '提交审核',
  // 常见英文对话框/操作按钮（防止英文 UI 被误判为导航路径节点）
  'Close',
  'close',
  'OK',
  'ok',
  'Cancel',
  'cancel',
  'Submit',
  'submit',
  'Save',
  'save',
  'Delete',
  'delete',
  'Edit',
  'edit',
  'Reset',
  'reset',
  'Confirm',
  'confirm',
])

// Unicode Private Use Area（PUA）字符，常被 iconfont 用来显示无语义图标，如「」。
const PRIVATE_USE_ICON_LABEL = /^[\uE000-\uF8FF]+$/

function normalizeTextLabel(text = '') {
  return String(text)
    .trim()
    .replace(/^"+|"+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizePlaceholderLabel(label = '') {
  return normalizeTextLabel(label)
    .replace(/^[*：:\s]+/, '')
    .replace(/[：:\s]+$/, '')
    .replace(/(输入框|选择框|下拉选择框|下拉框|文本框|文本域|控件|按钮)$/, '')
    .replace(/^(请)?(输入|填写|录入|补充|键入)/, '')
    .replace(/^(请)?(选择|选取)/, '')
    .replace(/^(请)?搜索/, '')
    .replace(/^(请输入|请选择|请填写)$/, '')
    .trim()
}

/**
 * 根据 formType 返回控件类型后缀（用于拼接 placeholder）。
 * 例：formType='textarea' → '文本域'，拼接后形如「备注文本域」。
 * 没有对应类型时返回空字符串，不拼接。
 */
function getFormTypeSuffix(formType = '') {
  if (!formType) return ''
  if (formType === 'textarea') return '文本域'
  if (formType === 'formatInput') return '金额输入框'
  if (formType === 'input') return '输入框'
  if (formType === 'date') return '日期选择'
  if (formType === 'dateTime') return '日期时间选择'
  if (formType === 'dateTimeSeconds') return '日期时间选择（带时分秒）'
  if (formType === 'month') return '月份选择'
  if (formType === 'dateRange') return '日期范围选择'
  if (formType === 'time') return '时分选择'
  if (formType === 'time_second') return '时分秒选择'
  if (formType === 'date_time_minute') return '年月日时分选择'
  if (formType === 'select') return '下拉选择框'
  if (formType === 'radio') return '单选框'
  if (formType === 'checkbox') return '复选框'
  if (formType === 'switch') return '开关'
  if (formType === 'tree') return '树形选择框'
  if (formType === 'selectInput') return '输入选择框'
  if (formType === 'file') return '文件上传框'
  if (formType === 'areaSelect') return '区划选择框'
  if (formType === 'bankInput') return '银行选择框'
  if (formType === 'selectFollower') return '同行人选择框'
  return ''
}

function inferGenericFieldLabel(selector = '', action = '', formType = '') {
  // ── 优先用 formType 推断控件标签（录制层已注入时最准确）
  if (formType) {
    if (formType === 'textarea') return '文本域'
    if (formType === 'formatInput') return '金额输入框'
    if (formType === 'input') return '输入框'
    if (formType === 'date') return '日期选择'
    if (formType === 'dateTime') return '日期时间选择'
    if (formType === 'dateTimeSeconds') return '日期时间选择（带时分秒）'
    if (formType === 'month') return '月份选择'
    if (formType === 'dateRange') return '日期范围选择'
    if (formType === 'time') return '时分选择'
    if (formType === 'time_second') return '时分秒选择'
    if (formType === 'date_time_minute') return '年月日时分选择'
    if (formType === 'select') return '下拉选择框'
    if (formType === 'radio') return '单选框'
    if (formType === 'checkbox') return '复选框'
    if (formType === 'switch') return '开关'
    if (formType === 'tree') return '树形选择框'
    if (formType === 'selectInput') return '输入选择框'
    if (formType === 'file') return '文件上传框'
    if (formType === 'areaSelect') return '区划选择框'
    if (formType === 'bankInput') return '银行选择框'
    if (formType === 'selectFollower') return '同行人选择框'
  }

  // ── 降级：按 selector 模式匹配
  const s = (selector || '').toLowerCase()

  if (/uni[-\s_]*textarea|\btextarea\b/.test(s)) return '文本域'
  if (/uni[-\s_]*body|\bbody\b/.test(s))
    return ['keydown', 'change'].includes(action) ? '编辑区域' : ''
  if (/date|time|picker|calendar/.test(s)) return '日期时间选择'
  if (/select|dropdown|cascader/.test(s)) return '下拉选择框'
  if (/uni[-\s_]*input|\binput\b/.test(s)) return '输入框'

  return ''
}

function isGenericInputLabel(label = '') {
  return /^(input|textarea|body|uni body|uni textarea textarea|uni textarea|uni input)$/i.test(
    label
  )
}

function getInputLikeLabel(event = {}) {
  const label = normalizePlaceholderLabel(resolveLabel(event))
  const typeSuffix = getFormTypeSuffix(event.formType)

  // 有 placeholder 文本 → 拼接「placeholder + 类型后缀」，如「报销金额输入框」「备注文本域」
  // 使用重叠去重：label 结尾与 typeSuffix 开头若有重叠则合并，避免「报销金额金额输入框」
  if (label && !PRIVATE_USE_ICON_LABEL.test(label) && !isGenericInputLabel(label)) {
    if (typeSuffix) {
      // 找 label 末尾与 typeSuffix 开头的最长公共子串，去重后拼接
      let overlap = 0
      for (let i = Math.min(label.length, typeSuffix.length); i > 0; i--) {
        if (label.endsWith(typeSuffix.slice(0, i))) {
          overlap = i
          break
        }
      }
      return label + typeSuffix.slice(overlap)
    }
    return label
  }

  // 无 placeholder → 降级用类型推断标签（如「文本域」「日期时间选择」）
  const generic = inferGenericFieldLabel(event.selector, event.action, event.formType)
  if (generic) return generic

  return normalizeTextLabel(translateSelector(event.selector || ''))
}

/**
 * 检测连续 click 事件是否构成菜单导航路径。
 * 菜单路径特征：
 *   1. 每个 label 都是 ≤12 字的纯中文短语
 *   2. 数量 ≥ 2
 *   3. 序列中没有操作型按钮标签（保存/取消/确认等），避免把按钮连击误判为导航
 * 满足以上条件时合并为单一的 { _menuPath: string[] } 描述事件。
 */
function collapseMenuPath(events = []) {
  const result = []
  let i = 0

  while (i < events.length) {
    const event = events[i]

    if (event.action === 'click') {
      // 搜集连续 click 事件
      const run = [event]
      let j = i + 1
      while (j < events.length && events[j].action === 'click') {
        run.push(events[j])
        j++
      }

      if (run.length >= 2) {
        const labels = run.map(e => resolveLabel(e))
        // 判断是否为菜单导航路径，必须同时满足：
        //   1. 每段都是 ≤12 字的中文短语（\w 匹配 ASCII，额外排除纯英文）
        //   2. 没有操作型按钮标签（保存/取消/Close 等）
        //   3. 没有纯英文标签（"Close"、"OK" 等对话框按钮）
        //   4. 没有表单 placeholder 类标签（以"输入"开头，如"输入名称"）
        //   5. 没有纯编码/数字类标签（如"1101-001"，这是数据而非菜单项）
        const allShortChinese = labels.every(
          l => l && /^[\u4e00-\u9fa5\w·（）()]{1,12}$/.test(l.replace(/^"|"$/g, ''))
        )
        const noActionButtons = labels.every(l => !ACTION_BUTTON_LABELS.has(l))
        // 纯英文 / 含英文大写字母的标签：视为对话框/组件按钮，不是导航菜单项
        const noEnglishLabels = labels.every(l => !/^[A-Za-z]/.test(l))
        // 以"输入"开头：placeholder 文字（"输入名称"、"输入关键字"），不是菜单项
        const noPlaceholderLabels = labels.every(l => !/^输入/.test(l))
        // 主要是数字/字母编码（如"1101-001"），不是菜单项
        const noCodeLabels = labels.every(l => !/^\d{2,}[-./]\d/.test(l))

        const isMenuNav =
          allShortChinese &&
          noActionButtons &&
          noEnglishLabels &&
          noPlaceholderLabels &&
          noCodeLabels

        if (isMenuNav) {
          // 合并为单条菜单导航事件
          result.push({ ...event, _menuPath: labels })
          i = j
          continue
        }
      }
    }

    result.push(event)
    i++
  }

  return result
}

function deduplicateEvents(events = []) {
  // Step 1：过滤 SVG 图标点击 / 已知噪音容器点击
  const meaningful = events.filter(isMeaningfulEvent)

  // Step 2：去除连续重复（同 action + 同 selector 或 同 label）
  const deduped = meaningful.filter((event, index) => {
    if (index === 0) return true
    const prev = meaningful[index - 1]
    if (['click', 'dblclick'].includes(event.action)) {
      if (event.action === prev.action && event.selector === prev.selector) return false
      // 同 label 的相邻点击（冒泡到不同祖先节点时产生）也归为重复
      const label = resolveLabel(event)
      const prevLabel = resolveLabel(prev)
      if (event.action === prev.action && label && label === prevLabel) return false
    }

    // 对同一输入框的多次 keydown/change，只保留最后一次（最终输入值）。
    // 场景：用户逐字输入"指标解释XX" → 回删至"指标解释X" → 下拉选择"指标解释"，
    //   三次事件均指向同一 selector，只需保留末尾的 change/keydown 即可。
    // 实现：向后预读——若紧随其后还有相同 selector 的 keydown/change，则跳过当前事件。
    if (['keydown', 'change'].includes(event.action)) {
      const next = meaningful[index + 1]
      if (next && ['keydown', 'change'].includes(next.action) && next.selector === event.selector) {
        return false // 当前不是最终值，跳过
      }
    }

    return true
  })

  // Step 3：将连续的菜单文字点击折叠为一条路径描述
  return collapseMenuPath(deduped)
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

  // ── 异常场景识别 ──────────────────────────────────────────────────────────
  // 0. 录制到了错误/警告级别的系统通知（el-message error/warning）
  if (
    events.some(
      e => e.action === headlessActions.NOTICE && ['error', 'warning'].includes(e.noticeType)
    )
  ) {
    return CASE_TYPES.EXCEPTION
  }
  // 1. 标签/值中含有明确的错误/失败语义
  if (/错误|失败|异常|invalid|forbidden|error|exception|timeout|超时/.test(selectors)) {
    return CASE_TYPES.EXCEPTION
  }
  // 2. 提交类按钮点击后无页面跳转（NAVIGATION）
  //    → 推断为校验拦截或接口异常（表单留在当前页 = 操作未成功）
  const hasSubmitClick = events.some(event => {
    if (event.action !== 'click') return false
    const label = (event.label || resolveLabel(event)).toLowerCase()
    return /保存|提交|确认|确定|登录|新增|创建|发布|审核/.test(label)
  })
  const hasNavigation = events.some(event => isNavigationAction(event.action))
  if (hasSubmitClick && !hasNavigation) {
    return CASE_TYPES.EXCEPTION
  }
  // ─────────────────────────────────────────────────────────────────────────

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

function tryGetPathname(href) {
  if (!href) return null
  try {
    return new URL(href).pathname
  } catch (_) {
    return null
  }
}

function splitRecordingByPage(recording = []) {
  const groups = []
  let current = []
  let currentPathname = null

  recording.forEach(event => {
    // 显式页面导航（硬刷新 / 新 Tab）→ 直接分组
    if (event.action === headlessActions.GOTO) {
      if (current.length > 0) groups.push(current)
      current = [event]
      currentPathname = tryGetPathname(event.href)
      return
    }

    // SPA 路由跳转：NAVIGATION 携带了不同 pathname → 视为新页面分组
    // 典型场景：/login 提交后跳转至 /dashboard
    if (event.action === headlessActions.NAVIGATION && event.href) {
      const newPathname = tryGetPathname(event.href)
      if (newPathname && currentPathname && newPathname !== currentPathname) {
        if (current.length > 0) groups.push(current)
        // 用路由跳转后的真实地址合成一条 GOTO，供后续场景名称提取使用
        current = [{ action: headlessActions.GOTO, href: event.href }]
        currentPathname = newPathname
        return // NAVIGATION 本身不再追加到 current
      }
    }

    current.push(event)
  })

  if (current.length > 0) groups.push(current)

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

      // ── 分割触发条件 1：路由跳转/页面加载（NAVIGATION）
      //    只要 current 里已积累了至少一个事件就拆分，覆盖：
      //    a. 传统 MPA 跳转（表单提交 + 新页面）
      //    b. SPA 登录后路由变化（/login → /dashboard）
      if (isNavigationAction(event.action) && current.length > 1) {
        scenarios.push({ type: getCaseType(current), events: current })
        current = []
        continue
      }

      // ── 分割触发条件 2：SPA 表单提交模式——提交类按钮点击后无 NAVIGATION，
      //    但后续还有新的交互（说明弹窗关闭 / 路由切换，进入下一个独立业务场景）
      //    检测：当前为提交/保存/确定/登录类点击，且下一个事件也是交互型（新场景开始）
      if (event.action === 'click' && current.some(item => isInteractiveAction(item.action))) {
        const label = resolveLabel(event)
        // eslint-disable-next-line max-len
        const isSubmitLikeAction = /^(保存|提交|确认|确定|发布|审核|新增|创建|添加|完成|登录|退出登录|注销)$/.test(
          label
        )
        if (isSubmitLikeAction) {
          const nextEvent = pageEvents[i + 1]
          const nextIsInteractive = nextEvent && isInteractiveAction(nextEvent.action)
          const nextIsNotNav = !nextEvent || !isNavigationAction(nextEvent.action)
          if (nextIsInteractive && nextIsNotNav) {
            scenarios.push({ type: getCaseType(current), events: current })
            current = []
          }
        }
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

  // 菜单导航路径（由 collapseMenuPath 合并而来）
  // 格式：点击导航菜单：绩效配置 → 绩效管理 → 绩效自评
  if (event._menuPath) {
    return `点击导航菜单：${event._menuPath.join(' → ')}`
  }

  // resolveLabel 优先用录制时采集的真实标签，降级才用选择器翻译
  const label = ['keydown', 'change'].includes(action)
    ? getInputLikeLabel(event)
    : normalizeTextLabel(resolveLabel(event))
  const labelStr = label ? `"${label}"` : '该元素'

  switch (action) {
    case headlessActions.GOTO:
      return `打开页面：${href}`
    case headlessActions.VIEWPORT:
      return `设置浏览器窗口大小为 ${value?.width || 0} × ${value?.height || 0}`
    case 'click': {
      // 点击日期/选择类字段时，补充语义提示（录制层已注入 formType 时生效）
      const clickVerb = getFormVerb(event.formType)
      if (clickVerb === 'date') return `点击${labelStr}（打开日期选择）`
      if (clickVerb === 'select') return `点击${labelStr}（展开选择）`
      if (clickVerb === 'file') return `点击${labelStr}（选择文件）`
      return `点击${labelStr}`
    }
    case 'keydown':
      return value ? `在${labelStr}中输入"${value}"` : `在${labelStr}中进行输入操作`
    case 'change': {
      // switch 翻转状态
      if (event.formType === 'switch') {
        return event.checked !== false ? `开启${labelStr}` : `关闭${labelStr}`
      }
      // checkbox / radio：勾选状态
      if (event.checked !== undefined) {
        return event.checked ? `勾选${labelStr}` : `取消勾选${labelStr}`
      }
      // file 上传
      if (event.formType === 'file') {
        return value ? `上传文件至${labelStr}：「${value}」` : `选择并上传文件至${labelStr}`
      }
      // 文本输入类（INPUT / TEXTAREA / FORMAT_INPUT）：用「输入」
      const changeVerb = getFormVerb(event.formType)
      if (changeVerb === 'input') {
        return value ? `在${labelStr}中输入"${value}"` : `在${labelStr}中进行输入操作`
      }
      // 日期/时间类：用「选择日期/时间」
      if (changeVerb === 'date') {
        return value ? `在${labelStr}中选择"${value}"` : `在${labelStr}中选择日期/时间`
      }
      // 其余（SELECT / RADIO / TREE 等）：用「选择」
      // 无 formType 时：从已解析的 label 推断——label 以「输入框/文本域」结尾 → 文本输入
      if (!event.formType) {
        const guessLabel = getInputLikeLabel(event)
        if (/输入框$|文本域$/.test(guessLabel)) {
          return value ? `在${labelStr}中输入"${value}"` : `在${labelStr}中进行输入操作`
        }
        if (/日期|时间|月份/.test(guessLabel)) {
          return value ? `在${labelStr}中选择"${value}"` : `在${labelStr}中选择日期/时间`
        }
      }
      return value ? `在${labelStr}中选择"${value}"` : `在${labelStr}中进行选择操作`
    }
    case headlessActions.NAVIGATION:
      return '等待页面加载完成'
    case headlessActions.SCREENSHOT:
      return value ? `对"${value}"区域进行截图` : '进行整页截图'
    default:
      return ''
  }
}

function getEventExpectationText(event = {}, caseType = DEFAULT_CASE_TYPE) {
  const { action, value, href } = event
  // 优先使用录制时的真实标签
  const label = ['keydown', 'change'].includes(action)
    ? getInputLikeLabel(event)
    : normalizeTextLabel(resolveLabel(event))

  // 菜单导航路径的预期：进入最终目标功能模块
  if (event._menuPath) {
    const target = event._menuPath[event._menuPath.length - 1]
    return `成功进入"${target}"功能模块页面`
  }

  switch (action) {
    case headlessActions.GOTO:
      return `成功打开页面，地址为 ${href}`
    case headlessActions.VIEWPORT:
      return `浏览器窗口尺寸调整为 ${event?.value?.width || 0} × ${event?.value?.height || 0}`
    case headlessActions.NOTICE: {
      // 录制时由 MutationObserver 捕获的系统通知（el-message / el-notification / el-alert）
      const typeLabel =
        { success: '成功消息', error: '错误消息', warning: '警告消息', info: '提示消息' }[
          event.noticeType
        ] || '消息提示'
      return `页面弹出${typeLabel}（el-message）：「${event.value || ''}」`
    }
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
      if (/保存按钮/.test(label)) {
        // 异常用例：保存按钮点击 + 无跳转 → 接口失败/校验失败预期
        if (caseType === CASE_TYPES.EXCEPTION) {
          return '页面给出错误提示（如"保存失败，请稍后重试"），表单数据不丢失，错误信息不暴露接口详情'
        }
        return '数据保存成功，列表中可查看到最新记录'
      }
      if (/^(保存|提交|确认|确定|发布|审核)$/.test(label)) {
        if (caseType === CASE_TYPES.EXCEPTION) {
          return `操作失败，页面给出明确错误提示，不暴露接口错误详情或堆栈信息，表单数据不丢失`
        }
        return `操作成功，页面给出成功提示`
      }
      if (/展开箭头/.test(label)) return '菜单展开，显示子菜单项'
      if (/菜单项/.test(label)) return '进入对应功能模块页面'
      if (/选项卡/.test(label)) return '切换至对应选项卡内容'
      if (/重置按钮/.test(label)) return '筛选条件清空，列表恢复默认展示'
      if (/查看详情/.test(label)) return '弹出详情对话框或跳转详情页'
      return `点击"${label || '该元素'}"后页面正常响应`
    }
    case 'keydown':
      return `"${label || '输入框'}"成功录入"${value || '操作内容'}"`
    case 'change': {
      // switch 翻转
      if (event.formType === 'switch') {
        return event.checked !== false ? `"${label || '开关'}"已开启` : `"${label || '开关'}"已关闭`
      }
      // checkbox / radio：勾选语义
      if (event.checked !== undefined) {
        return event.checked
          ? `"${label || '复选框'}"勾选成功`
          : `"${label || '复选框'}"取消勾选成功`
      }
      // file 上传
      if (event.formType === 'file') {
        return `文件已选择并成功上传至"${label || '文件上传框'}"`
      }
      // 文本输入类：录入成功
      const expVerb = getFormVerb(event.formType)
      if (expVerb === 'input') {
        return `"${label || '输入框'}"成功录入"${value || '操作内容'}"`
      }
      // 日期类
      if (expVerb === 'date') {
        return `"${label || '日期选择'}"已选中日期"${value}"`
      }
      // 其余选择类
      // 无 formType 时：从 label 推断，避免把文本输入误描述为「选中」
      if (!event.formType) {
        const guessLabel = getInputLikeLabel(event)
        if (/输入框$|文本域$/.test(guessLabel)) {
          return `"${label || '输入框'}"成功录入"${value || '操作内容'}"`
        }
        if (/日期|时间|月份/.test(guessLabel)) {
          return `"${label || '日期选择'}"已选中日期"${value}"`
        }
      }
      return `"${label || '下拉框'}"成功选中"${value}"`
    }
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
  const rows = new Map()
  const screenshots = new Set()

  deduplicateEvents(recording).forEach(event => {
    if (event.action === 'keydown' && event.selector && event.value) {
      const fieldName = getInputLikeLabel(event)
      const key = `input:${event.selector || fieldName}`
      rows.delete(key)
      rows.set(key, `${fieldName}：${event.value}`)
    }

    if (event.action === 'change' && event.selector) {
      const fieldName = getInputLikeLabel(event)
      const changeVerb = getFormVerb(event.formType)
      const hasValue =
        (event.value !== undefined && event.value !== null && event.value !== '') ||
        event.checked !== undefined

      if (!hasValue) return
      if (event.formType === 'switch' && event.checked !== undefined) {
        const key = `switch:${event.selector || fieldName}`
        rows.delete(key)
        rows.set(key, `${fieldName}：${event.checked ? '开启' : '关闭'}`)
        return
      }

      // checkbox / radio 的 change 没有有意义的"测试数据"（checked 状态不是数据）
      if (event.checked !== undefined) return

      const key = `change:${event.selector || fieldName}`
      rows.delete(key)
      if (event.formType === 'file') {
        rows.set(key, `${fieldName}（上传）：${event.value}`)
        return
      }
      if (changeVerb === 'input') {
        rows.set(key, `${fieldName}：${event.value}`)
        return
      }
      rows.set(key, `${fieldName}（选择）：${event.value}`)
    }

    if (event.action === headlessActions.SCREENSHOT) {
      screenshots.add(event.value ? `截图对象：${event.value}` : '截图对象：整页')
    }
  })

  return [...rows.values(), ...screenshots].join('；') || '无特殊测试数据'
}

/**
 * 步骤级别的事件过滤：只保留人工测试步骤中有意义的操作。
 * - VIEWPORT（设置窗口尺寸）：自动化配置细节，人工执行不需要
 * - NAVIGATION（等待页面加载）：人工测试隐含步骤，无需显式列出
 * - 连续多个 GOTO：只保留首个（同一场景内页面已确定，后续跳转另起场景）
 */
function isHumanStep(event, index, arr) {
  if (event.action === headlessActions.VIEWPORT) return false
  if (event.action === headlessActions.NAVIGATION) return false
  // NOTICE 是系统弹出的通知，属于"预期结果"而非"操作步骤"
  if (event.action === headlessActions.NOTICE) return false
  // 过滤「打开控件入口」click：
  //   a. 同 selector：click → keydown/change（内层 selector 相同）
  //   b. 不同 selector：click 的 label 是通用控件类型标签（如「输入框」「日期选择」），
  //      且下一个事件是交互型操作 → 该 click 仅为打开控件的入口，省略
  //   c. 录制层已注入 formType 的选择/日期类控件：click 后接 change，省略 click
  if (event.action === 'click') {
    const next = arr[index + 1]
    // case a：同 selector 相邻 click → keydown/change
    if (
      next &&
      ['keydown', 'change'].includes(next.action) &&
      event.selector &&
      next.selector &&
      event.selector === next.selector
    ) {
      return false
    }
    // case b：label 是通用控件类型标签 → 省略（下一步是任意交互操作时）
    if (next && isInteractiveAction(next.action)) {
      const clickLabel = normalizeTextLabel(resolveLabel(event))
      if (GENERIC_FORM_CLICK_LABELS.has(clickLabel)) return false
      // label 含类型后缀（如「备注输入框」「单位下拉选择框」）也属于控件入口，省略
      if (
        [...GENERIC_FORM_CLICK_LABELS].some(
          suffix => clickLabel.endsWith(suffix) && clickLabel !== suffix
        )
      )
        return false
    }
    // case c：formType 标注的选择/日期类控件，click 后接 change
    if (
      event.formType &&
      (SELECT_FORM_TYPES.has(event.formType) || DATE_FORM_TYPES.has(event.formType)) &&
      next &&
      next.action === 'change'
    ) {
      return false
    }
  }
  // GOTO 只保留场景内第一次出现（去掉因冒泡等产生的重复 GOTO）
  if (event.action === headlessActions.GOTO) {
    return arr.findIndex(e => e.action === headlessActions.GOTO) === index
  }
  return true
}

/**
 * 预期结果级别的事件过滤：比 isHumanStep 多保留 NOTICE（系统通知是预期结果的重要来源）。
 * - VIEWPORT / NAVIGATION：同样排除
 * - NOTICE：保留（用于生成"页面弹出 xxx 消息"的预期文本）
 */
function isExpectationRelevant(event, index, arr) {
  if (event.action === headlessActions.VIEWPORT) return false
  if (event.action === headlessActions.NAVIGATION) return false
  if (event.action === 'click') {
    const next = arr[index + 1]
    if (
      next &&
      ['keydown', 'change'].includes(next.action) &&
      event.selector &&
      next.selector &&
      event.selector === next.selector
    ) {
      return false
    }
    if (next && isInteractiveAction(next.action)) {
      const clickLabel = normalizeTextLabel(resolveLabel(event))
      if (GENERIC_FORM_CLICK_LABELS.has(clickLabel)) return false
      if (
        [...GENERIC_FORM_CLICK_LABELS].some(
          suffix => clickLabel.endsWith(suffix) && clickLabel !== suffix
        )
      ) {
        return false
      }
    }
    if (
      event.formType &&
      (SELECT_FORM_TYPES.has(event.formType) || DATE_FORM_TYPES.has(event.formType)) &&
      next &&
      next.action === 'change'
    ) {
      return false
    }
  }
  if (event.action === headlessActions.GOTO) {
    return arr.findIndex(e => e.action === headlessActions.GOTO) === index
  }
  return true
}

function buildSteps(recording = []) {
  // 先去除连续重复点击，再过滤自动化细节，最后生成步骤
  const rows = deduplicateEvents(recording)
    .filter(isHumanStep)
    .map(getEventActionText)
    .filter(Boolean)
    .map((text, index) => `${index + 1}. ${text}`)

  return listText(rows)
}

function buildExpectations(recording = [], caseType = DEFAULT_CASE_TYPE) {
  // 先去重，再过滤（保留 NOTICE，过滤 VIEWPORT/NAVIGATION），最后取预期
  const stepExpectations = deduplicateEvents(recording)
    .filter(isExpectationRelevant)
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
  const rawFeature = meta.feature || getScenarioName(recording, pageFeature)
  // 若调用方传入了功能基础描述，则拼接为「基础描述-场景名」；纯冒烟/仅打开页面时直接用基础描述
  const funcDesc = (meta.funcDesc || '').trim()
  const feature = funcDesc
    ? rawFeature && rawFeature !== pageFeature
      ? `${funcDesc}-${rawFeature}`
      : funcDesc
    : rawFeature

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
  constructor(options = {}) {
    // funcDesc：录制前用户手动填写的功能基础描述
    // 非空时，每条用例的「功能」列格式变为「基础描述-场景名」
    this._funcDesc = (options.funcDesc || '').trim()
  }

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
            funcDesc: this._funcDesc,
          })
        )
        index += 1
      })
    })

    return results
  }
}
