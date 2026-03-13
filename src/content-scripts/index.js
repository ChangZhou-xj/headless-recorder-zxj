import store from '@/store'

import Overlay from '@/modules/overlay'
import Recorder from '@/modules/recorder'

import HeadlessController from '@/content-scripts/controller'

// 防止重复注入时无条件替换已初始化的 controller
// 每次 scripting.executeScript 注入都会重新运行此文件；
// 若已初始化（headlessRecorder 存在且事件监听已绑定），则仅更新 store options 即可
if (!window.headlessRecorder) {
  window.headlessRecorder = new HeadlessController({
    overlay: new Overlay({ store }),
    recorder: new Recorder({ store }),
    store,
  })
  window.headlessRecorder.init()
}
