#!/usr/bin/env bash
# Signed deploy: build → deploy → fetch Blueprint → sign locally → set secret.
# The secret takes effect immediately — no second deploy needed.
# Private key: ~/.alexandria-deploy/blueprint.key (never on server)
set -e

SERVER_DIR="$(cd "$(dirname "$0")/.." && pwd)"
KEY_FILE="$HOME/.alexandria-deploy/blueprint.key"
SERVER_URL="https://mcp.mowinckel.ai"

if [ ! -f "$KEY_FILE" ]; then
  echo "ERROR: Signing key not found at $KEY_FILE"
  echo "Generate one: node scripts/keygen.js"
  exit 1
fi

cd "$SERVER_DIR"

echo "Deploying..."
npx wrangler deploy 2>&1 | grep -E "Uploaded|Deployed|Version"
sleep 2

echo "Signing Blueprint + Hooks Payload..."
FOUNDER_KEY=$(cat "$HOME/.alexandria/.api_key" 2>/dev/null)
if [ -z "$FOUNDER_KEY" ]; then echo "ERROR: No API key at ~/.alexandria/.api_key"; exit 1; fi

# Resolve to absolute Windows path for Node compatibility
KEY_FILE_ABS=$(cd "$(dirname "$KEY_FILE")" 2>/dev/null && pwd)/$(basename "$KEY_FILE")

sign_content() {
  echo -n "$1" | node -e "
    const crypto = require('crypto'), fs = require('fs');
    const key = crypto.createPrivateKey(fs.readFileSync(process.argv[1]));
    let d = ''; process.stdin.on('data', c => d += c);
    process.stdin.on('end', () => process.stdout.write(crypto.sign(null, Buffer.from(d), key).toString('hex')));
  " "$KEY_FILE_ABS"
}

# Sign Blueprint
BP_TEXT=$(curl -s "$SERVER_URL/blueprint" -H "Authorization: Bearer $FOUNDER_KEY")
BP_LEN=$(echo -n "$BP_TEXT" | wc -c | tr -d ' ')
if [ "$BP_LEN" -lt 100 ]; then echo "ERROR: Blueprint too short ($BP_LEN bytes)"; exit 1; fi
BP_SIG=$(sign_content "$BP_TEXT")
echo "$BP_SIG" | npx wrangler secret put BLUEPRINT_SIGNATURE 2>&1 | tail -1

# Sign Hooks Payload
HP_TEXT=$(curl -s "$SERVER_URL/hooks/payload")
HP_LEN=$(echo -n "$HP_TEXT" | wc -c | tr -d ' ')
if [ "$HP_LEN" -lt 100 ]; then echo "ERROR: Hooks payload too short ($HP_LEN bytes)"; exit 1; fi
HP_SIG=$(sign_content "$HP_TEXT")
echo "$HP_SIG" | npx wrangler secret put HOOKS_PAYLOAD_SIGNATURE 2>&1 | tail -1

# Verify — full client-side signature check (same flow as the shim)
sleep 5
PUB_KEY=$(grep BLUEPRINT_PUBLIC_KEY wrangler.toml | cut -d'"' -f2)

verify_sig() {
  local content="$1" sig="$2"
  echo -n "$content" | node -e "
    const crypto = require('crypto');
    const pubKey = crypto.createPublicKey({ key: Buffer.from('$PUB_KEY','hex'), format:'der', type:'spki' });
    const sig = Buffer.from('$sig','hex');
    let d=''; process.stdin.on('data',c=>d+=c);
    process.stdin.on('end',()=>console.log(crypto.verify(null,Buffer.from(d),pubKey,sig)?'VALID':'INVALID'));
  " 2>/dev/null
}

# Verify Blueprint
BP_SIG_HEADER=$(curl -sI "$SERVER_URL/blueprint" -H "Authorization: Bearer $FOUNDER_KEY" | grep -i "x-blueprint-signature" | tr -d '\r' | cut -d' ' -f2)
BP_VERIFY_TEXT=$(curl -s "$SERVER_URL/blueprint" -H "Authorization: Bearer $FOUNDER_KEY")
BP_VERIFIED=$(verify_sig "$BP_VERIFY_TEXT" "$BP_SIG_HEADER")

# Verify Hooks Payload
HP_SIG_HEADER=$(curl -sI "$SERVER_URL/hooks/payload" | grep -i "x-hooks-signature" | tr -d '\r' | cut -d' ' -f2)
HP_VERIFY_TEXT=$(curl -s "$SERVER_URL/hooks/payload")
HP_VERIFIED=$(verify_sig "$HP_VERIFY_TEXT" "$HP_SIG_HEADER")

HEALTH=$(curl -s "$SERVER_URL/health" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).status))")

echo "Blueprint: $BP_LEN bytes signed"
echo "Signature: $BP_VERIFIED"
echo "Hooks payload: $HP_LEN bytes signed"
echo "Hooks signature: $HP_VERIFIED"
echo "Health: $HEALTH"

if [ "$BP_VERIFIED" != "VALID" ]; then
  echo "ERROR: Blueprint signature verification failed"
  exit 1
fi
if [ "$HP_VERIFIED" != "VALID" ]; then
  echo "ERROR: Hooks payload signature verification failed"
  exit 1
fi
echo ""
echo "Run smoke tests: bash test/smoke.sh"
