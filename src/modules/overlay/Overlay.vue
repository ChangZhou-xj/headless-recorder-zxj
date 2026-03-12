<template>
  <nav
    v-show="!screenshotMode"
    :class="{
      'hr-event-recorded': hasRecorded && !isPaused && !isStopped,
      dark: darkMode,
      hide: !show,
    }"
  >
    <template v-if="isStopped">
      <div class="hr-success-message">
        <h3>录制完成</h3>
        <p>请打开扩展弹窗查看测试用例，并导出 Excel 表格。</p>
      </div>
      <div class="hr-success-bar">
        <button @click="restart" class="hr-btn-large">
          <img width="16" height="16" :src="getIcon('sync')" alt="重新录制" />
          重新录制
        </button>
        <button @click="close" class="hr-btn-close">
          &times;
        </button>
      </div>
    </template>
    <template v-else>
      <div class="hr-rec" v-show="!isPaused">
        <span class="hr-red-dot"></span>
        录制中
      </div>
      <span class="hr-shortcut">
        Alt + K 隐藏
      </span>
      <button
        class="hr-btn"
        title="stop"
        @click="stop"
        v-tippy="{ content: '停止录制', appendTo: 'parent' }"
      >
        <div class="hr-stop-square"></div>
      </button>
      <button
        class="hr-btn"
        title="pause"
        @click="pause"
        v-tippy="{ content: isPaused ? '继续录制' : '暂停录制', appendTo: 'parent' }"
      >
        <img v-show="isPaused" width="27" height="27" :src="getIcon('play')" alt="继续录制" />
        <img v-show="!isPaused" width="27" height="27" :src="getIcon('pause')" alt="暂停录制" />
      </button>
      <div class="hr-separator"></div>
      <button
        :disabled="isPaused"
        class="hr-btn-big"
        @click.prevent="fullScreenshot"
        v-tippy="{ content: '整页截图（Alt+Shift+F）', appendTo: 'parent' }"
      >
        <img width="27" height="27" :src="getIcon('screen')" alt="整页截图" />
      </button>
      <button
        :disabled="isPaused"
        class="hr-btn-big"
        @click.prevent="clippedScreenshot"
        v-tippy="{ content: '元素截图（Alt+Shift+E）', appendTo: 'parent' }"
      >
        <img width="27" height="27" :src="getIcon('clip')" alt="元素截图" />
      </button>
      <div class="hr-separator"></div>
      <span class="hr-current-selector">
        {{ currentSelector }}
      </span>
    </template>
  </nav>
</template>

<script>
import { directive } from 'vue-tippy'
import 'tippy.js/dist/tippy.css'

import { mapState, mapMutations } from 'vuex'

export default {
  name: 'Overlay',
  directives: { tippy: directive },

  data() {
    return {
      currentSelector: '',
      show: true,
    }
  },

  computed: {
    ...mapState([
      'isPaused',
      'isStopped',
      'screenshotMode',
      'darkMode',
      'hasRecorded',
      'recording',
    ]),
  },

  mounted() {
    window.document.body.addEventListener('keyup', this.keyupListener, false)
  },

  beforeUnmount() {
    window.document.body.removeEventListener('keyup', this.keyupListener, false)
  },

  methods: {
    ...mapMutations(['stop', 'close', 'restart']),

    getIcon(icon) {
      return browser.runtime.getURL(`icons/${this.darkMode ? 'dark' : 'light'}/${icon}.svg`)
    },

    toggle() {
      this.show = !this.show
    },

    pause() {
      this.isPaused ? this.$store.commit('unpause') : this.$store.commit('pause')
    },

    fullScreenshot() {
      this.$store.commit('startScreenshotMode', false)
    },

    clippedScreenshot() {
      this.$store.commit('startScreenshotMode', true)
    },

    keyupListener(e) {
      if (!e.altKey) {
        return
      }

      if (e.key === 'k') {
        this.toggle()
      }

      if (e.key === 'F') {
        this.fullScreenshot()
      }

      if (e.key === 'E') {
        this.clippedScreenshot()
      }
    },
  },
}
</script>

<style>
@import '../../assets/animations.css';

#headless-recorder-overlay .hr-button-open {
  position: fixed;
  bottom: 10px;
  left: 0;
  right: 0;
}

#headless-recorder-overlay button {
  border: none;
  margin: 0 10px 0 0;
  padding: 0;
  overflow: visible;
  background: transparent;
  color: inherit;
  font: inherit;
  line-height: normal;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
}

#headless-recorder-overlay nav {
  font-family: sans-serif;
  box-sizing: border-box;
  animation-name: slideup;
  border: solid 2px #f9fafc;
  animation-duration: 0.3s;
  animation-iteration-count: 1;
  animation-timing-function: ease-in-out;
  display: flex;
  align-items: center;
  z-index: 2147483647;
  position: fixed;
  bottom: 10px;
  left: 0;
  right: 0;
  margin-left: auto;
  margin-right: auto;
  font-size: 12px;
  color: #1f2d3d;
  padding: 20px 16px;
  transition: all 0.1s ease;
  width: 828px;
  height: 72px;
  background: #f9fafc;
  box-shadow: 0px 5px 25px rgba(0, 0, 0, 0.15);
  border-radius: 6px;
}

