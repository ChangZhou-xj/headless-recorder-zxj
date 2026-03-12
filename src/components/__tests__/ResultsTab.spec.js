import { mount } from '@vue/test-utils'

import ResultsTab from '../../views/Results.vue'

describe('Results.vue', () => {
  test('空状态显示未生成提示', () => {
    const wrapper = mount(ResultsTab)

    expect(wrapper.text()).toContain('暂未生成测试用例')
  })

  test('渲染测试用例表格', () => {
    const wrapper = mount(ResultsTab, {
      props: {
        cases: [
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
        ],
      },
    })

    expect(wrapper.findAll('thead th').length).toBe(11)
    expect(wrapper.text()).toContain('验证登录流程')
    expect(wrapper.text()).toContain('待执行')
  })
})
