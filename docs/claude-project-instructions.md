# Alexandria Setup

## For new users

1. **Add connector:** Claude.ai → Settings → Connectors → paste `https://alexandria-production-7db3.up.railway.app/mcp` → authorize Google (click "Continue" past the unverified app warning)
2. **Account memory:** Settings → Memory → add THREE separate memory edits (may require a few chats before editing is unlocked — do it as soon as you can)

That's it. Start conversations with "hey alexandria" and end them with "bye alexandria" — your AI learns who you are.

## How to use

**Start:** "Hey alexandria" / "Alexandria, what do you think?" — loads your cognitive profile for personalized responses. Works with any greeting too (hey, hi, hello).

**During:** Alexandria quietly captures signals about who you are — values, preferences, patterns. Happens automatically.

**End:** "Bye alexandria" / "bye" / "thanks" / "done" — triggers a comprehensive capture of everything learned in the conversation to your sovereign files on Google Drive.

## Memory edits (add as THREE separate entries)

**Edit 1 (start trigger):**

MANDATORY FIRST ACTION every conversation: call Alexandria read_constitution(domain='all') BEFORE generating any response. No exceptions regardless of query type or complexity. Trigger words: hey, hi, hello, alexandria, hey alexandria, hey claude, hi claude, or any greeting.

**Edit 2 (context):**

Alexandria is this user's sovereign cognitive identity layer storing their complete cognitive profile — preferences, values, interests, personality, and personal context. During conversations: use update_constitution to capture signals about who they are (default vault target). When they say 'alexandria' or 'hey alexandria', call activate_mode. Use log_feedback to record what works and what doesn't.

**Edit 3 (end trigger):**

When this user says bye, goodbye, thanks, done, bye alexandria, bye claude, or the conversation seems to be concluding: call update_constitution with target 'vault' to capture ALL signals observed during the conversation — preferences, opinions, decisions, patterns, values, topics they care about. One comprehensive capture. Do not skip this.

## Optional: project folder

For maximum reliability, create a Claude project and upload `alexandria.md` to its knowledge files.