#headless-recorder-overlay nav.hr-event-recorded {
  border: solid 2px #45c8f1 !important;
  transition: all 0.1s linear;
}

#headless-recorder-overlay nav .hr-btn-big {
  padding: 5px 15px;
  background: #eff2f7;
  border-radius: 3px;
}

#headless-recorder-overlay nav .hr-btn-big:disabled {
  cursor: not-allowed;
}

#headless-recorder-overlay nav .hr-btn {
  padding: 5px 0;
}

#headless-recorder-overlay nav .hr-btn-large {
  border-radius: 3px;
  background: #eff2f7;
  padding: 9px 17px 9px 8px;
  color: #1f2d3d;
  font-weight: 600;
  margin-right: 16px;
}

#headless-recorder-overlay nav .hr-btn-large:last-of-type {
  margin-right: 0;
}

#headless-recorder-overlay nav .hr-btn-large:hover {
  background: #e0e6ed;
}

#headless-recorder-overlay nav .hr-btn-large img {
  margin-right: 8px;
}

#headless-recorder-overlay nav .hr-btn-close {
  font-size: 18px;
  color: #161616;
  margin-right: 0;
}

#headless-recorder-overlay nav .hr-shortcut {
  color: #8492a6;
  margin-right: 0;
  font-family: sans-serif;
  position: absolute;
  top: 4px;
  right: 4px;
}

#headless-recorder-overlay nav .hr-rec {
  font-family: sans-serif;
  animation: pulse 2s infinite;
  font-size: 12px;
  position: absolute;
  top: 4px;
  left: 4px;
  font-weight: 600;
  color: #ff4949;
  text-transform: uppercase;
}

#headless-recorder-overlay nav .hr-red-dot {
  display: inline-block;
  border-radius: 50%;
  width: 9px;
  height: 9px;
  background: #ff4949;
}

#headless-recorder-overlay nav .hr-separator {
  width: 1px;
  height: 32px;
  background: #e0e6ed;
  margin-right: 0.8rem;
}

#headless-recorder-overlay nav .hr-stop-square {
  width: 24px;
  height: 24px;
  border-radius: 3px;
  background-color: #1f2d3d;
}

#headless-recorder-overlay nav .hr-current-selector {
  font-weight: 500;
  font-size: 10px;
  line-height: 20px;
  font-family: monospace;
}

#headless-recorder-overlay nav .hr-success-bar {
  display: flex;
  width: 60%;
  justify-content: flex-end;
}

#headless-recorder-overlay nav .hr-success-message {
  width: 40%;
}

#headless-recorder-overlay nav .hr-success-message h3 {
  font-size: 14px;
  font-weight: 600;
  margin: 0;
  color: #1f2d3d;
}

#headless-recorder-overlay nav .hr-success-message p {
  font-size: 12px;
  margin: 0;
  color: #3c4858;
}

#headless-recorder-overlay nav .tippy-box {
  box-shadow: 0px 5px 25px rgba(0, 0, 0, 0.15);
  margin-top: -45px;
  color: #1f2d3d;
  background: #f9fafc;
  border-radius: 4px;
}

#headless-recorder-overlay nav .tippy-arrow {
  color: #f9fafc;
}

#headless-recorder-overlay nav.dark {
  background: #161616;
  border: solid 2px #161616;
  color: #f9fafc;
}

#headless-recorder-overlay nav.dark .hr-btn-big {
  padding: 5px 15px;
  background: #2e2e2e;
  border-radius: 3px;
}

#headless-recorder-overlay nav.dark .hr-btn-large {
  background: #1f2d3d;
  color: #f9fafc;
}

#headless-recorder-overlay nav.dark .hr-btn-large:hover {
  background: #474747;
}

#headless-recorder-overlay nav.dark .hr-btn-close,
#headless-recorder-overlay nav.dark .hr-btn-label,
#headless-recorder-overlay nav.dark .hr-btn-up {
  color: #fff;
}

#headless-recorder-overlay nav.dark .hr-btn-up {
  background: #161616;
}

#headless-recorder-overlay nav.dark .hr-success-message h3 {
  color: #fff;
}

#headless-recorder-overlay nav.dark .hr-success-message p {
  color: #e0e6ed;
}

#headless-recorder-overlay nav.dark .hr-separator {
  background: #2e2e2e;
}

#headless-recorder-overlay nav.dark .hr-stop-square {
  background-color: #f9fafc;
}

#headless-recorder-overlay nav.dark .tippy-box {
  color: #f9fafc;
  background: #161616;
}

#headless-recorder-overlay nav.dark .tippy-arrow {
  color: #161616;
}

#headless-recorder-overlay nav.hide {
  transform: translateY(82px) !important;
}
</style>
