import { shallowMount } from '@vue/test-utils'
import App from '../PopupApp'

const chrome = {
  storage: {
    local: {
      get: jest.fn((keys, cb) => cb({ controls: {}, recording: [], testCases: [] })),
    },
  },
  extension: {
    connect: jest.fn(() => ({ postMessage: jest.fn() })),
  },
}

window.matchMedia = jest.fn(() => ({ matches: false }))

describe('App.vue', () => {
  test('默认展示中文空状态并隐藏脚本操作', async () => {
    window.chrome = chrome
    const wrapper = shallowMount(App)
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.showResultsTab).toBe(false)
    expect(wrapper.vm.testCases).toEqual([])
    expect(wrapper.findComponent({ name: 'Home' }).exists()).toBe(true)
  })
})
