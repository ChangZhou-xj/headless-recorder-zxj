import { mount } from '@vue/test-utils'
import App from '../OptionsApp'

function createChromeLocalStorageMock(options) {
  let ops = options || {}
  return {
    options,
    storage: {
      onChanged: {
        addListener: jest.fn(),
      },
      local: {
        get: (key, cb) => {
          return cb(ops)
        },
        set: (options, cb) => {
          ops = options
          cb()
        },
      },
    },
  }
}

describe('App.vue', () => {
  beforeEach(() => {
    window.chrome = null
    window.matchMedia = jest.fn(() => ({ matches: false }))
  })

  test('默认展示中文配置项', () => {
    window.chrome = createChromeLocalStorageMock()
    const wrapper = mount(App)

    expect(wrapper.text()).toContain('录制设置')
    expect(wrapper.text()).toContain('用例导出')
  })

  test('默认加载 Excel 文件名前缀', () => {
    window.chrome = createChromeLocalStorageMock()
    const wrapper = mount(App)

    expect(wrapper.vm.$data.options.testCase.fileNamePrefix).toBe('测试用例')
  })

  test('默认输入确认按键为 9（Tab）', () => {
    window.chrome = createChromeLocalStorageMock()
    const wrapper = mount(App)

    expect(wrapper.vm.$data.options.code.keyCode).toBe(9)
  })

  test('点击按钮后可捕获新的按键码', () => {
    const options = { code: { keyCode: 9 } }
    window.chrome = createChromeLocalStorageMock(options)
    const wrapper = mount(App)

    return wrapper.vm
      .$nextTick()
      .then(() => {
        wrapper.find('button').element.click()
        const event = new KeyboardEvent('keydown', { keyCode: 16 })
        window.dispatchEvent(event)
        return wrapper.vm.$nextTick()
      })
      .then(() => {
        expect(wrapper.vm.$data.options.code.keyCode).toBe(16)
      })
  })

  test('可以保存并重新读取导出文件名前缀', () => {
    const options = { testCase: { fileNamePrefix: '冒烟测试' } }
    window.chrome = createChromeLocalStorageMock(options)
    const wrapper = mount(App)

    return wrapper.vm
      .$nextTick()
      .then(() => {
        const input = wrapper.find('#file-name-prefix')
        input.setValue('登录测试用例')
        input.trigger('change')
        expect(wrapper.text()).toContain('保存中...')
        return wrapper.vm.$nextTick()
      })
      .then(() => {
        wrapper.vm.load()
        return wrapper.vm.$nextTick()
      })
      .then(() => {
        const input = wrapper.find('#file-name-prefix')
        expect(input.element.value).toBe('登录测试用例')
      })
  })
})
