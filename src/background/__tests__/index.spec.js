jest.mock('@/services/browser', () => ({
  __esModule: true,
  default: {
    getActiveTab: jest.fn(() => Promise.resolve({ id: 1 })),
    injectContentScript: jest.fn(() => Promise.resolve()),
    injectContentScriptIntoTab: jest.fn(() => Promise.resolve()),
    injectContentScriptIntoFrame: jest.fn(() => Promise.resolve()),
    sendTabMessage: jest.fn(() => Promise.resolve()),
  },
}))

jest.mock('@/services/badge', () => ({
  __esModule: true,
  default: {
    setText: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    pause: jest.fn(),
    reset: jest.fn(),
    wait: jest.fn(),
  },
}))

jest.mock('@/services/storage', () => ({
  __esModule: true,
  default: {
    get: jest.fn(() => Promise.resolve({ recording: [] })),
    set: jest.fn(() => Promise.resolve()),
    remove: jest.fn(() => Promise.resolve()),
  },
}))

jest.mock('@/modules/code-generator', () =>
  jest.fn().mockImplementation(() => ({
    generate: jest.fn(() => ''),
  }))
)

import browser from '@/services/browser'
import { Background } from '../index'

beforeAll(() => {
  global.chrome = {
    runtime: {
      onConnect: { addListener: jest.fn() },
      onMessage: { addListener: jest.fn(), removeListener: jest.fn() },
    },
    webNavigation: {
      onCompleted: { addListener: jest.fn(), removeListener: jest.fn() },
      onBeforeNavigate: { addListener: jest.fn(), removeListener: jest.fn() },
    },
    storage: {
      local: {
        remove: jest.fn((_, cb) => cb && cb()),
        set: jest.fn((_, cb) => cb && cb()),
      },
    },
    action: {
      setIcon: jest.fn(),
      setBadgeBackgroundColor: jest.fn(),
      setBadgeText: jest.fn(),
    },
    browserAction: {
      setIcon: jest.fn(),
      setBadgeBackgroundColor: jest.fn(),
      setBadgeText: jest.fn(),
    },
  }
})

beforeEach(() => {
  jest.clearAllMocks()
})

describe('Background.handleNavigation', () => {
  test('iframe 导航也会记录 NAVIGATION 事件，避免后续步骤丢失', async () => {
    const background = new Background()
    background._recordingTabId = 101
    const recordNavigation = jest.spyOn(background, 'recordNavigation').mockImplementation(() => {})

    await background.handleNavigation({
      frameId: 2,
      url: 'https://example.com/wizard/step-2',
      tabId: 101,
    })

    expect(browser.injectContentScriptIntoFrame).toHaveBeenCalledWith(2, 101)
    expect(recordNavigation).toHaveBeenCalledWith('https://example.com/wizard/step-2')
    expect(browser.injectContentScriptIntoTab).not.toHaveBeenCalled()
  })

  test('主 frame 导航仍保持原有录制行为', async () => {
    const background = new Background()
    background._recordingTabId = 101
    const recordNavigation = jest.spyOn(background, 'recordNavigation').mockImplementation(() => {})
    const toggleOverlay = jest.spyOn(background, 'toggleOverlay').mockImplementation(() => {})

    await background.handleNavigation({
      frameId: 0,
      url: 'https://example.com/dashboard',
      tabId: 101,
    })

    expect(browser.injectContentScriptIntoTab).toHaveBeenCalledWith(101)
    expect(toggleOverlay).toHaveBeenCalledWith({ open: true, pause: false })
    expect(recordNavigation).toHaveBeenCalledWith('https://example.com/dashboard')
  })
})
