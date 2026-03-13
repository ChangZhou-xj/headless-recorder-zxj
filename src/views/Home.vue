<template>
  <div class="flex flex-col items-center rounded-md pt-6 h-100">
    <h3 class="text-gray-darkest text-xl font-semibold mb-2 dark:text-gray-lightest">
      暂无录制结果
    </h3>
    <p class="text-gray-dark text-xs mb-4 text-center w-44 dark:text-gray-light">
      点击下方按钮开始录制浏览器操作，并生成中文测试用例
    </p>

    <!-- 录制前填写功能基础描述 -->
    <div class="w-64 mb-2">
      <label
        class="block text-gray-dark dark:text-gray-light text-xs mb-1 font-medium"
        for="func-desc-input"
      >
        功能基础描述
        <span class="text-gray-light dark:text-gray-dark ml-1 font-normal">
          （可选，将作为所有用例的功能前缀）
        </span>
      </label>
      <input
        id="func-desc-input"
        v-model.trim="funcDesc"
        type="text"
        maxlength="40"
        placeholder="例：绩效管理 / 用户登录"
        class="
          w-full px-2 py-1 text-xs rounded border
          border-gray-light dark:border-gray-dark
          bg-white dark:bg-gray-darkest
          text-gray-darkest dark:text-gray-lightest
          placeholder-gray-light dark:placeholder-gray-dark
          focus:outline-none focus:border-blue
        "
        @keydown.enter="handleStart"
      />
    </div>

    <RoundButton :small="false" @click="handleStart" class="p-10 mt-8">
      <div class="bg-red w-21 h-21 rounded-full"></div>
    </RoundButton>
  </div>
</template>

<script>
import RoundButton from '@/components/RoundButton'

export default {
  components: { RoundButton },

  props: {
    // 父组件可回传上次填写的描述，重新录制时保留
    initialFuncDesc: {
      type: String,
      default: '',
    },
  },

  emits: ['start'],

  data() {
    return {
      funcDesc: this.initialFuncDesc,
    }
  },

  watch: {
    initialFuncDesc(val) {
      this.funcDesc = val
    },
  },

  methods: {
    handleStart() {
      this.$emit('start', this.funcDesc)
    },
  },
}
</script>
