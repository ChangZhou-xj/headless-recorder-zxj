import getSelector from '@/services/selector'
import { recordingControls } from '@/services/constants'
import { overlaySelectors } from '@/modules/overlay/constants'
import { eventsToRecord, headlessActions } from '@/modules/code-generator/constants'

export default class Recorder {
  constructor({ store }) {
    // this._boundedMessageListener = null
    this._eventLog = []
    this._previousEvent = null

    this._isTopFrame = window.location === window.parent.location
    this._isRecordingClicks = true

    this.store = store
  }

  init(cb) {
    const events = Object.values(eventsToRecord)

    if (!window.pptRecorderAddedControlListeners) {
      this._addAllListeners(events)
      cb && cb()
      window.pptRecorderAddedControlListeners = true
    }

    if (!window.document.pptRecorderAddedControlListeners && chrome.runtime?.onMessage) {
      window.document.pptRecorderAddedControlListeners = true
    }

    if (this._isTopFrame) {
      this._sendMessage({ control: recordingControls.EVENT_RECORDER_STARTED })
      this._sendMessage({ control: recordingControls.GET_CURRENT_URL, href: window.location.href })
      this._sendMessage({
        control: recordingControls.GET_VIEWPORT_SIZE,
        coordinates: { width: window.innerWidth, height: window.innerHeight },
      })
    }

    // 监听 Element UI / 通用 Toast 通知组件，采集系统对用户操作的反馈消息
    this._observeNotices()

    // 监听 SPA 客户端路由变化，采集 pushState / hash 跳转的真实 URL
    if (this._isTopFrame) {
      this._observeRouteChanges()
    }
  }

  _addAllListeners(events) {
    const boundedRecordEvent = this._recordEvent.bind(this)
    events.forEach(type => window.addEventListener(type, boundedRecordEvent, true))
  }

  _sendMessage(msg) {
    // filter messages based on enabled / disabled features
    if (msg.action === 'click' && !this._isRecordingClicks) {
      return
    }

    try {
      chrome.runtime && chrome?.runtime?.onMessage
        ? chrome.runtime.sendMessage(msg)
        : this._eventLog.push(msg)
    } catch (err) {
      console.debug('caught error', err)
    }
  }

  _recordEvent(e) {
    if (this._previousEvent && this._previousEvent.timeStamp === e.timeStamp) {
      return
    }
    this._previousEvent = e

    // we explicitly catch any errors and swallow them, as none node-type events are also ingested.
    // for these events we cannot generate selectors, which is OK
    try {
      const selector = getSelector(e, { dataAttribute: this.store.state.dataAttribute })

      if (selector.includes('#' + overlaySelectors.OVERLAY_ID)) {
        return
      }

      this.store.commit('showRecorded')

      // ── 补充 change 事件的语义值 ──────────────────────────────────────────
      // 1. 原生 <select>：e.target.value = option 的 value 属性（通常是数字 ID），
      //    记录人类可读的展示文字更有意义。
      // 2. checkbox / radio：e.target.value 是 "on" 或自定义属性，没有语义；
      //    真正有意义的是 checked 布尔值。
      let recordValue = e.target.value
      let checkedPayload = {}

      if (e.type === 'change') {
        if (e.target.tagName === 'SELECT') {
          const idx = e.target.selectedIndex
          if (idx >= 0) {
            const optText = (e.target.options[idx].text || '').trim()
            if (optText) recordValue = optText
          }
        } else if (e.target.type === 'checkbox' || e.target.type === 'radio') {
          checkedPayload = { checked: e.target.checked }
        }
      }
      // ─────────────────────────────────────────────────────────────────────

      this._sendMessage({
        selector,
        value: recordValue,
        tagName: e.target.tagName,
        action: e.type,
        keyCode: e.keyCode ? e.keyCode : null,
        href: e.target.href ? e.target.href : null,
        coordinates: Recorder._getCoordinates(e),
        // 采集元素的业务语义标签，供测试用例生成器直接使用
        label: Recorder._getElementLabel(e.target),
        ...checkedPayload,
      })
    } catch (err) {
      console.error(err)
    }
  }

  _getEventLog() {
    return this._eventLog
  }

  _clearEventLog() {
    this._eventLog = []
  }

  disableClickRecording() {
    this._isRecordingClicks = false
  }

  enableClickRecording() {
    this._isRecordingClicks = true
  }

  static _getCoordinates(evt) {
    const eventsWithCoordinates = {
      mouseup: true,
      mousedown: true,
      mousemove: true,
      mouseover: true,
    }

    return eventsWithCoordinates[evt.type] ? { x: evt.clientX, y: evt.clientY } : null
  }

