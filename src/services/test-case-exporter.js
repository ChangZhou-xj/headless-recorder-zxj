import * as XLSX from 'xlsx'

import { TEST_CASE_COLUMNS } from '@/modules/test-case-generator'

export function createExcelFileName(prefix = '测试用例') {
  const safePrefix = `${prefix || '测试用例'}`.trim() || '测试用例'
  const now = new Date()
  const pad = value => `${value}`.padStart(2, '0')
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(
    now.getHours()
  )}${pad(now.getMinutes())}${pad(now.getSeconds())}`

  return `${safePrefix}_${stamp}.xlsx`
}

export function createWorksheetData(rows = []) {
  return [
    TEST_CASE_COLUMNS,
    ...rows.map(row => TEST_CASE_COLUMNS.map(column => row?.[column] || '')),
  ]
}

export function createWorkbook(rows = []) {
  const worksheetData = createWorksheetData(rows)
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)

  worksheet['!cols'] = TEST_CASE_COLUMNS.map(column => {
    const maxLength = worksheetData.reduce((max, row) => {
      const value = `${row[TEST_CASE_COLUMNS.indexOf(column)] || ''}`
      return Math.max(max, value.length)
    }, column.length)

    return { wch: Math.min(Math.max(maxLength + 2, 12), 40) }
  })

  XLSX.utils.book_append_sheet(workbook, worksheet, '测试用例')

  return workbook
}

export function exportTestCasesAsExcel(rows = [], options = {}) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return null
  }

  const workbook = createWorkbook(rows)
  const fileName = createExcelFileName(options?.fileNamePrefix)

  XLSX.writeFile(workbook, fileName, {
    compression: true,
  })

  return fileName
}
