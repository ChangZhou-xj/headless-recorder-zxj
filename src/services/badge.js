const DEFAULT_COLOR = '#45C8F1'
const RECORDING_COLOR = '#FF0000'

const DEFAULT_LOGO = './images/logo.png'
const RECORDING_LOGO = './images/logo-red.png'
const PAUSE_LOGO = './images/logo-yellow.png'

function getActionApi() {
  return chrome.action || chrome.browserAction
}

export default {
  stop(text) {
    getActionApi().setIcon({ path: DEFAULT_LOGO })
    getActionApi().setBadgeBackgroundColor({ color: DEFAULT_COLOR })
    this.setText(text)
  },

  reset() {
    this.setText('')
  },

  setText(text) {
    getActionApi().setBadgeText({ text })
  },

  pause() {
    getActionApi().setIcon({ path: PAUSE_LOGO })
  },

  start() {
    getActionApi().setIcon({ path: RECORDING_LOGO })
  },

  wait() {
    getActionApi().setBadgeBackgroundColor({ color: RECORDING_COLOR })
    this.setText('wait')
  },
}
