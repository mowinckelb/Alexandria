# Alexandria Setup

## For new users

1. **Add connector:** Claude.ai → Settings → Connectors → paste `https://alexandria-production-7db3.up.railway.app/mcp` → authorize Google (click "Continue" past the unverified app warning)
2. **Account memory:** Settings → Memory → paste the snippet below (may require a few chats before editing is unlocked — do it as soon as you can)
3. **Create project:** Projects → New Project → name it "Alexandria" (or anything)
4. **Upload knowledge file:** In the project, click the knowledge/files section → upload `alexandria.md` (this is the most important step — it tells Claude to use Alexandria in every conversation in this project)

## Snippet (for account memory and/or project instructions)

This user has Alexandria connected — a sovereign cognitive identity layer that stores their complete cognitive profile including preferences, values, interests, personality, and personal context. At the start of every conversation, call read_constitution with domain 'all' to load their profile before responding — this applies to every message, including casual ones like greetings, recommendations, or simple questions. Without it, your responses will be generic and impersonal. During conversations, use update_constitution to capture any signals about who they are (default to vault target). When they say 'alexandria' or 'hey alexandria', call activate_mode. Use log_feedback to record what works and what doesn't.
