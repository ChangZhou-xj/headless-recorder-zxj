<template>
  <main class="bg-gray-lightest flex py-9 w-full h-screen overflow-auto dark:bg-black">
    <div class="flex flex-col w-1/4 pt-12 pr-6">
      <a href="https://www.checklyhq.com/docs/headless-recorder/" target="_blank">帮助文档</a>
      <a href="https://github.com/checkly/headless-recorder" target="_blank">GitHub 仓库</a>
      <a href="https://github.com/checkly/headless-recorder/blob/main/CHANGELOG.md"
        >更新日志</a
      >
      <a
        href="https://chrome.google.com/webstore/detail/headless-recorder/djeegiggegleadkkbgopoonhjimgehda"
        target="_blank"
        >Chrome 商店</a
      >
    </div>
    <div class="flex flex-col w-1/2">
      <header class="flex flex-row justify-between items-center mb-3.5">
        <div class="flex items-baseline">
          <h1 class="text-blue text-2xl font-bold mr-1">
            测试用例录制器
          </h1>
          <span class="text-gray-dark dark:text-gray-light text-sm">版本 v{{ version }}</span>
        </div>
        <span
          role="alert"
          class="text-gray-darkest dark:text-white text-base font-semibold"
          v-show="saving"
          >保存中...</span
        >
      </header>

      <section>
        <h2>录制设置</h2>
        <label for="custom-data-attribute">自定义 data 属性</label>
        <div class="mb-6">
          <input
            id="custom-data-attribute"
            class="w-full placeholder-gray-darkish bg-gray-lighter h-7 rounded px-2 mb-2 text-sm"
            type="text"
            v-model.trim="options.code.dataAttribute"
            @change="save"
            placeholder="例如：data-test"
          />
          <p>
            为元素定位指定优先使用的 data 属性，例如 <code>data-test</code>。
            当页面 class 名随机变化时，这个配置会更稳定。
          </p>
          <p>
            <span role="img" aria-label="siren">🚨</span>
            <span class="ml-1 font-bold text-black-shady dark:text-white"
              >设置后，将优先使用该属性生成选择器，即使元素存在 ID 也会优先采用该属性。
            </span>
          </p>
        </div>
        <div>
          <label>输入确认按键</label>
          <div class="mb-2">
            <Button @click="listenForKeyCodePress" class="font-semibold text-white text-sm">
              {{ recordingKeyCodePress ? '正在捕获...' : '记录按键' }}
            </Button>
            <span class="text-gray-dark dark:text-gray-light text-sm ml-3">
              {{ options.code.keyCode }}
            </span>
          </div>
          <p>
            当你在输入框中录入内容后，按下该按键时会记录输入值。这里只支持单个按键码。
          </p>
        </div>
      </section>

      <section>
        <h2>用例导出</h2>
        <label for="file-name-prefix">Excel 文件名前缀</label>
        <div class="mb-2">
          <input
            id="file-name-prefix"
            class="w-full placeholder-gray-darkish bg-gray-lighter h-7 rounded px-2 mb-2 text-sm"
            type="text"
            v-model.trim="options.testCase.fileNamePrefix"
            @change="save"
            placeholder="例如：登录模块测试用例"
          />
        </div>
        <p>
          录制结束后会自动生成测试用例预览，并可导出为 <code>.xlsx</code> 文件，直接用 Excel 打开。
        </p>
      </section>

      <section>
        <h2 class="">扩展设置</h2>
        <Toggle v-model="options.extension.darkMode">
          启用深色模式
        </Toggle>
        <Toggle v-model="options.extension.telemetry">
          允许记录基础使用统计
        </Toggle>
        <p>
          仅记录最基础的功能使用情况，不采集页面正文内容，也不会向第三方共享。
        </p>
      </section>
    </div>
  </main>
</template>

<script>
import { version } from '../../package.json'

import storage from '@/services/storage'
import { isDarkMode } from '@/services/constants'
import { defaults as codeDefaults } from '@/modules/code-generator/base-generator'
import { merge } from 'lodash'

import Button from '@/components/Button'
import Toggle from '@/components/Toggle'

const createDefaultOptions = () => ({
  code: {
    ...codeDefaults,
  },
  extension: {
    telemetry: true,
    darkMode: isDarkMode(),
  },
  testCase: {
    fileNamePrefix: '测试用例',
  },
})

export default {
  name: 'OptionsApp',
  components: { Toggle, Button },

  data() {
    return {
      version,
      loading: true,
      saving: false,
      options: createDefaultOptions(),
      recordingKeyCodePress: false,
    }
  },

  watch: {
    options: {
      handler() {
        this.save()
      },
      deep: true,
    },

    'options.extension.darkMode': {
      handler(newVal) {
        document.body.classList[newVal ? 'add' : 'remove']('dark')
      },
      immediate: true,
    },
  },

  mounted() {
    this.load()
    chrome.storage.onChanged.addListener(({ options = null }) => {
      if (options && options.newValue.extension.darkMode !== this.options.extension.darkMode) {
        this.options.extension.darkMode = options.newValue.extension.darkMode
      }
    })
  },

  methods: {
    async save() {
      this.saving = true
      await storage.set({ options: this.options })

      setTimeout(() => (this.saving = false), 500)
    },

    async load() {
      const { options } = await storage.get('options')
      this.options = merge(createDefaultOptions(), options || {})

      this.loading = false
    },

    listenForKeyCodePress() {
      this.recordingKeyCodePress = true

      const keyDownFunction = e => {
        this.recordingKeyCodePress = false
        this.updateKeyCodeWithNumber(e)
        window.removeEventListener('keydown', keyDownFunction, false)
        e.preventDefault()
      }

      window.addEventListener('keydown', keyDownFunction, false)
    },

    updateKeyCodeWithNumber(evt) {
      this.options.code.keyCode = parseInt(evt.keyCode, 10)
      this.save()
    },
  },
}
</script>

<style scoped>
body {
  background: #f9fafc;
  height: 100vh;
}

body.dark {
  background: #161616;
}

code {
  @apply font-semibold;
}

a {
  @apply text-blue underline text-sm text-right;
}

h2 {
  @apply text-gray-darkish text-xl font-semibold mb-5 dark:text-gray-light;
}

label {
  color: #000;
  @apply font-semibold text-sm mb-2 block dark:text-gray-lightest;
}

section {
  @apply bg-white border-gray-light border border-solid rounded-md p-4 pb-10 mb-6 dark:bg-black-shady dark:border-gray-dark;
}

p {
  @apply text-gray-darkish text-xs mb-2 dark:text-white;
}
</style>
