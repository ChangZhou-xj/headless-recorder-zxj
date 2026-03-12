import getSelector from '@/services/selector'
import { recordingControls } from '@/services/constants'
import { overlaySelectors } from '@/modules/overlay/constants'
import { eventsToRecord } from '@/modules/code-generator/constants'

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

      this._sendMessage({
        selector,
        value: e.target.value,
        tagName: e.target.tagName,
        action: e.type,
        keyCode: e.keyCode ? e.keyCode : null,
        href: e.target.href ? e.target.href : null,
        coordinates: Recorder._getCoordinates(e),
        // 采集元素的业务语义标签，供测试用例生成器直接使用
        label: Recorder._getElementLabel(e.target),
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
   * 这是生成「业务视角」测试用例的核心数据来源，比事后解析 CSS 选择器准确得多。
   */
  static _getElementLabel(el) {
    if (!el) return ''

    const tag = (el.tagName || '').toLowerCase()

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
      if (directText) return directText

      // 若无直接文本，取全部 textContent 并截断（菜单项等嵌套结构）
      const fullText = (el.textContent || '').trim().replace(/\s+/g, ' ')
      if (fullText && fullText.length <= 20) return fullText
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
}
