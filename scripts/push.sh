#!/usr/bin/env bash
# Push and verify CI. Use this instead of raw `git push`.
set -euo pipefail

echo "pushing..."
git push "$@"

PUSH_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date +%Y-%m-%dT%H:%M:%SZ)

echo "waiting for CI to start..."
sleep 20

# Check if any runs were triggered by this push
RUNS=$(gh run list --limit 5 --json databaseId,status,conclusion,name,event,createdAt 2>/dev/null)
NEW_RUNS=$(echo "$RUNS" | node -e "
  let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
    const runs=JSON.parse(d);
    const triggered=runs.filter(r=>r.event==='push'&&new Date(r.createdAt)>new Date(Date.now()-120000));
    console.log(JSON.stringify(triggered));
  })
" 2>/dev/null)

COUNT=$(echo "$NEW_RUNS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).length))" 2>/dev/null)

if [ "$COUNT" = "0" ]; then
  echo "no CI runs triggered by this push (paths didn't match any workflow trigger)"
  echo "last 3 runs:"
  gh run list --limit 3
  exit 0
fi

# Wait for triggered runs to complete
MAX_WAIT=300
WAITED=0
while true; do
  PENDING=$(echo "$NEW_RUNS" | node -e "
    let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
      const runs=JSON.parse(d);
      console.log(runs.filter(r=>r.status!=='completed').length);
    })
  " 2>/dev/null)

  if [ "$PENDING" = "0" ]; then break; fi
  if [ "$WAITED" -ge "$MAX_WAIT" ]; then
    echo "timeout (${MAX_WAIT}s). check: gh run list"
    exit 1
  fi
  sleep 15
  WAITED=$((WAITED + 15))
  # Re-fetch runs
  RUNS=$(gh run list --limit 5 --json databaseId,status,conclusion,name,event,createdAt 2>/dev/null)
  NEW_RUNS=$(echo "$RUNS" | node -e "
    let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
      const runs=JSON.parse(d);
      const triggered=runs.filter(r=>r.event==='push'&&new Date(r.createdAt)>new Date(Date.now()-300000));
      console.log(JSON.stringify(triggered));
    })
  " 2>/dev/null)
done

# Report
echo ""
echo "=== CI Results ==="
echo "$NEW_RUNS" | node -e "
  let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
    const runs=JSON.parse(d);
    for(const r of runs) console.log(r.conclusion==='success'?'  PASS':'  FAIL', r.name);
    const fails=runs.filter(r=>r.conclusion==='failure');
    if(fails.length>0){
      console.log('\nCI FAILED:',fails.map(r=>r.name).join(', '));
      process.exit(1);
    }
    console.log('\nall CI passing.');
  })
" 2>/dev/null
