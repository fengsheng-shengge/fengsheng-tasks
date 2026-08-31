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
      // 3) 彻底删除 app.wxss 中 uni-app 注入的 shadow-preload CDN 段（真机预加载 dcloud shadow-grey.png 会超时）
      const wxssPath = join(process.cwd(), 'dist/build/mp-weixin/app.wxss')
      try {
        let wxss = readFileSync(wxssPath, 'utf-8')
        const before = wxss.length
        // app.wxss 为单行压缩；keyframes 形如 @keyframes shadow-preload{0%{...}100%{...}}
        wxss = wxss.replace(/@-webkit-keyframes shadow-preload\{.*?\}\}/g, '')
        wxss = wxss.replace(/@keyframes shadow-preload\{.*?\}\}/g, '')
        // 清掉 page::after 上对 shadow-preload 的动画引用（keyframes 已删，引用变无害；此处一并去除更干净）
        // 注意：必须连同 -webkit- 前缀一起匹配，否则 -webkit-animation:shadow-preload 会被拆成非法 '-webkit-;' 导致 IDE 编译 code 10
        wxss = wxss.replace(/(?:-webkit-)?animation:shadow-preload[^;}]*/g, '')
        wxss = wxss.replace(/shadow-grey\.png/g, '')
        // 清掉被 `animation-delay:3s` 等注入拆出的非法 `;;`（微信端 wxss 解析器报 code 10041 unexpected token ';'）
        wxss = wxss.replace(/;;+/g, ';')
        if (wxss.length !== before) {
          writeFileSync(wxssPath, wxss)
          console.log('✅ 已清除 app.wxss 中 shadow-preload CDN 段（' + (before - wxss.length) + ' 字节）')
        } else {
          console.log('ℹ️ app.wxss 未发现 shadow-preload CDN 段（已干净）')
        }
      } catch (e) {
        console.warn('⚠️ 清理 shadow-preload 失败:', e.message)
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
