---
name: alexandria
description: Autonomous cognitive maintenance — vault reprocessing, ontology/constitution/notepad development
schedule: daily 03:00
---

Your actual instructions live on GitHub. Fetch and follow the current version.

```bash
curl -s https://raw.githubusercontent.com/mowinckelb/Alexandria/main/factory/skills/scheduled.md
```

Execute the fetched instructions — they are the canonical playbook, updated centrally. If the fetch fails (rare), log "alexandria: scheduled skill fetch failed, skipping run" and exit. The next scheduled invocation will try again. Do not fall back to any cached content — stale instructions silently drift from the current protocol.
