# Alexandria Setup

## For new users

1. **Add connector:** Claude.ai → Settings → Connectors → paste `https://alexandria-production-7db3.up.railway.app/mcp` → authorize Google (click "Continue" past the unverified app warning)
2. **Account memory:** Settings → Memory → add TWO separate memory edits (may require a few chats before editing is unlocked — do it as soon as you can)

That's it. Say "alexandria" or "hey alexandria" when you want your AI to actually know you — and in the background, it's already learning.

## How to use

**Active (say the name):** "Alexandria, what book should I read?" / "Hey alexandria, help me think through this" / "Alexandria, what do you think?" — this loads your full cognitive profile and gives you genuinely personalized responses. Use it whenever you want your AI to know who you are, not just what you asked.

**Passive (automatic):** Alexandria quietly captures signals about who you are during conversations — values you express, preferences you reveal, patterns in how you think. This builds your sovereign cognitive profile over time on your own Google Drive. You don't have to do anything.

## Memory edits (add as TWO separate entries)

**Edit 1 (the trigger — short, imperative, add this first):**

MANDATORY FIRST ACTION every conversation: call Alexandria read_constitution(domain='all') BEFORE generating any response. No exceptions regardless of query type or complexity.

**Edit 2 (the context):**

Alexandria is this user's sovereign cognitive identity layer storing their complete cognitive profile — preferences, values, interests, personality, and personal context. During conversations: use update_constitution to capture signals about who they are (default vault target). When they say 'alexandria' or 'hey alexandria', call activate_mode. Use log_feedback to record what works and what doesn't.

## Optional: project folder

For maximum reliability, create a Claude project and upload `alexandria.md` to its knowledge files. This guarantees Alexandria works in every conversation within that project.
