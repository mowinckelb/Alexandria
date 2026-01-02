#!/usr/bin/env python3
"""
Helper script to upload files to Together AI.
Used by Node.js when the JS SDK doesn't work.
Usage: python scripts/together-upload.py <filepath> [purpose]
Output: JSON with {id, filename, bytes} on stdout
"""
import os
import sys
import json

# Get API key from environment
if 'TOGETHER_API_KEY' not in os.environ:
    print(json.dumps({"error": "TOGETHER_API_KEY not set"}))
    sys.exit(1)

if len(sys.argv) < 2:
    print(json.dumps({"error": "Usage: python together-upload.py <filepath> [purpose]"}))
    sys.exit(1)

filepath = sys.argv[1]
purpose = sys.argv[2] if len(sys.argv) > 2 else "fine-tune"

if not os.path.exists(filepath):
    print(json.dumps({"error": f"File not found: {filepath}"}))
    sys.exit(1)

try:
    # Suppress the SDK banner
    os.environ['TOGETHER_NO_BANNER'] = '1'
    
    from together import Together
    client = Together()
    
    result = client.files.upload(filepath, purpose=purpose)
    
    output = {
        "id": result.id,
        "filename": getattr(result, 'filename', os.path.basename(filepath)),
        "bytes": getattr(result, 'bytes', os.path.getsize(filepath)),
    }
    print(json.dumps(output))
except Exception as e:
    print(json.dumps({"error": str(e)}))
    sys.exit(1)

