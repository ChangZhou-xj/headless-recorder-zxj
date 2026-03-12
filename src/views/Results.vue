<template>
  <div
    data-test-id="results-tab"
    class="flex flex-col bg-blue-light overflow-hidden mt-4 h-100 dark:bg-black"
  >
    <div class="px-3 py-2 border-b border-gray-light dark:border-gray-dark">
      <h3 class="font-semibold text-sm text-gray-darkest dark:text-gray-lightest">测试用例</h3>
      <p class="text-xs text-gray-dark dark:text-gray-light mt-1">
        已根据录制结果生成 {{ cases.length }} 条测试用例，可直接导出为 Excel。
      </p>
    </div>

    <div class="sc p-2 bg-white dark:bg-black-shady overflow-auto h-100">
      <table v-if="cases.length" class="w-full text-xs border-collapse results-table">
        <thead>
          <tr>
            <th v-for="column in columns" :key="column">
              {{ column }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in cases" :key="row['编号']">
            <td v-for="column in columns" :key="`${row['编号']}-${column}`">
              <div class="whitespace-pre-wrap break-words">{{ row[column] }}</div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="text-xs text-gray-dark dark:text-gray-light">暂未生成测试用例。</div>
    </div>
  </div>
</template>
<script>
import { TEST_CASE_COLUMNS } from '@/modules/test-case-generator'

export default {
  name: 'ResultsTab',

  props: {
    cases: {
      type: Array,
      default: () => [],
    },
  },

  data() {
    return {
      columns: TEST_CASE_COLUMNS,
    }
  },
}
</script>

<style scoped>
pre::-webkit-scrollbar {
  height: 8px;
  width: 8px;
  margin-right: 10px;
  padding: 10px;
  background: transparent;
}

pre::-webkit-scrollbar-thumb {
  margin-right: 10px;
  padding: 10px;
  background: #e0e6ed;
  border-radius: 0.5rem;
}

pre::-webkit-scrollbar-corner {
  background: yellow;
}

.results-table th,
.results-table td {
  border: 1px solid #d2dce6;
  padding: 8px;
  min-width: 120px;
  vertical-align: top;
}

.results-table th {
  background: #f3f4f6;
  position: sticky;
  top: 0;
  z-index: 1;
}
</style>
