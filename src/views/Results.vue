<template>
  <div
    data-test-id="results-tab"
    class="flex flex-col flex-1 overflow-hidden dark:bg-black"
    style="min-height:0"
  >
    <div
      class="px-3 py-1 flex-shrink-0 border-b border-gray-light dark:border-gray-dark flex items-center gap-2"
    >
      <h3 class="font-semibold text-sm text-gray-darkest dark:text-gray-lightest flex-shrink-0">
        测试用例
      </h3>
      <p class="text-xs text-gray-dark dark:text-gray-light truncate">
        已生成 {{ localCases.length }} 条，可编辑单元格后导出。
      </p>
    </div>

    <!-- 滚动容器：flex-1 占满剩余高度，overflow-auto 提供纵/横向滚动 -->
    <div class="p-2 bg-white dark:bg-black-shady overflow-auto flex-1" style="min-height:0">
      <table v-if="localCases.length" class="text-xs border-collapse results-table">
        <colgroup>
          <col style="width:52px" /><!-- 编号 -->
          <col style="width:80px" /><!-- 功能 -->
          <col style="width:120px" /><!-- 用例标题 -->
          <col style="width:100px" /><!-- 前置条件 -->
          <col style="width:90px" /><!-- 测试数据 -->
          <col style="width:160px" /><!-- 操作步骤 -->
          <col style="width:160px" /><!-- 预期结果 -->
          <col style="width:80px" /><!-- 实际结果 -->
          <col style="width:70px" /><!-- 缺陷单号 -->
          <col style="width:60px" /><!-- 用例类型 -->
          <col style="width:80px" /><!-- 备注 -->
        </colgroup>
        <thead>
          <tr>
            <th v-for="column in columns" :key="column">{{ column }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, rowIndex) in localCases" :key="row['编号']">
            <td v-for="column in columns" :key="`${row['编号']}-${column}`">
              <!-- 编号列只读 -->
              <div v-if="column === '编号'" class="whitespace-pre-wrap break-words px-1">
                {{ row[column] }}
              </div>
              <!-- 其余列均可编辑 -->
              <textarea
                v-else
                :value="row[column]"
                :rows="rowHeight(row[column])"
                :aria-label="column"
                class="cell-editor"
                :class="{ 'cell-editor--highlight': isKeyColumn(column) }"
                :placeholder="placeholder(column)"
                @input="onInput(rowIndex, column, $event.target.value)"
              />
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

// 需要重点标注的核心列（高亮显示，提示用户可补充）
const KEY_COLUMNS = new Set(['操作步骤', '预期结果', '备注'])

const PLACEHOLDERS = {
  功能: '填写所属功能模块',
  用例标题: '填写用例标题',
  前置条件: '填写前置条件',
  测试数据: '填写测试数据',
  操作步骤: '可手动补充或修改操作步骤',
  预期结果: '可手动补充预期结果',
  实际结果: '执行后填写实际结果',
  缺陷单号: '填写关联缺陷单号',
  用例类型: '正向 / 异常 / 边界…',
  备注: '可补充备注信息',
}

export default {
  name: 'ResultsTab',

  props: {
    cases: {
      type: Array,
      default: () => [],
    },
  },

  emits: ['update:cases'],

  data() {
    return {
      columns: TEST_CASE_COLUMNS,
      localCases: [],
    }
  },

  watch: {
    cases: {
      handler(newVal) {
        // 深拷贝，避免直接修改 prop
        this.localCases = newVal.map(row => ({ ...row }))
      },
      immediate: true,
      deep: true,
    },
  },

  methods: {
    onInput(rowIndex, column, value) {
      this.localCases[rowIndex][column] = value
      // 通知父组件同步最新内容，导出时使用编辑后数据
      this.$emit(
        'update:cases',
        this.localCases.map(r => ({ ...r }))
      )
    },

    isKeyColumn(column) {
      return KEY_COLUMNS.has(column)
    },

    placeholder(column) {
      return PLACEHOLDERS[column] || ''
    },

    /** 根据内容行数动态设置 textarea 高度（最少 2 行，最多 8 行） */
    rowHeight(value) {
      if (!value) return 2
      const lines = `${value}`.split('\n').length
      return Math.min(Math.max(lines, 2), 8)
    },
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

.results-table {
  table-layout: fixed;
  border-collapse: collapse;
  min-width: 100%;
  width: max-content;
}

.results-table th,
.results-table td {
  border: 1px solid #d2dce6;
  padding: 4px;
  vertical-align: top;
  overflow: hidden;
}

.results-table th {
  background: #f3f4f6;
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 6px 8px;
}

/* 可编辑单元格 */
.cell-editor {
  display: block;
  width: 100%;
  min-width: 110px;
  padding: 3px 4px;
  font-size: 0.75rem;
  line-height: 1.4;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 3px;
  resize: none;
  outline: none;
  color: inherit;
  font-family: inherit;
  white-space: pre-wrap;
  word-break: break-word;
  transition: border-color 0.15s;
}

.cell-editor:hover {
  border-color: #b0c4d8;
}

.cell-editor:focus {
  border-color: #45c8f1;
  background: rgba(69, 200, 241, 0.06);
}

/* 核心列（操作步骤 / 预期结果 / 备注）额外高亮 */
.cell-editor--highlight:not(:focus) {
  border-color: #dbeafe;
  background: rgba(219, 234, 254, 0.25);
}

.cell-editor::placeholder {
  color: #9ca3af;
  font-style: italic;
}

/* 暗色模式适配 */
.dark .results-table th {
  background: #1f2937;
  color: #e5e7eb;
}

.dark .results-table td {
  border-color: #374151;
}

.dark .cell-editor {
  color: #e5e7eb;
}

.dark .cell-editor:hover {
  border-color: #4b5563;
}

.dark .cell-editor:focus {
  border-color: #45c8f1;
  background: rgba(69, 200, 241, 0.08);
}

.dark .cell-editor--highlight:not(:focus) {
  border-color: #1e3a5f;
  background: rgba(30, 58, 138, 0.2);
}
</style>
