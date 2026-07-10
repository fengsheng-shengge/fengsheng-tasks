<script>
export default {
  onLaunch() {
    console.log('风声助手 onLaunch')
    const token = uni.getStorageSync('fs_token')
    if (token) {
      console.log('已登录')
    } else {
      console.log('未登录')
    }
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
/* 全局样式 */
page {
  background-color: #f8f9fa;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', Helvetica, Arial, sans-serif;
}
</style>
