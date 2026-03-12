export const headlessActions = {
  GOTO: 'GOTO',
  VIEWPORT: 'VIEWPORT',
  WAITFORSELECTOR: 'WAITFORSELECTOR',
  NAVIGATION: 'NAVIGATION',
  NAVIGATION_PROMISE: 'NAVIGATION_PROMISE',
  FRAME_SET: 'FRAME_SET',
  SCREENSHOT: 'SCREENSHOT',
  // Element UI / 通用 Toast 通知（el-message / el-notification / el-alert）
  // 由 Recorder MutationObserver 采集，记录系统对用户操作的反馈消息
  NOTICE: 'NOTICE',
}

export const eventsToRecord = {
  CLICK: 'click',
  DBLCLICK: 'dblclick',
  CHANGE: 'change',
  KEYDOWN: 'keydown',
  SELECT: 'select',
  SUBMIT: 'submit',
  LOAD: 'load',
  UNLOAD: 'unload',
}

export const headlessTypes = {
  PUPPETEER: 'puppeteer',
  PLAYWRIGHT: 'playwright',
}
