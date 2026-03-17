/**
 * Server integration test — verifies MCP server plumbing works.
 * No API key needed. No cost. This is the default test.
 *
 * Tests: health endpoint, MCP handshake (initialize + tools/list),
 * analytics endpoints, tool registration (all 6 tools present).
 *
 * Usage: npx tsx test/server.ts
 *
 * For AI behavior tests (does Claude actually use the tools?),
 * run test/e2e.ts — requires ANTHROPIC_API_KEY.
 */

const BASE = process.env.TEST_URL || 'http://localhost:3001';

interface TestResult {
  test: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<TestResult>) {
  process.stdout.write(`${name}... `);
  try {
    const result = await fn();
    results.push(result);
    console.log(result.passed ? 'PASS' : 'FAIL');
    if (!result.passed) console.log(`  ${result.details}`);
  } catch (err) {
    const result = { test: name, passed: false, details: `Error: ${err}` };
    results.push(result);
    console.log('FAIL');
    console.log(`  ${result.details}`);
  }
}

async function main() {
  console.log(`=== Alexandria Server Test ===`);
  console.log(`Target: ${BASE}\n`);

  // Test 1: Health endpoint
  await test('Health endpoint', async () => {
    const res = await fetch(`${BASE}/health`);
    const body = await res.json();
    return {
      test: 'Health endpoint',
      passed: res.ok && body.status === 'ok',
      details: `HTTP ${res.status}, body: ${JSON.stringify(body)}`,
    };
  });

  // Test 2: MCP HEAD probe (Claude does this to discover the server)
  await test('MCP HEAD probe', async () => {
    const res = await fetch(`${BASE}/mcp`, { method: 'HEAD' });
    const version = res.headers.get('mcp-protocol-version');
    return {
      test: 'MCP HEAD probe',
      passed: res.ok && !!version,
      details: `HTTP ${res.status}, MCP-Protocol-Version: ${version}`,
    };
  });

  // Test 3: MCP initialize
  await test('MCP initialize', async () => {
    const res = await fetch(`${BASE}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'test', version: '0.1.0' },
        },
      }),
    });
    const body = await res.json();
    const hasServerInfo = body.result?.serverInfo?.name === 'Alexandria';
    return {
      test: 'MCP initialize',
      passed: res.ok && hasServerInfo,
      details: `HTTP ${res.status}, serverInfo: ${JSON.stringify(body.result?.serverInfo)}`,
    };
  });

  // Test 4: MCP tools/list — all 6 tools registered
  await test('MCP tools/list (6 tools)', async () => {
    // Need to initialize first, then list tools in same session
    // Since server is stateless with no session, we send tools/list directly
    const res = await fetch(`${BASE}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {},
      }),
    });
    const body = await res.json();
    const toolNames = (body.result?.tools || []).map((t: { name: string }) => t.name).sort();
    const expected = ['activate_mode', 'log_feedback', 'mark_vault_processed', 'read_constitution', 'update_constitution', 'update_notepad'];
    const allPresent = expected.every(n => toolNames.includes(n));
    return {
      test: 'MCP tools/list (6 tools)',
      passed: res.ok && allPresent && toolNames.length === 6,
      details: `Found: [${toolNames.join(', ')}], expected: [${expected.join(', ')}]`,
    };
  });

  // Test 5: Analytics endpoint
  await test('Analytics endpoint', async () => {
    const res = await fetch(`${BASE}/analytics`);
    const body = await res.json();
    return {
      test: 'Analytics endpoint',
      passed: res.ok && typeof body.total === 'number',
      details: `HTTP ${res.status}, total events: ${body.total}`,
    };
  });

  // Test 6: Dashboard endpoint
  await test('Dashboard endpoint', async () => {
    const res = await fetch(`${BASE}/analytics/dashboard`);
    const body = await res.json();
    return {
      test: 'Dashboard endpoint',
      passed: res.ok && (body.status === 'ok' || body.status === 'no data'),
      details: `HTTP ${res.status}, status: ${body.status}`,
    };
  });

  // Test 7: Tool descriptions are substantial (>100 chars each — Anthropic best practice)
  await test('Tool descriptions are substantial', async () => {
    const res = await fetch(`${BASE}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/list',
        params: {},
      }),
    });
    const body = await res.json();
    const tools = body.result?.tools || [];
    const short = tools.filter((t: { description?: string }) => !t.description || t.description.length < 100);
    return {
      test: 'Tool descriptions are substantial',
      passed: short.length === 0,
      details: short.length > 0
        ? `Short descriptions: ${short.map((t: { name: string; description?: string }) => `${t.name} (${t.description?.length || 0} chars)`).join(', ')}`
        : `All ${tools.length} tools have 100+ char descriptions`,
    };
  });

  // Summary
  console.log('\n=== RESULTS ===\n');
  let allPassed = true;
  for (const r of results) {
    console.log(`[${r.passed ? 'PASS' : 'FAIL'}] ${r.test}`);
    if (!r.passed) {
      console.log(`       ${r.details}`);
      allPassed = false;
    }
  }
  console.log(`\n${allPassed ? 'All tests passed.' : 'Some tests failed.'}`);
  process.exit(allPassed ? 0 : 1);
}

main().catch(console.error);
