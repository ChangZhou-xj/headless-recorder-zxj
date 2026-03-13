export const recordingControls = {
  EVENT_RECORDER_STARTED: 'EVENT_RECORDER_STARTED',
  GET_VIEWPORT_SIZE: 'GET_VIEWPORT_SIZE',
  GET_CURRENT_URL: 'GET_CURRENT_URL',
  GET_SCREENSHOT: 'GET_SCREENSHOT',
  // 顶层 content script 检测到新 iframe 时发送给后台，请求重新注入所有帧
  INJECT_ALL_FRAMES: 'INJECT_ALL_FRAMES',
}

export const popupActions = {
  START: 'START',
  STOP: 'STOP',
  CLEAN_UP: 'CLEAN_UP',
  PAUSE: 'PAUSE',
  UN_PAUSE: 'UN_PAUSE',
}

export const isDarkMode = () =>
  window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : false
