/**
 * Product lifecycle test — verifies the full user journey works end-to-end.
 * Uses a real API key to test what an actual Author experiences.
 *
 * Tests the chain: Blueprint loads with content → constitution injects →
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

  await test('Health endpoint responds OK', async () => {
    const res = await fetch(`${BASE}/health`);
    const body = await res.json() as { status: string; checks: Record<string, string> };
    return {
      test: 'Health endpoint',
      passed: res.ok && body.status === 'ok',
      details: `status=${body.status}, checks=${JSON.stringify(body.checks)}`,
    };
  });

  // -----------------------------------------------------------------------
  // PHASE 2: Blueprint delivery (what SessionStart hook fetches)
  // -----------------------------------------------------------------------
  console.log('\nPhase 2: Blueprint delivery');

  let blueprintSize = 0;
  await test('Blueprint loads with auth', async () => {
    const res = await fetch(`${BASE}/blueprint`, { headers });
    const body = await res.text();
    blueprintSize = body.length;
    return {
      test: 'Blueprint loads',
      passed: res.ok && body.length > 1000,
      details: `HTTP ${res.status}, ${body.length} bytes`,
    };
  });

  await test('Blueprint contains Axioms', async () => {
    const res = await fetch(`${BASE}/blueprint`, { headers });
    const body = await res.text();
    const hasAxioms = body.includes('AXIOMS') || body.includes('Axioms');
    return {
      test: 'Blueprint contains Axioms',
      passed: hasAxioms,
      details: `has axioms section: ${hasAxioms}`,
    };
  });

  await test('Blueprint contains methodology', async () => {
    const res = await fetch(`${BASE}/blueprint`, { headers });
    const body = await res.text();
    const hasBlueprint = body.includes('BLUEPRINT') || body.includes('Blueprint');
    const hasEditor = body.includes('Editor');
    const hasMercury = body.includes('Mercury');
    const hasPublisher = body.includes('Publisher');
    return {
      test: 'Blueprint contains methodology',
      passed: hasBlueprint && hasEditor && hasMercury && hasPublisher,
      details: `Blueprint: ${hasBlueprint}, Editor: ${hasEditor}, Mercury: ${hasMercury}, Publisher: ${hasPublisher}`,
    };
  });

  await test('Blueprint contains living machine instructions', async () => {
    const res = await fetch(`${BASE}/blueprint`, { headers });
    const body = await res.text();
    const hasMachineMd = body.includes('machine.md');
    const hasNotepad = body.includes('notepad');
    const hasMachineSignal = body.includes('.machine_signal');
    return {
      test: 'Blueprint contains living machine',
      passed: hasMachineMd && hasNotepad && hasMachineSignal,
      details: `machine.md: ${hasMachineMd}, notepad: ${hasNotepad}, signal: ${hasMachineSignal}`,
    };
  });

  await test('Blueprint returns version headers', async () => {
    const res = await fetch(`${BASE}/blueprint`, { headers });
    const hooksVersion = res.headers.get('x-hooks-version');
    const bpHash = res.headers.get('x-blueprint-hash');
    return {
      test: 'Blueprint version headers',
      passed: !!hooksVersion && !!bpHash,
      details: `hooks-version: ${hooksVersion}, hash: ${bpHash}`,
    };
  });

  // -----------------------------------------------------------------------
  // PHASE 3: Hooks delivery (what auto-update fetches)
  // -----------------------------------------------------------------------
  console.log('\nPhase 3: Hooks delivery');

  await test('Hooks endpoint returns bash script', async () => {
    const res = await fetch(`${BASE}/hooks`, { headers });
    const body = await res.text();
    const isBash = body.includes('#!/usr/bin/env bash') || body.includes('cat >');
    const hasSessionStart = body.includes('session-start.sh');
    const hasSessionEnd = body.includes('session-end.sh');
    const hasSelfCheck = body.includes('self_check') || body.includes('SELF-CHECK');
    const hasSkillUpdate = body.includes('SKILL.md') || body.includes('SKILL_UPDATE');
    return {
      test: 'Hooks endpoint',
      passed: res.ok && isBash && hasSessionStart && hasSessionEnd,
      details: `bash: ${isBash}, start: ${hasSessionStart}, end: ${hasSessionEnd}, self-check: ${hasSelfCheck}, skill-update: ${hasSkillUpdate}`,
    };
  });

  // -----------------------------------------------------------------------
  // PHASE 4: Session lifecycle (what hooks report)
  // -----------------------------------------------------------------------
  console.log('\nPhase 4: Session lifecycle');

  await test('Session start event accepted', async () => {
    const res = await fetch(`${BASE}/session`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'start',
        platform: 'lifecycle-test',
        constitution_injected: true,
        blueprint_fetched: true,
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
        constitution_size: 50000,
        vault_entry_count: 15,
        domains_count: 5,
        constitution_injected: true,
        blueprint_fetched: true,
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
    const res = await fetch(`${BASE}/factory/signal`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signal: 'Lifecycle test: Blueprint loaded correctly. Machine instructions clear. Constitution-as-lens section is a strong addition.',
      }),
    });
    const body = await res.json() as { ok: boolean };
    return {
      test: 'Machine signal',
      passed: res.ok && body.ok,
      details: `HTTP ${res.status}, ok: ${body.ok}`,
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

  await test('Blueprint cached locally', async () => {
    const bpPath = join(ALEX_DIR, '.blueprint_local');
    const exists = existsSync(bpPath);
    let size = 0;
    if (exists) {
      size = readFileSync(bpPath).length;
    }
    return {
      test: 'Blueprint local cache',
      passed: exists && size > 1000,
      details: `exists: ${exists}, size: ${size}b`,
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
  // PHASE 6: Dashboard (Factory verification)
  // -----------------------------------------------------------------------
  console.log('\nPhase 6: Factory');

  await test('Dashboard returns metrics', async () => {
    const res = await fetch(`${BASE}/analytics/dashboard`);
    const body = await res.json() as { status: string; total_events: number };
    return {
      test: 'Dashboard',
      passed: res.ok && body.status !== undefined && body.total_events >= 0,
      details: `status: ${body.status}, events: ${body.total_events}`,
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
