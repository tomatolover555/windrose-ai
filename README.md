# Windrose AI

Production-ready infrastructure baseline for Windrose AI.

## Stack

- Next.js (App Router)
- TypeScript
- ESLint

## Routes

- `/` -> Windrose AI — Agent-Native Decision Platform
- `/docs` -> Documentation coming soon.
- `/status` -> Environment, build timestamp, version
- `/api/tools/v1/health` -> Health JSON endpoint
- `/api/frameworks/[id]` -> Execute an agentic framework (runtime v0.1)
- `/dashboard` -> Framework execution dashboard (protected)

## Agentic Framework Runtime (v0.1)

An **agentic framework** is a small, modular unit of execution with:

- `id`, `name`, `description`
- `enabled` flag
- async `handler(context) => result`

### Placeholder Framework

This repo includes a minimal placeholder framework:

- `ping` (Connectivity Framework)

Execute it:

```bash
curl -sS https://windrose-ai.com/api/frameworks/ping
```

### Add A Framework

1. Create a definition that matches `AgenticFrameworkDefinition` in:
   - `/Users/ziv.koren/Documents/windrose-ai/lib/agentic/types.ts`
2. Register it in the central registry:
   - `/Users/ziv.koren/Documents/windrose-ai/lib/agentic/registry.ts`

### Enable / Disable Frameworks

Frameworks are allowed by environment variable allowlist:

```bash
ENABLED_FRAMEWORKS=ping
```

Only IDs listed in `ENABLED_FRAMEWORKS` are active (plus the framework's own `enabled: true` flag).

### Logging

All framework executions are logged as JSONL records with:

`timestamp`, `framework_id`, `input`, `output`, `latency_ms`, `user_agent`, `ip`

Log file location:

- Local/dev: `./data/logs/framework-log.jsonl`
- Vercel: `/tmp/data/logs/framework-log.jsonl` (ephemeral; best-effort)

### Dashboard

`/dashboard` is protected by `ADMIN_TOKEN` using middleware:

- Provide `?token=...` query param, or
- `Authorization: Bearer ...`, or
- `x-admin-token: ...`

## Local Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
