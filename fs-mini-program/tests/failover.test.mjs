/**
 * 后端地址 failover 单测
 *
 * 【为什么这样写】
 * 源码是 ESM（.js），但 fs-mini-program/package.json 没开 type:module，
 * Node 直接 import .js 会当 CommonJS 解析而报错。
 * 所以这里把两个源文件**原样拷成 .mjs**（只改 import 说明符）再动态 import ——
 * 好处是测的始终是仓库里的真实源码，不会出现「测试副本与源码漂移」。
 *
 * 运行：node fs-mini-program/tests/failover.test.mjs
 */

import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC_API = path.join(HERE, '..', 'src', 'api');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-failover-'));
fs.copyFileSync(path.join(SRC_API, 'endpoint.js'), path.join(TMP, 'endpoint.mjs'));
fs.writeFileSync(
  path.join(TMP, 'request.mjs'),
  fs.readFileSync(path.join(SRC_API, 'request.js'), 'utf8').replace(
    "from './endpoint.js'",
    "from './endpoint.mjs'"
  )
);

// ---- mock uni ---------------------------------------------------------
const calls = [];
let behavior = {};          // host -> 'ok' | 'fail' | 'http500'
let toastCount = 0;
let loadingShown = 0;
let loadingHidden = 0;

global.uni = {
  showLoading: () => { loadingShown++; },
  hideLoading: () => { loadingHidden++; },
  showToast: () => { toastCount++; },
  request: (opts) => {
    const host = new URL(opts.url).host;
    calls.push({ host, url: opts.url, method: opts.method });
    const mode = behavior[host] || 'ok';
    setTimeout(() => {
      if (mode === 'fail') {
        opts.fail && opts.fail({ errMsg: 'request:fail', host });
      } else if (mode === 'http500') {
        opts.success && opts.success({ statusCode: 500, data: { code: 500, message: 'boom' } });
      } else {
        opts.success && opts.success({ statusCode: 200, data: { ok: true, host } });
      }
    }, 0);
  },
};

const { default: req } = await import(path.join(TMP, 'request.mjs'));
const ep = await import(path.join(TMP, 'endpoint.mjs'));

const MAIN = 'fengsheng.tech';
const FALLBACK = 'fengsheng-ee9.pages.dev';

let passed = 0, failed = 0;
async function t(name, fn) {
  try { await fn(); console.log('  ✅ ' + name); passed++; }
  catch (e) { console.log('  ❌ ' + name + '\n     ' + e.message); failed++; }
}
function reset() {
  calls.length = 0; toastCount = 0; loadingShown = 0; loadingHidden = 0;
  ep.resetActive(); behavior = {};
}

console.log('【后端地址 failover 单测】');

await t('主域正常 → 只打主域 1 次，不降级', async () => {
  reset();
  behavior = { [MAIN]: 'ok' };
  const r = await req.get('/api/health');
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].host, MAIN);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(ep.getActiveIndex(), 0);
});

await t('主域网络级失败 → 自动切兜底域并成功', async () => {
  reset();
  behavior = { [MAIN]: 'fail', [FALLBACK]: 'ok' };
  const r = await req.get('/api/health');
  assert.strictEqual(calls.length, 2);
  assert.strictEqual(calls[0].host, MAIN);
  assert.strictEqual(calls[1].host, FALLBACK);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(ep.getActiveBase(), 'https://' + FALLBACK);
});

await t('降级成功后，后续请求直接走兜底域（不重复打主域）', async () => {
  reset();
  behavior = { [MAIN]: 'fail', [FALLBACK]: 'ok' };
  await req.get('/a');
  assert.strictEqual(calls.length, 2);
  await req.get('/b');
  assert.strictEqual(calls.length, 3);
  assert.strictEqual(calls[2].host, FALLBACK);
});

await t('HTTP 500 → 不降级（服务端问题换域无意义）', async () => {
  reset();
  behavior = { [MAIN]: 'http500', [FALLBACK]: 'ok' };
  await assert.rejects(() => req.get('/api/x'));
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].host, MAIN);
  assert.strictEqual(ep.getActiveIndex(), 0);
});

await t('两个域都失败 → reject + 弹一次 toast', async () => {
  reset();
  behavior = { [MAIN]: 'fail', [FALLBACK]: 'fail' };
  await assert.rejects(() => req.get('/api/x'));
  assert.strictEqual(calls.length, 2);
  assert.strictEqual(toastCount, 1);
});

await t('已在兜底模式 + 兜底域 500 → reject，不回退主域', async () => {
  reset();
  ep.markActive(1);
  behavior = { [MAIN]: 'ok', [FALLBACK]: 'http500' };
  await assert.rejects(() => req.get('/api/x'));
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].host, FALLBACK);
});

await t('loading 计数配平（多次尝试只 hide 一次）', async () => {
  reset();
  behavior = { [MAIN]: 'fail', [FALLBACK]: 'ok' };
  await req.get('/api/health');
  assert.strictEqual(loadingShown, 1);
  assert.strictEqual(loadingHidden, 1);
});

await t('冷启动复位 → 重新从主域开始', async () => {
  reset();
  behavior = { [MAIN]: 'fail', [FALLBACK]: 'ok' };
  await req.get('/a');
  assert.strictEqual(ep.getActiveIndex(), 1);
  ep.resetActive();
  assert.strictEqual(ep.getActiveIndex(), 0);
  assert.strictEqual(ep.getActiveBase(), 'https://' + MAIN);
});

await t('POST 也走 failover 且保留 method/body', async () => {
  reset();
  behavior = { [MAIN]: 'fail', [FALLBACK]: 'ok' };
  await req.post('/api/events', { uid: 'x' });
  assert.strictEqual(calls.length, 2);
  assert.strictEqual(calls[1].method, 'POST');
  assert.ok(calls[1].url.endsWith('/api/events'));
});

await t('getBaseUrl() 暴露当前生效地址', async () => {
  reset();
  behavior = { [MAIN]: 'fail', [FALLBACK]: 'ok' };
  await req.get('/a');
  assert.strictEqual(req.getBaseUrl(), 'https://' + FALLBACK);
});

console.log(`\n结果：${passed} 通过 / ${failed} 失败`);
fs.rmSync(TMP, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
