# CTO Self-Check — Coding Quality Dimensions

**Purpose:** Read this on every cold start. Use it as a checklist BEFORE committing any code change. These are the dimensions that matter most. Update this list based on what breaks, what Benjamin flags, and what research reveals.

**Rule:** Every code change gets checked against this list. No exceptions. If Benjamin has to ask "did you check X?" — X should already be on this list and you failed to use it.

---

## The Checklist

Run through these after every code change, before committing:

### 1. Does it actually work? (Correctness)
- Did you trace the full execution path, not just the changed function?
- Did you check all callers of anything you modified?
- Did you verify the change works with real data, not just in theory?
- Did you run the tests? (`npm test` in server/)
- Did you run the build? (`npm run build` in server/)
- Edge cases: nulls, empty strings, missing fields, concurrent access?

### 2. Does it break anything else? (Regression)
- What else depends on the code you changed?
- Did you grep for all usages of modified functions/types/interfaces?
- Did you check imports — is anything else importing what you touched?
- If you changed a type, did all consumers update?
- If you changed an API response shape, did all clients update?

### 3. Is it actually deployed correctly? (Infrastructure)
- Environment variables: are they set in ALL environments (local, Railway, Fly)?
- Does `fly.toml` / `Dockerfile` need updating?
- Will this survive a redeploy? (Fly volumes, stateless assumptions)
- Did you test the health endpoint after changes?

### 4. Is it secure? (Security)
- No secrets in code or logs
- No command injection, XSS, SQL injection
- Auth checks on every endpoint that needs them
- Tokens encrypted, not stored in plaintext
- OWASP top 10 scan of any new endpoint

### 5. Is it simple? (Complexity)
- Could this be done with less code?
- Are you adding abstractions that aren't needed yet?
- Does this follow the bitter lesson (unstructured > structured)?
- Would Benjamin look at this and say "why is this so complicated?"

### 6. Is the data model right? (Architecture)
- Does this respect sovereignty (user owns their data)?
- Does this maintain the bridge principle (server = dumb pipe, intelligence = engine)?
- Are you hardcoding something that should be a soft default?
- Are you adding structured parameters where unstructured text would do?

### 7. Does the error handling make sense? (Resilience)
- What happens when the external service is down?
- What happens when the user's Drive token expires?
- Are errors surfaced to the user or silently swallowed?
- Is there a graceful degradation path?

---

## Research Queue

Top dimensions to research and incorporate (update on cold start):

1. **Observability** — are we logging enough to debug production issues?
2. **Type safety** — are TypeScript types tight or full of `any`?
3. **Test coverage** — what code paths have zero test coverage?
4. **Dependency health** — are dependencies up to date? Known vulns?
5. **Performance** — cold start time, response latency, memory usage?

---

## Update Log

*Add entries here when this checklist is updated, so compounding is visible.*

- **2026-03-17**: Initial creation. Based on patterns from sessions where Benjamin had to flag basic issues that should have been caught autonomously.
