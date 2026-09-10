import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

export function createApp() {
  const app = createSSRApp(App)
  const pinia = createPinia()
  app.use(pinia)

  // 全局异步错误兜底（uni-app H5 scrollTop bug 会经由 Vue async chain 抛出）
  app.config.errorHandler = (err, instance, info) => {
    const msg = ((err && err.message) || String(err)) + ' ' + info
    if (msg.includes('scrollTop') && msg.includes('null')) return
    console.warn('[fs] Vue error:', err, info)
  }

  return { app }
}
