/**
 * 微信小程序 CI 上传脚本（mp-weixin → 微信开发者平台）
 *
 * 前置条件：
 *   1. 私钥文件须放在项目根目录（从微信公众平台「开发管理 → 开发设置 → 小程序代码上传」下载）
 *      - 私钥文件名格式：private.<appid>.key，例如 private.wxd4ccbb319a00bb89.key
 *   2. 已构建 mp-weixin 产物：npm run build:mp-weixin
 *
 * 用法：
 *   node upload.js                     # 上传体验版，版本号取 package.json version
 *   node upload.js 3.9.1 "描述文本"    # 指定版本号 + 描述
 *
 * 版本号规则：需 > 线上最新版本（微信不允许重复/回退版本号）
 */
const fs = require('fs');
const path = require('path');
const pkg = require('./package.json');
const ci = require('miniprogram-ci');

// ★ appid 以 project.config.json 为准（上传用 appid 与私钥一一对应）
const appid = 'wxd4ccbb319a00bb89';
const privateKeyPath = path.join(__dirname, `private.${appid}.key`);

const version = process.argv[2] || pkg.version;
const desc = process.argv[3] || `风声助手 ${version}：到洞察链路（建档→测评→洞察报告自动填分）`;

async function upload() {
  if (!fs.existsSync(privateKeyPath)) {
    console.error(`❌ 私钥不存在：${privateKeyPath}`);
    console.error('   请从微信公众平台下载「小程序代码上传密钥」放到项目根目录，文件名须为 private.' + appid + '.key');
    process.exit(1);
  }

  const project = new ci.Project({
    appid,
    type: 'miniProgram',
    projectPath: './dist/build/mp-weixin',
    privateKeyPath,
    ignores: ['node_modules/**/*'],
  });

  try {
    console.log(`⬆️  上传中 appid=${appid} version=${version}`);
    const result = await ci.upload({
      project,
      version,
      desc,
      setting: { es6: true, minify: true },
      onProgressUpdate: (p) => console.log(`[${p.status}] ${p.message}`),
    });
    console.log('✅ 上传成功');
    console.log('   message_id:', result.message_id);
    console.log('   接下来请到微信公众平台 → 版本管理 → 将开发版「设为体验版」');
  } catch (err) {
    console.error('❌ 上传失败:', err.message);
    process.exit(1);
  }
}

upload();
