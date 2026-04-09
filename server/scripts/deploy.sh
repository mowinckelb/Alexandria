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

echo "Signing Blueprint..."
FOUNDER_KEY=$(cat "$HOME/.alexandria/.api_key" 2>/dev/null)
if [ -z "$FOUNDER_KEY" ]; then echo "ERROR: No API key at ~/.alexandria/.api_key"; exit 1; fi

# Fetch the exact Blueprint text the server is serving
BP_TEXT=$(curl -s "$SERVER_URL/blueprint" -H "Authorization: Bearer $FOUNDER_KEY")
BP_LEN=$(echo -n "$BP_TEXT" | wc -c | tr -d ' ')
if [ "$BP_LEN" -lt 100 ]; then echo "ERROR: Blueprint too short ($BP_LEN bytes)"; exit 1; fi

# Sign with local private key (Ed25519)
# Resolve to absolute Windows path for Node compatibility
KEY_FILE_ABS=$(cd "$(dirname "$KEY_FILE")" 2>/dev/null && pwd)/$(basename "$KEY_FILE")
SIGNATURE=$(echo -n "$BP_TEXT" | node -e "
  const crypto = require('crypto'), fs = require('fs');
  const key = crypto.createPrivateKey(fs.readFileSync(process.argv[1]));
  let d = ''; process.stdin.on('data', c => d += c);
  process.stdin.on('end', () => process.stdout.write(crypto.sign(null, Buffer.from(d), key).toString('hex')));
" "$KEY_FILE_ABS")

# Set secret — takes effect immediately, no re-deploy
echo "$SIGNATURE" | npx wrangler secret put BLUEPRINT_SIGNATURE 2>&1 | tail -1

# Verify — full client-side signature check (same flow as the hook)
sleep 5
PUB_KEY=$(grep BLUEPRINT_PUBLIC_KEY wrangler.toml | cut -d'"' -f2)
SIG_HEADER=$(curl -sI "$SERVER_URL/blueprint" -H "Authorization: Bearer $FOUNDER_KEY" | grep -i "x-blueprint-signature" | tr -d '\r' | cut -d' ' -f2)
BP_VERIFY=$(curl -s "$SERVER_URL/blueprint" -H "Authorization: Bearer $FOUNDER_KEY")
VERIFIED=$(echo -n "$BP_VERIFY" | node -e "
  const crypto = require('crypto');
  const pubKey = crypto.createPublicKey({ key: Buffer.from('$PUB_KEY','hex'), format:'der', type:'spki' });
  const sig = Buffer.from('$SIG_HEADER','hex');
  let d=''; process.stdin.on('data',c=>d+=c);
  process.stdin.on('end',()=>console.log(crypto.verify(null,Buffer.from(d),pubKey,sig)?'VALID':'INVALID'));
" 2>/dev/null)
HEALTH=$(curl -s "$SERVER_URL/health" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).status))")

echo "Blueprint: $BP_LEN bytes signed"
echo "Signature: $VERIFIED"
echo "Health: $HEALTH"

if [ "$VERIFIED" != "VALID" ]; then
  echo "ERROR: Signature verification failed after deploy"
  exit 1
fi
echo ""
echo "Run smoke tests: bash test/smoke.sh"
