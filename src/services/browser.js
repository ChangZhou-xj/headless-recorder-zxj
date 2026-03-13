const CONTENT_SCRIPT_PATH = 'js/content-script.js'
const RUN_URL = 'https://app.checklyhq.com/checks/new/browser'
const DOCS_URL = 'https://github.com/checkly/headless-recorder#readme'
const SIGNUP_URL =
  'https://www.checklyhq.com/product/synthetic-monitoring/?utm_source=Chrome+Extension&utm_medium=Headless+Recorder+Chrome+Extension&utm_campaign=Headless+Recorder&utm_id=Open+Source'

export default {
  getActiveTab() {
    return new Promise(function(resolve) {
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => resolve(tab))
    })
  },

  async sendTabMessage({ action, value, clean } = {}) {
    const tab = await this.getActiveTab()
    chrome.tabs.sendMessage(tab.id, { action, value, clean })
  },

  /**
   * 向指定 tab 的所有帧（主框架 + 所有 iframe）广播消息。
   * 通过 chrome.webNavigation.getAllFrames 枚举帧 ID，挨个发送。
   */
  async sendMessageToAllFrames(tabId, msg) {
    if (!tabId) return
    // 先发给顶层帧（frameId=0），保证即使 getAllFrames 失败也能到达主页面
    chrome.tabs.sendMessage(tabId, msg, { frameId: 0 })
    // 再枚举子帧并逐一发送
    try {
      const frames = await new Promise(resolve => {
        chrome.webNavigation.getAllFrames({ tabId }, res => resolve(res || []))
      })
      frames.forEach(({ frameId }) => {
        if (frameId !== 0) {
          chrome.tabs.sendMessage(tabId, msg, { frameId })
        }
      })
    } catch (e) {
      // webNavigation 不可用时静默忽略（如 webNavigation 权限未批准等异常）
      void e
    }
  },

  async injectContentScript() {
    const tab = await this.getActiveTab()

    if (!tab?.id) {
      return null
    }

    if (chrome.scripting?.executeScript) {
      return chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        files: [CONTENT_SCRIPT_PATH],
      })
    }

    return new Promise(function(resolve) {
      chrome.tabs.executeScript({ file: CONTENT_SCRIPT_PATH, allFrames: true }, res => resolve(res))
    })
  },

  // 仅将 content script 注入到指定 frameId，用于 iframe 动态加载场景。
  // tabId 参数优先使用（来自 webNavigation 事件），避免 getActiveTab() 因 tab 切换而注入错误 tab。
  async injectContentScriptIntoFrame(frameId, tabId) {
    const tab = tabId ? { id: tabId } : await this.getActiveTab()

    if (!tab?.id) {
      return null
    }

    if (chrome.scripting?.executeScript) {
      return chrome.scripting.executeScript({
        target: { tabId: tab.id, frameIds: [frameId] },
        files: [CONTENT_SCRIPT_PATH],
      })
    }

    return new Promise(function(resolve) {
      chrome.tabs.executeScript(tab.id, { file: CONTENT_SCRIPT_PATH, frameId }, res => resolve(res))
    })
  },

  /**
   * 将 content script 注入到指定 tabId 的所有帧（含已有 iframe）。
   * 用于 MutationObserver 检测到页面动态新增 iframe 时的补注入场景。
   */
  async injectContentScriptIntoTab(tabId) {
    if (!tabId) return null

    if (chrome.scripting?.executeScript) {
      return chrome.scripting.executeScript({
        target: { tabId, allFrames: true },
        files: [CONTENT_SCRIPT_PATH],
      })
    }

    return new Promise(function(resolve) {
      chrome.tabs.executeScript(tabId, { file: CONTENT_SCRIPT_PATH, allFrames: true }, res =>
        resolve(res)
      )
    })
  },

  copyToClipboard(text) {
    return navigator.permissions.query({ name: 'clipboard-write' }).then(result => {
      if (result.state !== 'granted' && result.state !== 'prompt') {
        return Promise.reject()
      }

      navigator.clipboard.writeText(text)
    })
  },

  getChecklyCookie() {
    return new Promise(function(resolve) {
      chrome.cookies.getAll({}, res =>
        resolve(res.find(cookie => cookie.name.startsWith('checkly_has_account')))
      )
    })
  },

  getBackgroundBus() {
    return chrome.runtime.connect({ name: 'recordControls' })
  },

  openOptionsPage() {
    chrome.runtime.openOptionsPage?.()
  },

  openHelpPage() {
    chrome.tabs.create({ url: DOCS_URL })
  },

  openChecklyRunner({ code, runner, isLoggedIn }) {
    if (!isLoggedIn) {
      chrome.tabs.create({ url: SIGNUP_URL })
      return
    }

    const script = encodeURIComponent(btoa(code))
    const url = `${RUN_URL}?framework=${runner}&script=${script}`
    chrome.tabs.create({ url })
  },
}
