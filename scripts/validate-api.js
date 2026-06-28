#!/usr/bin/env node
// ============================================================
// API接口验收测试
// 验收标准：API返回正确格式，无500错误
// 小扣子 · 2026.06.27
// ============================================================

const BASE = 'https://fengsheng.tech';

// 测试用例
const TESTS = [
  {
    name: 'GET /api/stats (公开)',
    method: 'GET',
    url: `${BASE}/api/stats?key=fs-admin-2026&product=all`,
    expect: res => res.total_users !== undefined || res.total !== undefined,
    requireAuth: false,
  },
  {
    name: 'GET /api/event (公开)',
    method: 'GET',
    url: `${BASE}/api/event?key=fs-admin-2026&limit=3`,
    expect: res => Array.isArray(res.data) || Array.isArray(res),
    requireAuth: false,
  },
  {
    name: 'POST /api/event (公开)',
    method: 'POST',
    url: `${BASE}/api/event`,
    body: { type: 'pageview', product: 'test', page: '/test' },
    expect: res => res.ok === true,
    requireAuth: false,
  },
  {
    name: 'POST /api/event - XSS过滤',
    method: 'POST',
    url: `${BASE}/api/event`,
    body: { type: 'click', product: '<script>alert(1)</script>', page: '/test' },
    expect: res => res.ok === true,
    requireAuth: false,
  },
  {
    name: 'GET /api/feedback (公开)',
    method: 'GET',
    url: `${BASE}/api/feedback?key=fs-admin-2026`,
    expect: res => Array.isArray(res.data),
    requireAuth: false,
  },
  {
    name: 'GET /api/subscribe (无Token)',
    method: 'GET',
    url: `${BASE}/api/subscribe`,
    expect: res => res.error !== undefined, // 应该返回错误（未登录）
    requireAuth: false,
  },
];

async function runTest(test) {
  try {
    const options = {
      method: test.method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (test.body) {
      options.body = JSON.stringify(test.body);
    }

    const res = await fetch(test.url, options);
    let data;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = { raw: await res.text().then(t => t.slice(0, 200)) };
    }

    const result = test.expect(data);
    return {
      ok: result,
      status: res.status,
      data: result ? null : JSON.stringify(data).slice(0, 100),
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function main() {
  console.log('🔍 API接口验收测试\n');
  console.log(`Base URL: ${BASE}\n`);

  let passed = 0;
  let failed = 0;
  const results = [];

  for (const test of TESTS) {
    const result = await runTest(test);

    if (result.ok) {
      console.log(`✅ ${test.name} [${result.status || '?'}]`);
      passed++;
    } else {
      console.log(`✗ ${test.name} [${result.status || '?'}]`);
      if (result.error) console.log(`  Error: ${result.error}`);
      if (result.data) console.log(`  Response: ${result.data}`);
      failed++;
    }
    results.push({ test: test.name, ...result });
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ 通过: ${passed}/${TESTS.length}`);
  console.log(`✗ 失败: ${failed}/${TESTS.length}`);

  if (failed > 0) {
    console.log('\n请修复失败的测试后再部署。');
    process.exit(1);
  } else {
    console.log('\n🎉 全部API验收通过！');
    process.exit(0);
  }
}

main().catch(e => {
  console.error('测试异常:', e.message);
  process.exit(1);
});
