import browser from '../browser'

const activeTab = { id: 1, active: true }

const copyText = {
  data: '',
}

const cookies = [
    {
      name: 'checkly'
    }
  ]


window.chrome = {
  tabs: {
    create: jest.fn(),
    query: jest.fn((options, cb) => (cb([activeTab]))),
    executeScript: jest.fn((options, cb) => (cb(options))),
    sendMessage: jest.fn(),
  },
  runtime: {
    connect: jest.fn(),
    openOptionsPage: jest.fn()
  },
  scripting: {
    executeScript: jest.fn(() => Promise.resolve())
  },
  extension: {
    connect: jest.fn(),
  },
  cookies: {
    getAll: jest.fn((options, cb) => (cb(cookies)))
  },
  webNavigation: {
    getAllFrames: jest.fn((options, cb) => cb([{ frameId: 0 }, { frameId: 1 }, { frameId: 2 }])),
  },
}

global.navigator.permissions = {
  query: jest
    .fn()
    .mockImplementationOnce(() => Promise.resolve({ state: 'granted' })),
};

global.navigator.clipboard = {
  writeText: jest.fn(text => (copyText.data = text))
};

beforeEach(() => {
  window?.chrome?.tabs.create.mockClear()
  window?.chrome?.tabs.sendMessage.mockClear()
  window?.chrome?.runtime.connect.mockClear()
  window?.chrome?.scripting.executeScript.mockClear()
  window?.chrome?.runtime.openOptionsPage.mockClear()
  window?.chrome?.tabs.query.mockClear()
  window?.chrome?.webNavigation.getAllFrames.mockClear()
})

describe('getActiveTab', () => {
  it('returns the active tab', async () => {
    const activeTab = await browser.getActiveTab()
    expect(activeTab).toBe(activeTab)
    expect(window.chrome.tabs.query.mock.calls.length).toBe(1)
  })
})

describe('sendMessageToAllFrames', () => {
  it('sends message to all frames including iframes', async () => {
    await browser.sendMessageToAllFrames(1, { action: 'STOP' })
    // should have called sendMessage for frameId=0 (direct) + frameId=1 and frameId=2 (via getAllFrames)
    expect(window.chrome.tabs.sendMessage.mock.calls.length).toBe(3)
  })

  it('does nothing when tabId is falsy', async () => {
    await browser.sendMessageToAllFrames(null, { action: 'STOP' })
    expect(window.chrome.tabs.sendMessage.mock.calls.length).toBe(0)
  })
})

describe('copyToClipboard', () => {
  it('copies text to clipboard', async () => {
    await browser.copyToClipboard('data')
    expect(window.navigator.clipboard.writeText.mock.calls.length).toBe(1)
  })
})

describe('injectContentScript', () => {
  it('executes content script', async () => {
    await browser.injectContentScript()
    expect(window.chrome.scripting.executeScript.mock.calls.length).toBe(1)
  })
})

describe('injectContentScriptIntoTab', () => {
  it('executes content script into all frames of the given tab', async () => {
    await browser.injectContentScriptIntoTab(1)
    expect(window.chrome.scripting.executeScript.mock.calls.length).toBe(1)
    const callArg = window.chrome.scripting.executeScript.mock.calls[0][0]
    expect(callArg.target.tabId).toBe(1)
    expect(callArg.target.allFrames).toBe(true)
  })

  it('does nothing when tabId is falsy', async () => {
    const result = await browser.injectContentScriptIntoTab(null)
    expect(result).toBeNull()
    expect(window.chrome.scripting.executeScript.mock.calls.length).toBe(0)
  })
})

describe('injectContentScriptIntoFrame', () => {
  it('executes content script into the specified frame', async () => {
    await browser.injectContentScriptIntoFrame(3, 1)
    expect(window.chrome.scripting.executeScript.mock.calls.length).toBe(1)
    const callArg = window.chrome.scripting.executeScript.mock.calls[0][0]
    expect(callArg.target.tabId).toBe(1)
    expect(callArg.target.frameIds).toEqual([3])
  })

  it('falls back to active tab when tabId is not provided', async () => {
    await browser.injectContentScriptIntoFrame(3, null)
    // falls back to getActiveTab() which returns tab id 1
    expect(window.chrome.scripting.executeScript.mock.calls.length).toBe(1)
    const callArg = window.chrome.scripting.executeScript.mock.calls[0][0]
    expect(callArg.target.tabId).toBe(1)
    expect(callArg.target.frameIds).toEqual([3])
  })
})

describe('getChecklyCookie', () => {
  it('returns checkly cookie', async () => {
    await browser.getChecklyCookie()
    expect(window.chrome.cookies.getAll.mock.calls.length).toBe(1)
  })
})

describe('openChecklyRunner', () => {
  it('is not logged in', () => {
    browser.openChecklyRunner({code: 1, runner: 2, isLoggedIn: false})
    expect(window.chrome.tabs.create.mock.calls.length).toBe(1)
  })

  it('is logged in', () => {
    browser.openChecklyRunner({code: 1, runner: 2, isLoggedIn: true})
    expect(window.chrome.tabs.create.mock.calls.length).toBe(1)
  })
})

describe('getBackgroundBus', () => {
  it('gets backgorund bus', async () => {
    browser.getBackgroundBus()
    expect(window.chrome.runtime.connect.mock.calls.length).toBe(1)
  })
})

describe('openOptionsPage', () => {
  it('calls function that opens options page', async () => {
    browser.openOptionsPage()
    expect(window.chrome.runtime.openOptionsPage.mock.calls.length).toBe(1)
  })
})

describe('openHelpPage', () => {
  it('calls function that creates new tab and opens help page', async () => {
    browser.openHelpPage()
    expect(window.chrome.tabs.create.mock.calls.length).toBe(1)
  })
})


