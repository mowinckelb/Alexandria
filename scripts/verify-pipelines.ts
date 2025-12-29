const TEST_USER_ID = '00000000-0000-0000-0000-000000000001'; // Default test user
const API_BASE = 'http://localhost:3000/api';

async function runVerification() {
    console.log('🚀 Starting Verification...');

    // 1. Check Ping
    console.log('\n--- Checking System Health ---');
    try {
        const pingRes = await fetch(`${API_BASE}/debug/ping`);
        const pingData = await pingRes.json();
        console.log('Ping Status:', pingData.success ? '✅ OK' : '❌ FAILED');
        if (!pingData.success) console.error('Ping Error:', pingData.error);
    } catch (e) {
        console.error('Ping request failed. Is the dev server running?', e instanceof Error ? e.message : e);
        return;
    }

    // 2. Get Initial State
    console.log('\n--- Getting Initial State ---');
    const stateResBefore = await fetch(`${API_BASE}/debug/state?userId=${TEST_USER_ID}`);
    const stateBefore = await stateResBefore.json();
    const countsBefore = stateBefore.counts;
    console.log('Initial Counts:', countsBefore);

    // 3. Run Ingest
    console.log('\n--- Running Ingest ---');
    const ingestRes = await fetch(`${API_BASE}/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            text: "I love coding at night when it's quiet. My favorite language is TypeScript because of the type safety.",
            userId: TEST_USER_ID
        })
    });
    const ingestData = await ingestRes.json();
    console.log('Ingest Result:', ingestData.success ? '✅ Success' : '❌ Failed');
    console.log('Summary:', ingestData.summary);

    // 4. Verify State Change
    console.log('\n--- Verifying State Change ---');
    const stateResAfter = await fetch(`${API_BASE}/debug/state?userId=${TEST_USER_ID}`);
    const stateAfter = await stateResAfter.json();
    const countsAfter = stateAfter.counts;

    const diff = {
        entries: countsAfter.entries - countsBefore.entries,
        memoryFragments: countsAfter.memoryFragments - countsBefore.memoryFragments,
        trainingPairs: countsAfter.trainingPairs - countsBefore.trainingPairs
    };

    console.log('Diff:', diff);

    const success = diff.entries > 0 && diff.memoryFragments > 0 && diff.trainingPairs > 0;
    console.log('\nVerification:', success ? '✅ ALL PASSED' : '❌ FAILED');

    if (diff.entries === 0) console.error('❌ Entry not saved');
    if (diff.memoryFragments === 0) console.error('❌ Memory fragments not saved');
    if (diff.trainingPairs === 0) console.error('❌ Training pairs not saved');
}

runVerification();
