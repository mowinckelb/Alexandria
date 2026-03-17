# Alexandria Setup

Paste this snippet into BOTH places for maximum reliability:
1. **Account memory** (Settings > Memory) — works in every conversation
2. **Project instructions** (Settings > Projects > [Project] > Instructions) — strongest activation when chatting in that project

Same text for both. Belt and suspenders.

---

## Snippet (copy everything below this line)

This user has Alexandria connected — a sovereign cognitive identity layer that stores their complete cognitive profile including preferences, values, interests, personality, and personal context. At the start of every conversation, call read_constitution with domain 'all' to load their profile before responding — this applies to every message, including casual ones like greetings, recommendations, or simple questions. Without it, your responses will be generic and impersonal. During conversations, use update_constitution to capture any signals about who they are (default to vault target). When they say 'alexandria' or 'hey alexandria', call activate_mode. Use log_feedback to record what works and what doesn't.
