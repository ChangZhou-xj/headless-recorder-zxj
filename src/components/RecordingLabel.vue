<template>
  <div
    data-test-id="recording-badge"
    class="flex text-2xl justify-center items-center text-red font-semibold"
    :class="{ 'text-yellow': text === 'Paused', 'animate-pulse': text !== 'Paused' }"
  >
    {{ text }}
  </div>
</template>

<script>
export default {
  name: 'RecordingLabel',
  props: {
    isPaused: { type: Boolean, default: false },
  },

  computed: {
    text() {
      return this.isPaused ? '已暂停' : '录制中...'
    },
  },
}
</script>
