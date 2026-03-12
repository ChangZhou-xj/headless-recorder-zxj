<template>
  <div class="flex flex-col items-center rounded-md pt-10 h-100">
    <h3 class="text-gray-darkest text-xl font-semibold mb-3 dark:text-gray-lightest">
      暂无录制结果
    </h3>
    <p class="text-gray-dark text-xs mb-5 text-center w-44 dark:text-gray-light">
      点击下方按钮开始录制浏览器操作，并生成中文测试用例
    </p>
    <RoundButton :small="false" @click="$emit('start')" class="p-10 mt-12">
      <div class="bg-red w-21 h-21 rounded-full"></div>
    </RoundButton>
  </div>
</template>

<script>
import RoundButton from '@/components/RoundButton'

export default {
  components: { RoundButton },
}
</script>