  /**
   * 从 DOM 元素中提取最具业务意义的可读标签。
   * 优先级：aria-label > 关联 <label> 文本 > placeholder > 自身可见文本 > title > name
   *
   * 对 Element UI 图标/装饰元素会自动上溯父节点，取父元素的业务语义文字，
   * 避免 el-icon-* / el-input__suffix 等纯视觉元素产生无意义标签。
   *
   * 这是生成「业务视角」测试用例的核心数据来源，比事后解析 CSS 选择器准确得多。
   */
  static _getElementLabel(el) {
    if (!el) return ''

    const tag = (el.tagName || '').toLowerCase()

    // SVG 图标元素（use/path/circle/rect/g 等）没有业务语义，直接跳过
    const SVG_TAGS = new Set([
      'svg',
      'use',
      'path',
      'circle',
      'rect',
      'polygon',
      'polyline',
      'ellipse',
      'line',
      'g',
      'symbol',
      'defs',
    ])
    if (SVG_TAGS.has(tag)) return ''
    // 若元素在 SVG 内部（如 <i> 包裹的 SVG 图标）也跳过
    if (el.closest && el.closest('svg')) return ''

    // 0. Element UI 图标字体 / 表单装饰槽 → 上溯父节点取业务语义
    //    场景：用户点击了 el-submenu 的展开箭头 <i class="el-icon-arrow-down">，
    //          父元素 <div class="el-submenu__title"> 含有菜单文字，
    //          需要上溯找到 "绩效管理" 而非返回空值或翻译为"展开箭头"。
    const elCls = (el.getAttribute('class') || '').toLowerCase()
    // 判断是否为纯装饰元素
    const isIconFont =
      (tag === 'i' || tag === 'em') &&
      (/\bel-icon\b/.test(elCls) || /\bel-icon-/.test(elCls) || !elCls)
    // eslint-disable-next-line max-len
    const isDecorativeSlot = /el-input__(suffix|prefix|suffix-inner|prefix-inner)|el-select__caret|el-submenu__icon-arrow|el-collapse-item__arrow|el-tree-node__expand-icon|el-table__expand-icon/.test(
      elCls
    )
    if (isIconFont || isDecorativeSlot) {
      return Recorder._getLabelFromAncestor(el)
    }

    // 0-b. el-checkbox / el-radio：真实目标是隐藏的 <input type="checkbox/radio">，
    //      业务语义在旁边的 .el-checkbox__label / .el-radio__label span 里。
    //      优先取该 span 文字；找不到则取 closest label 的文字；
    //      最终实在找不到就回退为 "复选框" / "单选框"。
    if (tag === 'input') {
      const inputType = (el.getAttribute('type') || '').toLowerCase()
      if (inputType === 'checkbox') {
        const wrapper = el.closest && el.closest('.el-checkbox, .el-checkbox-button')
        if (wrapper) {
          const labelSpan =
            wrapper.querySelector('.el-checkbox__label') ||
            wrapper.querySelector('.el-checkbox-button__inner')
          const text = (labelSpan?.textContent || '').trim()
          if (text) return text
        }
      }
      if (inputType === 'radio') {
        const wrapper = el.closest && el.closest('.el-radio, .el-radio-button')
        if (wrapper) {
          const labelSpan =
            wrapper.querySelector('.el-radio__label') ||
            wrapper.querySelector('.el-radio-button__inner')
          const text = (labelSpan?.textContent || '').trim()
          if (text) return text
        }
      }
    }

    // 1. aria-label（无障碍标签，通常等同于业务名）
    const ariaLabel = (el.getAttribute('aria-label') || '').trim()
    if (ariaLabel) return ariaLabel

    // 2. 关联 <label> 元素文本
    //    先通过 id 找 label[for]，再尝试 closest('label')
    if (el.id) {
      const labelEl = document.querySelector(`label[for="${el.id}"]`)
      const labelText = (labelEl?.textContent || '').replace(/\s*[*：:]\s*$/, '').trim()
      if (labelText) return labelText
    }
    const closestLabel = el.closest('label')
    if (closestLabel) {
      const labelText = (closestLabel.textContent || '').replace(/\s*[*：:]\s*$/, '').trim()
      if (labelText) return labelText
    }

    // 3. placeholder（输入框最常见的提示文字）
    const placeholder = (el.getAttribute('placeholder') || '').trim()
    if (placeholder) return placeholder

    // 4. 自身可见文本（按钮、链接、菜单项）
    if (['button', 'a', 'span', 'div', 'li'].includes(tag)) {
      // 只取直接文本节点，避免把整个树的文本全拼入
      const directText = Array.from(el.childNodes)
        .filter(n => n.nodeType === Node.TEXT_NODE)
        .map(n => n.textContent.trim())
        .filter(Boolean)
        .join('')
      if (directText) {
        // 去除菜单项开头的业务代码前缀，如 "1000001 绩效管理" → "绩效管理"
        return directText.replace(/^\d{4,}\s+/, '').trim() || directText
      }

      // 若无直接文本，取全部 textContent 并截断（菜单项等嵌套结构）
      const fullText = (el.textContent || '').trim().replace(/\s+/g, ' ')
      if (fullText && fullText.length <= 20) {
        return fullText.replace(/^\d{4,}\s+/, '').trim() || fullText
      }
    }

    // 5. title 属性
    const title = (el.getAttribute('title') || '').trim()
    if (title) return title

    // 6. name 属性（表单字段时有意义）
    const name = (el.getAttribute('name') || '').trim()
    if (name) return name

    // 7. input 的 type hint（如 type="password" → 密码框）
    if (tag === 'input') {
      const type = (el.getAttribute('type') || 'text').toLowerCase()
      const typeMap = {
        password: '密码输入框',
        email: '邮箱输入框',
        tel: '手机号输入框',
        number: '数字输入框',
        search: '搜索输入框',
        file: '文件上传',
        checkbox: '复选框',
        radio: '单选框',
        submit: '提交按钮',
        button: '按钮',
        reset: '重置按钮',
      }
      if (typeMap[type]) return typeMap[type]
    }

    return ''
  }

