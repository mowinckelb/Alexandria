/**
 * Product lifecycle test — verifies the full user journey works end-to-end.
 * Uses a real API key to test what an actual Author experiences.
 *
 * Tests the chain: Canon loads with content → constitution injects →
 * session events accepted → machine signal collected → hooks auto-update.
 *
 * Usage: npx tsx test/lifecycle.ts
 * Requires: ~/.alexandria/.api_key (a real account)
 * Set TEST_URL to override (default: https://mcp.mowinckel.ai)
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const BASE = process.env.TEST_URL || 'https://mcp.mowinckel.ai';
const HOME = process.env.HOME || process.env.USERPROFILE || '';
const ALEX_DIR = join(HOME, '.alexandria');
const API_KEY_PATH = join(ALEX_DIR, '.api_key');

interface TestResult {
  test: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<TestResult>) {
  process.stdout.write(`  ${name}... `);
  try {
    const result = await fn();
    results.push(result);
    console.log(result.passed ? 'PASS' : 'FAIL');
    if (!result.passed) console.log(`    ${result.details}`);
  } catch (err) {
    const result = { test: name, passed: false, details: `Error: ${err}` };
    results.push(result);
    console.log('FAIL');
    console.log(`    ${result.details}`);
  }
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('=== Alexandria Product Lifecycle Test ===');
  console.log(`Target: ${BASE}\n`);

  // Pre-check: API key exists
  if (!existsSync(API_KEY_PATH)) {
    console.log('SKIP: No API key found at ~/.alexandria/.api_key');
    console.log('This test requires a real Alexandria account.');
    process.exit(0);
  }
  const apiKey = readFileSync(API_KEY_PATH, 'utf-8').trim();
  const headers = { Authorization: `Bearer ${apiKey}` };

  // -----------------------------------------------------------------------
  // PHASE 1: Server health
  // -----------------------------------------------------------------------
  console.log('Phase 1: Server health');

  await test('Health endpoint reports fully healthy', async () => {
    const res = await fetch(`${BASE}/health`);
    const body = await res.json() as { status?: string; components?: Record<string, string> };
    const status = body.status || '';
    const brokenComponents = Object.entries(body.components || {}).filter(([, v]) => v !== 'ok').map(([k, v]) => `${k}=${v}`);
    return {
      test: 'Health endpoint',
      passed: res.ok && status === 'ok' && brokenComponents.length === 0,
      details: status === 'degraded'
        ? `DEGRADED — broken: ${brokenComponents.join(', ')}`
        : `status=${status}, all components ok`,
    };
  });

  // -----------------------------------------------------------------------
  // PHASE 2: Canon delivery (what SessionStart hook fetches)
  // -----------------------------------------------------------------------
  console.log('\nPhase 2: Canon delivery');

  let canonSize = 0;
  await test('Canon loads with auth', async () => {
    const res = await fetch(`${BASE}/canon`, { headers });
    const body = await res.text();
    canonSize = body.length;
    return {
      test: 'Canon loads',
      passed: res.ok && body.length > 1000,
      details: `HTTP ${res.status}, ${body.length} bytes`,
    };
  });

  await test('Canon contains Axioms', async () => {
    const res = await fetch(`${BASE}/canon`, { headers });
    const body = await res.text();
    const hasAxioms = body.includes('AXIOMS') || body.includes('Axioms');
    return {
      test: 'Canon contains Axioms',
      passed: hasAxioms,
      details: `has axioms section: ${hasAxioms}`,
    };
  });

  await test('Canon contains methodology', async () => {
    const res = await fetch(`${BASE}/canon`, { headers });
    const body = await res.text();
    const hasCanon = body.includes('CANON') || body.includes('Canon');
    const hasEditor = body.includes('Editor');
    const hasMercury = body.includes('Mercury');
    const hasPublisher = body.includes('Publisher');
    return {
      test: 'Canon contains methodology',
      passed: hasCanon && hasEditor && hasMercury && hasPublisher,
      details: `Canon: ${hasCanon}, Editor: ${hasEditor}, Mercury: ${hasMercury}, Publisher: ${hasPublisher}`,
    };
  });

  await test('Canon contains living machine instructions', async () => {
    const res = await fetch(`${BASE}/canon`, { headers });
    const body = await res.text();
    const hasMachineMd = body.includes('machine.md');
    const hasNotepad = body.includes('notepad');
    const hasMachineSignal = body.includes('.machine_signal');
    return {
      test: 'Canon contains living machine',
      passed: hasMachineMd && hasNotepad && hasMachineSignal,
      details: `machine.md: ${hasMachineMd}, notepad: ${hasNotepad}, signal: ${hasMachineSignal}`,
    };
  });

  await test('Canon returns version headers', async () => {
    const res = await fetch(`${BASE}/canon`, { headers });
    const accountStatus = res.headers.get('x-account-status');
    const accountUntil = res.headers.get('x-account-until');
    return {
      test: 'Canon version headers',
      passed: !!accountStatus,
      details: `account-status: ${accountStatus || 'missing'}, account-until: ${accountUntil || 'none'}`,
    };
  });

  // -----------------------------------------------------------------------
  // PHASE 3: Hooks delivery (what auto-update fetches)
  // -----------------------------------------------------------------------
  console.log('\nPhase 3: Hooks delivery');

  await test('Hooks endpoint returns shim installer', async () => {
    const res = await fetch(`${BASE}/hooks`, { headers });
    const body = await res.text();
    const isBash = body.includes('#!/usr/bin/env bash');
    const hasShim = body.includes('shim.sh');
    const hasSessionModes = body.includes('session-start') && body.includes('session-end');
    const hasSkillUpdate = body.includes('SKILL.md');
    return {
      test: 'Hooks endpoint',
      passed: res.ok && isBash && hasShim && hasSessionModes,
      details: `bash: ${isBash}, shim: ${hasShim}, modes: ${hasSessionModes}, skill: ${hasSkillUpdate}`,
    };
  });

  // -----------------------------------------------------------------------
  // PHASE 4: Session lifecycle (what hooks report)
  // -----------------------------------------------------------------------
  console.log('\nPhase 4: Session lifecycle');

  const testSessionId = `lifecycle-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  await test('Session start event accepted', async () => {
    const res = await fetch(`${BASE}/session`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'call',
        platform: 'lifecycle-test',
        session_id: testSessionId,
        constitution_injected: true,
        canon_fetched: true,
      }),
    });
    const body = await res.json() as { ok: boolean };
    return {
      test: 'Session start event',
      passed: res.ok && body.ok,
      details: `HTTP ${res.status}, ok: ${body.ok}`,
    };
  });

  await test('Session end event accepted', async () => {
    const res = await fetch(`${BASE}/session`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'end',
        platform: 'lifecycle-test',
        session_id: testSessionId,
        constitution_size: 50000,
        vault_entry_count: 15,
        domains_count: 5,
        constitution_injected: true,
        canon_fetched: true,
      }),
    });
    const body = await res.json() as { ok: boolean };
    return {
      test: 'Session end event',
      passed: res.ok && body.ok,
      details: `HTTP ${res.status}, ok: ${body.ok}`,
    };
  });

  await test('Machine signal accepted', async () => {
    const res = await fetch(`${BASE}/marketplace/signal`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signal: 'Lifecycle test: Canon loaded correctly. Machine instructions clear. Constitution-as-lens section is a strong addition.',
      }),
    });
    const raw = await res.text();
    let body: { ok?: boolean } = {};
    try {
      body = JSON.parse(raw) as { ok?: boolean };
    } catch {
      body = {};
    }
    return {
      test: 'Machine signal',
      passed: res.ok && body.ok === true,
      details: `HTTP ${res.status}, ok: ${String(body.ok)}, raw: ${raw.slice(0, 80)}`,
    };
  });

  // -----------------------------------------------------------------------
  // PHASE 5: Local file verification
  // -----------------------------------------------------------------------
  console.log('\nPhase 5: Local files');

  await test('Constitution directory exists with content', async () => {
    const constDir = join(ALEX_DIR, 'constitution');
    const exists = existsSync(constDir);
    let fileCount = 0;
    let totalSize = 0;
    if (exists) {
      const { readdirSync, statSync } = await import('fs');
      const files = readdirSync(constDir).filter(f => f.endsWith('.md'));
      fileCount = files.length;
      for (const f of files) {
        totalSize += statSync(join(constDir, f)).size;
      }
    }
    return {
      test: 'Constitution directory',
      passed: exists && fileCount > 0 && totalSize > 100,
      details: `exists: ${exists}, files: ${fileCount}, total: ${totalSize}b`,
    };
  });

  await test('Canon cached locally with valid content', async () => {
    const bpPath = join(ALEX_DIR, '.canon_local');
    const exists = existsSync(bpPath);
    let size = 0;
    let hasRequiredContent = false;
    if (exists) {
      const content = readFileSync(bpPath, 'utf-8');
      size = content.length;
      // Canon must contain core sections — size alone is not verification
      hasRequiredContent = content.includes('Axioms') && content.includes('Editor') && content.includes('Mercury');
    }
    return {
      test: 'Canon local cache',
      passed: exists && size > 1000 && hasRequiredContent,
      details: !exists
        ? 'MISSING — canon cache does not exist (hooks have not run)'
        : !hasRequiredContent
          ? `exists but missing required sections (${size}b) — corrupted cache`
          : `valid: ${size}b, contains Axioms+Editor+Mercury`,
    };
  });

  await test('Feedback file exists', async () => {
    const fbPath = join(ALEX_DIR, 'feedback.md');
    const exists = existsSync(fbPath);
    return {
      test: 'Feedback file',
      passed: exists,
      details: `exists: ${exists}`,
    };
  });

  await test('Machine.md exists', async () => {
    const machinePath = join(ALEX_DIR, 'machine.md');
    const exists = existsSync(machinePath);
    let size = 0;
    if (exists) size = readFileSync(machinePath).length;
    return {
      test: 'Machine.md',
      passed: exists && size > 50,
      details: `exists: ${exists}, size: ${size}b`,
    };
  });

  await test('Notepad exists', async () => {
    const notepadPath = join(ALEX_DIR, 'notepad.md');
    const exists = existsSync(notepadPath);
    return {
      test: 'Notepad',
      passed: exists,
      details: `exists: ${exists}`,
    };
  });

  // -----------------------------------------------------------------------
  // PHASE 6: Dashboard (Marketplace verification)
  // -----------------------------------------------------------------------
  console.log('\nPhase 6: Marketplace');

  await test('Dashboard returns valid metrics with no critical issues', async () => {
    const evaluate = (body: Record<string, unknown>) => {
      const issues: string[] = [];

      // Structure checks
      const runtime = body.runtime as Record<string, unknown> | undefined;
      const verification = body.verification as Record<string, unknown> | undefined;
      if (!runtime || typeof runtime.server_errors_24h !== 'number') issues.push('missing runtime');
      if (!verification || !('session_id_coverage' in verification)) issues.push('missing verification');
      if (typeof body.total_events !== 'number') issues.push('missing total_events');

      // Value checks — the numbers must make sense
      const status = body.status as string || '';
      if (status.startsWith('degraded')) issues.push(`status: ${status}`);

      const invariantIssues = body.invariant_issues as string[] | undefined;
      if (invariantIssues && invariantIssues.length > 0) issues.push(`invariants: ${invariantIssues.join(', ')}`);

      if (runtime && typeof runtime.server_errors_24h === 'number' && runtime.server_errors_24h > 0) {
        issues.push(`${runtime.server_errors_24h} server errors in 24h`);
      }

      const telemetry = body.telemetry_health as Record<string, unknown> | undefined;
      if (telemetry?.stale === true) issues.push('telemetry stale (no events for 24h+)');
      if (typeof body.parse_errors === 'number' && (body.parse_errors as number) > 0) issues.push(`${body.parse_errors} parse errors`);

      return { issues, hasStructure: issues.filter(i => i.startsWith('missing')).length === 0 };
    };

    let res = await fetch(`${BASE}/analytics/dashboard`, { headers });
    if (!res.ok) return { test: 'Dashboard', passed: false, details: `HTTP ${res.status}` };
    let body = await res.json() as Record<string, unknown>;
    let verdict = evaluate(body);

    // Retry for edge propagation
    for (let attempt = 0; attempt < 2 && !verdict.hasStructure; attempt++) {
      await pause(1500);
      res = await fetch(`${BASE}/analytics/dashboard`, { headers });
      if (!res.ok) break;
      body = await res.json() as Record<string, unknown>;
      verdict = evaluate(body);
    }

    return {
      test: 'Dashboard',
      passed: verdict.issues.length === 0,
      details: verdict.issues.length > 0
        ? `ISSUES: ${verdict.issues.join('; ')}`
        : `clean — ${body.total_events} events, status: ${body.status}`,
    };
  });

  // -----------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------
  console.log('\n=== RESULTS ===\n');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  for (const r of results) {
    if (!r.passed) console.log(`  FAIL: ${r.test} — ${r.details}`);
  }
  console.log(`\n  ${passed} passed, ${failed} failed out of ${results.length}`);
  if (failed > 0) {
    console.log('\n  Product lifecycle has gaps. Fix before shipping to users.');
  } else {
    console.log('\n  Full product lifecycle verified.');
  }
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
