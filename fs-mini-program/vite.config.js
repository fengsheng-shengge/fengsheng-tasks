import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

// 构建后自动注入 lazyCodeLoading 到 app.json
function injectLazyCodeLoading() {
  return {
    name: 'inject-lazy-code-loading',
    closeBundle() {
      const appJsonPath = join(process.cwd(), 'dist/build/mp-weixin/app.json')
      try {
        const appJson = JSON.parse(readFileSync(appJsonPath, 'utf-8'))
        appJson.lazyCodeLoading = 'requiredComponents'
        writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2))
        console.log('✅ lazyCodeLoading 已注入 app.json')
      } catch (e) {
        console.warn('⚠️ 注入 lazyCodeLoading 失败:', e.message)
      }
    }
  }
}

export default defineConfig({
  plugins: [uni(), injectLazyCodeLoading()],
  server: {
    port: 5173,
    host: '0.0.0.0'
  },
  build: {
    minify: 'terser',
    sourcemap: false
  }
})
