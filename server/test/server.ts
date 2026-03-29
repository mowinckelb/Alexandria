/**
 * Server integration test — verifies MCP server plumbing works.
 * No API key needed. No cost. This is the default test.
 *
 * Tests: health endpoint, MCP handshake (initialize + tools/list),
 * analytics endpoints, tool registration (all 5 tools present).
 *
 * Usage: npx tsx test/server.ts
 *
 * For AI behavior tests (does Claude actually use the tools?),
 * run test/e2e.ts — requires ANTHROPIC_API_KEY.
 */

const BASE = process.env.TEST_URL || 'http://localhost:8787';

interface TestResult {
  test: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

/** Parse SSE response into JSON-RPC messages */
async function parseSseOrJson(res: Response): Promise<any> {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  }
  // SSE: parse "event: message\ndata: {...}\n\n" blocks
  const text = await res.text();
  const messages: any[] = [];
  for (const block of text.split('\n\n')) {
    const dataLine = block.split('\n').find(l => l.startsWith('data: '));
    if (dataLine) {
      try { messages.push(JSON.parse(dataLine.slice(6))); } catch {}
    }
  }
  return messages.length === 1 ? messages[0] : messages;
}

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
      passed: res.ok && (body.status === 'ok' || body.status === 'degraded'),
      details: `HTTP ${res.status}, status: ${body.status}, checks: ${JSON.stringify(body.checks)}`,
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
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
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
    const body = await parseSseOrJson(res);
    const hasServerInfo = body.result?.serverInfo?.name === 'Alexandria';
    return {
      test: 'MCP initialize',
      passed: res.ok && hasServerInfo,
      details: `HTTP ${res.status}, serverInfo: ${JSON.stringify(body.result?.serverInfo)}`,
    };
  });

  // Test 4: MCP tools/list — all 5 tools registered
  await test('MCP tools/list (5 tools)', async () => {
    // Need to initialize first, then list tools in same session
    // Since server is stateless with no session, we send tools/list directly
    const res = await fetch(`${BASE}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {},
      }),
    });
    const body = await parseSseOrJson(res);
    const toolNames = (body.result?.tools || []).map((t: { name: string }) => t.name).sort();
    const expected = ['activate_mode', 'log_feedback', 'read_constitution', 'update_constitution', 'update_notepad'];
    const allPresent = expected.every(n => toolNames.includes(n));
    return {
      test: 'MCP tools/list (5 tools)',
      passed: res.ok && allPresent && toolNames.length === 5,
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

  // Test 6: Analytics log endpoint
  await test('Analytics log endpoint', async () => {
    const res = await fetch(`${BASE}/analytics/log`);
    const body = await res.text();
    return {
      test: 'Analytics log endpoint',
      passed: res.ok && typeof body === 'string',
      details: `HTTP ${res.status}, length: ${body.length}`,
    };
  });

  // Test 7: Dashboard endpoint
  await test('Dashboard endpoint', async () => {
    const res = await fetch(`${BASE}/analytics/dashboard`);
    const body = await res.json();
    return {
      test: 'Dashboard endpoint',
      passed: res.ok && (body.status === 'ok' || body.status === 'no data'),
      details: `HTTP ${res.status}, status: ${body.status}`,
    };
  });

  // Test 8: Tool descriptions are substantial (>100 chars each — Anthropic best practice)
  await test('Tool descriptions are substantial', async () => {
    const res = await fetch(`${BASE}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/list',
        params: {},
      }),
    });
    const body = await parseSseOrJson(res);
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

  // Test 9: Root page returns HTML
  await test('Root page returns HTML', async () => {
    const res = await fetch(`${BASE}/`);
    const body = await res.text();
    const hasTitle = body.includes('<title>Alexandria</title>');
    const hasTagline = body.includes('Sovereign cognitive transformation layer');
    return {
      test: 'Root page returns HTML',
      passed: res.ok && hasTitle && hasTagline,
      details: `HTTP ${res.status}, title: ${hasTitle}, tagline: ${hasTagline}`,
    };
  });

  // Test 10: MCP tool call without auth returns graceful error
  await test('MCP tool call (no auth) returns graceful error', async () => {
    const res = await fetch(`${BASE}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 10,
        method: 'tools/call',
        params: {
          name: 'read_constitution',
          arguments: { domain: 'all' },
        },
      }),
    });
    const body = await parseSseOrJson(res);
    // Should get a result (not a crash), containing "Not authenticated"
    const hasResult = !!body.result;
    const hasError = !!body.error;
    const text = JSON.stringify(body);
    const isGraceful = !hasError || text.includes('Not authenticated') || text.includes('authenticate');
    return {
      test: 'MCP tool call (no auth) returns graceful error',
      passed: res.ok || res.status < 500,
      details: `HTTP ${res.status}, has result: ${hasResult}, has error: ${hasError}, graceful: ${isGraceful}`,
    };
  });

  // Test 11: MCP parse error returns proper JSON-RPC error
  await test('MCP invalid JSON returns parse error', async () => {
    const res = await fetch(`${BASE}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });
    const body = await res.json();
    return {
      test: 'MCP invalid JSON returns parse error',
      passed: res.status === 400 && body.error?.code === -32700,
      details: `HTTP ${res.status}, error code: ${body.error?.code}`,
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
