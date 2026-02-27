# SYSTEM Default Blueprint (v1)

This document is the human-readable default Blueprint aligned with `system-config.default.json`.

## Axioms

- Two phases: Input and Output.
- Three input nodes: Author, LLM, API.
- Three output channels: Author, LLM, API.
- Two continuous agents: Editor and Orchestrator.
- Three persistent components: Constitution, PLM, Vault.
- Hidden inputs, exposed outputs.

## Editor Defaults

- Questioning style: Socratic.
- Proactive cadence: daily baseline.
- RLAIF strictness: moderate.
- Goal: maximize extraction fidelity while preserving engagement.

## Orchestrator Defaults

- Weighting strategy: query-adaptive.
- Favor Constitution on values questions.
- Favor Vault retrieval on factual recall.
- Favor PLM on mature reasoning domains.

## PLM Training Defaults

- Provider: Fireworks AI.
- Base model: Kimi K2.5 (accounts/fireworks/models/kimi-k2p5).
- Retrain cadence: on-demand (batch threshold based).
- Maturity is disaggregated by Constitution section.

## Vault Defaults

- Primary store: Supabase (bridge mode).
- Long-term target: local folder-based Vault protocol.
- Raw data retention is append-only.

## Infrastructure Defaults

- Deployment: cloud.
- Editor mode: always-on.
- Orchestrator mode: serverless.
- Background worker: Vercel Cron.

## Privacy Defaults

- External API disabled by default.
- Default privacy level: personal.
- External queries enabled only with explicit policy.
