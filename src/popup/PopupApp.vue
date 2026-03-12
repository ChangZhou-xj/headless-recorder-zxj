<template>
  <div class="bg-gray-lightest dark:bg-black flex flex-col overflow-hidden">
    <Header @options="openOptions" @help="goHelp" @dark="toggleDarkMode" />

    <Home v-if="!showResultsTab && !isRecording" @start="toggleRecord" />

    <Recording
      @stop="toggleRecord"
      @pause="togglePause"
      @restart="restart(true)"
      :is-recording="isRecording"
      :is-paused="isPaused"
      :dark-mode="options?.extension?.darkMode"
      v-show="!showResultsTab && isRecording"
    />

    <Results
      :cases="testCases"
      v-if="showResultsTab"
    />

    <!-- TODO: Move this into its own component -->
    <div
      data-test-id="results-footer"
      class="flex py-2 px-3 justify-between bg-black-shady"
      v-show="showResultsTab"
    >
      <Button dark class="mr-2" @click="restart" v-show="testCases.length">
        <img src="/icons/dark/sync.svg" class="mr-1" alt="重新录制" />
        重新录制
      </Button>
      <Button dark class="mr-2 w-34" @click="exportExcel" v-show="testCases.length">
        <img
          src="/icons/dark/duplicate.svg"
          class="mr-1"
          alt="导出测试用例 Excel"
        />
        <span v-show="!isExporting">导出 Excel（.xlsx）</span>
        <span v-show="isExporting">已导出</span>
      </Button>
    </div>

    <Footer v-if="!isRecording && !showResultsTab" />
  </div>
</template>

<script>
import browser from '@/services/browser'
import storage from '@/services/storage'
import analytics from '@/services/analytics'
import { merge } from 'lodash'
import { popupActions, isDarkMode } from '@/services/constants'

import { defaults as codeDefaults } from '@/modules/code-generator/base-generator'
import TestCaseGenerator from '@/modules/test-case-generator'
import { exportTestCasesAsExcel } from '@/services/test-case-exporter'

import Home from '@/views/Home.vue'
import Results from '@/views/Results.vue'
import Recording from '@/views/Recording.vue'

import Button from '@/components/Button.vue'
import Footer from '@/components/Footer.vue'
import Header from '@/components/Header.vue'

let bus

const createDefaultOptions = () => ({
  extension: {
    darkMode: isDarkMode(),
    telemetry: true,
  },
  code: {
    ...codeDefaults,
  },
  testCase: {
    fileNamePrefix: '测试用例',
  },
})

export default {
  name: 'PopupApp',
  components: {
    Results,
    Recording,
    Home,
    Header,
    Footer,
    Button,
  },

  data() {
    return {
      showResultsTab: false,
      isRecording: false,
      isPaused: false,
      isExporting: false,

      liveEvents: [],
      recording: [],

      testCases: [],
      options: createDefaultOptions(),
    }
  },

  watch: {
    'options.extension.darkMode': {
      handler(newVal) {
        document.body.classList[newVal ? 'add' : 'remove']('dark')
      },
      immediate: true,
    },
  },

  async mounted() {
    this.loadState()
    bus = browser.getBackgroundBus()
  },

  methods: {
    toggleRecord(close = true) {
      if (this.isRecording) {
        this.stop()
      } else {
        close && window.close()
        this.start()
      }

      this.isRecording = !this.isRecording
      this.storeState()
    },

    togglePause(stop = false) {
      bus.postMessage({ action: this.isPaused ? popupActions.UN_PAUSE : popupActions.PAUSE, stop })
      this.isPaused = !this.isPaused

      this.storeState()
    },

    start() {
      analytics.trackEvent({ options: this.options, event: 'Start' })
      this.cleanUp()
      bus.postMessage({ action: popupActions.START })
    },

    async stop() {
      analytics.trackEvent({ options: this.options, event: 'Stop' })
      bus.postMessage({ action: popupActions.STOP })

      await this.generateTestCases()
      this.storeState()
    },

    restart(stop = false) {
      this.cleanUp()
      bus.postMessage({ action: popupActions.CLEAN_UP, value: stop })
    },

    cleanUp() {
      this.recording = this.liveEvents = []
      this.testCases = []
      this.showResultsTab = this.isRecording = this.isPaused = false
      this.storeState()
    },

    async generateTestCases() {
      const { recording = [], options = {} } = await storage.get(['recording', 'options'])
      const mergedOptions = merge(createDefaultOptions(), options)
      const generator = new TestCaseGenerator(mergedOptions.testCase)
      const testCases = generator.generate(recording)

      this.recording = recording
      this.testCases = testCases
      this.options = mergedOptions
      this.showResultsTab = testCases.length > 0
      this.storeState()
    },

    openOptions() {
      analytics.trackEvent({ options: this.options, event: 'Options' })
      browser.openOptionsPage()
    },

    async loadState() {
      const {
        controls = {},
        options,
        recording,
        testCases = [],
        clear,
        pause,
        restart,
      } = await storage.get([
        'controls',
        'options',
        'recording',
        'testCases',
        'clear',
        'pause',
        'restart',
      ])

      this.isRecording = controls.isRecording
      this.isPaused = controls.isPaused
      this.options = merge(createDefaultOptions(), options || {})

      if (this.isRecording) {
        this.liveEvents = recording

        if (clear) {
          this.toggleRecord()
          storage.remove(['clear'])
        }

        if (pause) {
          this.togglePause(true)
          storage.remove(['pause'])
        }

        if (restart) {
          this.cleanUp()
          this.toggleRecord(false)
          storage.remove(['restart'])
        }
      } else if (testCases?.length) {
        this.recording = recording || []
        this.testCases = testCases
        this.showResultsTab = true
      } else if (recording?.length) {
        await this.generateTestCases()
      }
    },

    storeState() {
      storage.set({
        code: '',
        codeForPlaywright: '',
        testCases: this.testCases,
        controls: { isRecording: this.isRecording, isPaused: this.isPaused },
      })
    },

    async exportExcel() {
      if (!this.testCases.length) {
        return
      }

      this.isExporting = true
      exportTestCasesAsExcel(this.testCases, this.options?.testCase)
      setTimeout(() => (this.isExporting = false), 500)
    },

    goHelp() {
      browser.openHelpPage()
    },

    toggleDarkMode() {
      this.options.extension.darkMode = !this.options.extension.darkMode
      storage.set({ options: this.options })
    },
  },
}
</script>

<style>
html {
  width: 386px;
  height: 535px;
}

button:focus-visible {
  outline: none;
  box-shadow: 0 0 2px 2px #51a7e8;
}

button:focus {
  outline: 0;
}
</style>
