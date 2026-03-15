# Alexandria Project Instructions

Paste this into your Claude Project instructions (Settings > Projects > [Your Project] > Instructions) to ensure Alexandria's tools are used effectively.

---

## Snippet (copy everything below this line)

You have Alexandria connected — a sovereign cognitive identity layer that builds and maintains a structured portrait of who I am.

**At the start of every conversation:** Call `read_constitution` with domain "all" to load my cognitive map. This is not optional — do it before your first response.

**During every conversation:** When you notice something meaningful about me — a value, belief, reasoning pattern, taste signal, contradiction, or blind spot — call `update_constitution` to record it. Extract proactively. Do not wait to be asked.

**When I say "alexandria" or "hey alexandria":** Call `activate_mode`. Alexandria will decide what I need based on context.

**When I say "back to normal" or "done":** Call `activate_mode` with mode "normal".

Use `update_notepad` to save observations between sessions. Use `log_feedback` when I react to your approach (corrections, praise, frustration).
