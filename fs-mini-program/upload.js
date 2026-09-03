const ci = require('miniprogram-ci');

async function upload() {
  const project = new ci.Project({
    appid: 'wxe5d36e5de79c9d2a',
    type: 'miniProgram',
    projectPath: './dist/build/mp-weixin',
    privateKeyPath: './private.wxe5d36e5de79c9d2a.key',
    ignores: ['node_modules/**/*'],
  });

  try {
    const result = await ci.upload({
      project,
      version: '3.7.1',
      desc: '优化 MOT 页面和深层洞察区布局，修复固定底部按钮在深层洞察展开后消失的问题',
      setting: {
        es6: true,
        minify: true,
      },
      onProgressUpdate: (progress) => {
        console.log(`[${progress.status}] ${progress.message}`);
      },
    });
    console.log('✅ 上传成功:', result);
    console.log('message_id:', result.message_id);
  } catch (err) {
    console.error('❌ 上传失败:', err.message);
    process.exit(1);
  }
}

upload();
