import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { trackPageview } from './utils/tracker'
// 设计系统：移植自 review 原生小程序（墨绿/暖橙 VI + 14px 字号节奏）。唯一真源。
import './static/theme.css'

export function createApp() {
  const app = createSSRApp(App)
  const pinia = createPinia()
  app.use(pinia)
  // 全局页面浏览埋点：自动上报所有 tab 页 pageview（仅页面根组件上报，避免子组件重复）
  app.mixin({
    onShow() {
      try {
        const pages = getCurrentPages()
        const cur = pages[pages.length - 1]
        if (cur && cur.$vm === this) {
          const route = (cur.route || '').split('/').pop() || 'app'
          trackPageview(route)
        }
      } catch (e) { /* 静默 */ }
    }
  })
  return { app }
}
