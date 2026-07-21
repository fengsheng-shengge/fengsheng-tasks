<script>
import { useUserStore } from './store/user'

export default {
  onLaunch() {
    console.log('风声助手 onLaunch')
    // 初始化用户数据
    const userStore = useUserStore()
    userStore.initFromStorage()
  },
  onShow() {
    console.log('风声助手 onShow')
  },
  onHide() {
    console.log('风声助手 onHide')
  }
}
</script>

<style>
/* 全局样式 — V2 品牌色 */
page {
  background-color: #f7f4ef;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', Helvetica, Arial, sans-serif;
}
</style>