  /**
   * 用 MutationObserver 监听 Element UI 消息通知组件的出现。
   * 覆盖场景：
   *   - this.$message.success/error/warning/info  → .el-message
   *   - this.$notify.success/error/...            → .el-notification
   *   - <el-alert>                                → .el-alert（静态展示，也捕获）
   *
   * 采集到通知后发送 { action: 'NOTICE', noticeType, value } 事件，
   * 供测试用例生成器填写"预期结果"字段，不对用户操作步骤造成影响。
   */
  /**
   * 监听 SPA 客户端路由变化，在路由切换时主动发送带有新 URL 的 NAVIGATION 事件。
   *
   * 覆盖以下四种 SPA 跳转方式：
   *   1. hash 模式路由（Vue Router hash mode）    → hashchange
   *   2. history 模式浏览器前进/后退               → popstate
   *   3. history.pushState（Vue Router history mode 正向跳转）→ monkey-patch
   *   4. history.replaceState（重定向/登录后替换当前记录） → monkey-patch
   *
   * 为什么不依赖 chrome.webNavigation.onCompleted：
   *   该事件只在「完整页面加载」时触发，SPA 的客户端路由切换
   *   不产生网络请求，因此不会触发，导致 NAVIGATION 事件无 href。
   */
  _observeRouteChanges() {
    // 防止多次注入重复监听
    if (window.pptRecorderAddedRouteListeners) return
    window.pptRecorderAddedRouteListeners = true

    const sendNav = href => {
      this._sendMessage({
        action: headlessActions.NAVIGATION,
        href,
      })
    }

    // ── 1. Hash 路由（Vue Router hash 模式）
    window.addEventListener('hashchange', () => {
      sendNav(window.location.href)
    })

    // ── 2. 浏览器前进 / 后退触发的 popstate
    window.addEventListener('popstate', () => {
      sendNav(window.location.href)
    })

    // ── 3 & 4. Vue Router history 模式（pushState / replaceState）
    //    调用后 URL 立即更新，window.location.href 即为新地址
    const origPush = history.pushState.bind(history)
    history.pushState = (state, title, url) => {
      origPush(state, title, url)
      sendNav(window.location.href)
    }

    const origReplace = history.replaceState.bind(history)
    history.replaceState = (state, title, url) => {
      origReplace(state, title, url)
      sendNav(window.location.href)
    }
  }

