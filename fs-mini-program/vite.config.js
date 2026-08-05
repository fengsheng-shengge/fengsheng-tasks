import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

// 构建后自动注入：1) lazyCodeLoading 到 app.json  2) libVersion 锁稳定版基础库
function postBuildInject() {
  return {
    name: 'fs-post-build-inject',
    closeBundle() {
      // 1) app.json → lazyCodeLoading
      const appJsonPath = join(process.cwd(), 'dist/build/mp-weixin/app.json')
      try {
        const appJson = JSON.parse(readFileSync(appJsonPath, 'utf-8'))
        appJson.lazyCodeLoading = 'requiredComponents'
        writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2))
        console.log('✅ lazyCodeLoading 已注入 app.json')
      } catch (e) {
        console.warn('⚠️ 注入 lazyCodeLoading 失败:', e.message)
      }
      // 2) project.config.json → 锁定基础库 2.32.3（业内稳定版，避开 3.15.x polyfill timeout 坑）
      const cfgPath = join(process.cwd(), 'dist/build/mp-weixin/project.config.json')
      try {
        const cfg = JSON.parse(readFileSync(cfgPath, 'utf-8'))
        cfg.libVersion = '2.32.3'
        writeFileSync(cfgPath, JSON.stringify(cfg, null, 2))
        console.log('✅ libVersion 已锁定 2.32.3（稳定基础库，绕开 3.15.x polyfill timeout）')
      } catch (e) {
        console.warn('⚠️ 注入 libVersion 失败:', e.message)
      }
      // 3) app.wxss → 删除 uni-app 默认注入的 shadow-preload CDN 预加载段
      //    避免真机/模拟器请求 cdn1.dcloud.net.cn 的 shadow-grey.png 超时红字
      const wxssPath = join(process.cwd(), 'dist/build/mp-weixin/app.wxss')
      try {
        let wxss = readFileSync(wxssPath, 'utf-8')
        const start = wxss.indexOf("page::after{position:fixed;content:'';left:-1000px;top:-1000px;")
        if (start !== -1) {
          const end = wxss.indexOf('page{', start + 1)
          if (end !== -1) {
            wxss = wxss.slice(0, start) + wxss.slice(end)
            writeFileSync(wxssPath, wxss)
            console.log('✅ app.wxss shadow-preload CDN 段已清理')
          }
        }
      } catch (e) {
        console.warn('⚠️ 清理 app.wxss shadow-preload 失败:', e.message)
      }
    }
  }
}

export default defineConfig({
  plugins: [uni(), postBuildInject()],
  server: {
    port: 5173,
    host: '0.0.0.0'
  },
  build: {
    minify: 'terser',
    sourcemap: false
  }
})
