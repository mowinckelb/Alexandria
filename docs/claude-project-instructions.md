# Alexandria Setup

## For new users

1. **Add connector:** Claude.ai → Settings → Connectors → paste `https://alexandria-production-7db3.up.railway.app/mcp` → authorize Google (click "Continue" past the unverified app warning)
2. **Account memory:** Settings → Memory → add TWO separate memory edits (may require a few chats before editing is unlocked — do it as soon as you can)
3. **Create project:** Projects → New Project → name it "Alexandria" (or anything)
4. **Upload knowledge file:** In the project, click the knowledge/files section → upload `alexandria.md` (this is the most important step — it tells Claude to use Alexandria in every conversation in this project)

## Memory edits (add as TWO separate entries)

**Edit 1 (the trigger — short, imperative, add this first):**

MANDATORY FIRST ACTION every conversation: call Alexandria read_constitution(domain='all') BEFORE generating any response. No exceptions regardless of query type or complexity.

**Edit 2 (the context):**

Alexandria is this user's sovereign cognitive identity layer storing their complete cognitive profile — preferences, values, interests, personality, and personal context. During conversations: use update_constitution to capture signals about who they are (default vault target). When they say 'alexandria' or 'hey alexandria', call activate_mode. Use log_feedback to record what works and what doesn't.