  _observeNotices() {
    if (!window.MutationObserver || !window.document.body) return

    // 用类名 → 语义类型 映射
    const TYPE_MAP = {
      'el-message--success': 'success',
      'el-message--error': 'error',
      'el-message--warning': 'warning',
      'el-message--info': 'info',
      'el-notification--success': 'success',
      'el-notification--error': 'error',
      'el-notification--warning': 'warning',
      'el-notification--info': 'info',
      'el-alert--success': 'success',
      'el-alert--error': 'error',
      'el-alert--warning': 'warning',
      'el-alert--info': 'info',
    }

    // 提取通知节点的语义类型
    const resolveType = el => {
      const cls = el.getAttribute('class') || ''
      for (const [key, val] of Object.entries(TYPE_MAP)) {
        if (cls.includes(key)) return val
      }
      // 无类型标识时，根据组件根类判断是否为通知类组件
      if (/el-message|el-notification|el-alert/.test(cls)) return 'info'
      return null
    }

    // 提取通知文字：优先 __content / __title，降级取 textContent
    const resolveText = el => {
      const content =
        el.querySelector('.el-message__content') ||
        el.querySelector('.el-notification__content') ||
        el.querySelector('.el-notification__title') ||
        el.querySelector('.el-alert__description') ||
        el.querySelector('.el-alert__title')
      const raw = (content ? content.textContent : el.textContent) || ''
      return raw
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 120) // 截断超长消息
    }

    // 识别节点本身或其子节点中是否包含通知组件
    const tryCapture = node => {
      if (node.nodeType !== Node.ELEMENT_NODE) return

      const candidates = []
      const cls = node.getAttribute('class') || ''
      if (/el-message\b|el-notification\b|el-alert\b/.test(cls)) {
        candidates.push(node)
      }
      // 也检查新增节点的直接子级（通知容器有时包裹一层）
      node
        .querySelectorAll?.('.el-message, .el-notification, .el-alert')
        .forEach(c => candidates.push(c))

      candidates.forEach(el => {
        const noticeType = resolveType(el)
        if (!noticeType) return
        const text = resolveText(el)
        if (!text) return

        this._sendMessage({
          action: 'NOTICE',
          noticeType, // 'success' | 'error' | 'warning' | 'info'
          value: text,
          selector: `.el-message--${noticeType}`,
        })
      })
    }

    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(tryCapture)
      })
    })

    observer.observe(window.document.body, { childList: true, subtree: true })
  }

  /**
   * 从目标元素的祖先节点中提取最近的业务语义文字。
   * 专用于 Element UI 图标字体（el-icon-*）和表单装饰槽等纯视觉元素：
   * 这些元素本身无文字，但其父元素（菜单项标题、按钮体等）有确切的业务名称。
   *
   * 匹配策略（每一层按优先级依次尝试）：
   *   1. aria-label
   *   2. 直接文本节点（菜单项 <span> 等）
   *   3. 第一个含文字的 span/a/button 子元素（el-submenu__title > span + i 结构）
   *   4. placeholder（落到 input 父元素时）
   * 最多上溯 6 层，避免上溯到无关容器。
   */
  static _getLabelFromAncestor(el) {
    const STOP_AT = new Set([
      'body',
      'html',
      'form',
      'main',
      'section',
      'article',
      'header',
      'footer',
    ])
    // 跳过装饰性 class，不把同级其他图标的父容器文字带进来
    const SKIP_CLS = /el-icon-|el-input__(suffix|prefix)|el-select__caret/

    let parent = el.parentElement
    for (let hop = 0; hop < 6 && parent; hop++) {
      const pTag = (parent.tagName || '').toLowerCase()
      if (STOP_AT.has(pTag)) break

      // 1. aria-label
      const pAria = (parent.getAttribute('aria-label') || '').trim()
      if (pAria) return pAria

      // 2. 直接文本节点（形如 <li>直接文字</li> 或 <div class="title">文字</div>）
      const directText = Array.from(parent.childNodes)
        .filter(n => n.nodeType === Node.TEXT_NODE)
        .map(n => n.textContent.trim())
        .filter(Boolean)
        .join('')
      if (directText) return directText.replace(/^\d{4,}\s+/, '').trim() || directText

      // 3. 子元素中第一个含文字的 span/a/button（覆盖 el-submenu__title > span + i 结构）
      const textChild = Array.from(parent.children).find(c => {
        const ct = (c.tagName || '').toLowerCase()
        const cc = (c.getAttribute('class') || '').toLowerCase()
        return (
          ['span', 'a', 'button'].includes(ct) && !SKIP_CLS.test(cc) && (c.textContent || '').trim()
        )
      })
      if (textChild) {
        const t = (textChild.textContent || '').trim()
        if (t) return t.replace(/^\d{4,}\s+/, '').trim() || t
      }

      // 4. placeholder（父元素是 input 时）
      const pPlaceholder = (parent.getAttribute('placeholder') || '').trim()
      if (pPlaceholder) return pPlaceholder

      parent = parent.parentElement
    }
    return ''
  }
}
