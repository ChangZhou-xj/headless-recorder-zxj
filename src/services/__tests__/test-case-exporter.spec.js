jest.mock('xlsx', () => ({
  utils: {
    book_new: jest.fn(() => ({ Sheets: {}, SheetNames: [] })),
    aoa_to_sheet: jest.fn(data => ({ data })),
    book_append_sheet: jest.fn((workbook, worksheet, name) => {
      workbook.Sheets[name] = worksheet
      workbook.SheetNames.push(name)
    }),
  },
  writeFile: jest.fn(),
}))

import * as XLSX from 'xlsx'

import {
  createExcelFileName,
  createWorkbook,
  createWorksheetData,
  exportTestCasesAsExcel,
} from '../test-case-exporter'

describe('test-case-exporter', () => {
  beforeEach(() => {
    XLSX.writeFile.mockClear()
  })

  test('生成 Excel 文件名', () => {
    const fileName = createExcelFileName('登录测试')

    expect(fileName).toMatch(/^登录测试_\d{8}_\d{6}\.xlsx$/)
  })

  test('生成包含固定列的工作表数据', () => {
    const rows = createWorksheetData([
      {
        编号: 'TC-001',
        功能: '登录',
        用例标题: '验证登录流程',
        前置条件: '已进入登录页',
        测试数据: '用户名/密码',
        操作步骤: '1. 输入用户名',
        预期结果: '登录成功',
        实际结果: '待执行',
        缺陷单号: '',
        用例类型: '功能测试',
        备注: '自动生成',
      },
    ])

    expect(rows[0]).toContain('用例标题')
    expect(rows[1]).toContain('验证登录流程')
  })

  test('生成工作簿对象', () => {
    const workbook = createWorkbook([
      {
        编号: 'TC-001',
        功能: '登录',
        用例标题: '验证登录流程',
        前置条件: '已进入登录页',
        测试数据: '用户名/密码',
        操作步骤: '1. 输入用户名',
        预期结果: '登录成功',
        实际结果: '待执行',
        缺陷单号: '',
        用例类型: '功能测试',
        备注: '自动生成',
      },
    ])

    expect(workbook.SheetNames).toContain('测试用例')
    expect(workbook.Sheets['测试用例']).toBeTruthy()
  })

  test('导出时调用 xlsx 写文件', () => {
    const fileName = exportTestCasesAsExcel([
      {
        编号: 'TC-001',
        功能: '登录',
        用例标题: '验证登录流程',
        前置条件: '已进入登录页',
        测试数据: '用户名/密码',
        操作步骤: '1. 输入用户名',
        预期结果: '登录成功',
        实际结果: '待执行',
        缺陷单号: '',
        用例类型: '功能测试',
        备注: '自动生成',
      },
    ])

    expect(fileName).toMatch(/\.xlsx$/)
    expect(XLSX.writeFile).toHaveBeenCalledTimes(1)
  })
})
