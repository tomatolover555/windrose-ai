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
- `/api/frameworks` -> Public list of available frameworks and enabled flags
- `/api/agent` -> Public agent tool index (how to call Windrose frameworks)
- `/api/context?path=...` -> Public route context summaries (agent-facing)
- `/dashboard` -> Framework execution dashboard (protected)

## Agentic Framework Runtime (v0.1)

An **agentic framework** is a small, modular unit of execution with:

- `id`, `name`, `description`
- `enabled` flag
- async `handler(context) => result`

### Placeholder Framework

This repo includes a minimal placeholder framework:

- `ping` (Connectivity Framework)
- `directory.search` (Curated directory search; disabled unless enabled via `ENABLED_FRAMEWORKS`)
- `directory.webmcp` (WebMCP directory agent endpoint; disabled unless enabled via `ENABLED_FRAMEWORKS`)
- `site.audit.agent_ready` (Agent readiness audit for a domain; disabled unless enabled via `ENABLED_FRAMEWORKS`)
- `agent.selection.simulate` (Deterministic decision simulator; disabled unless enabled via `ENABLED_FRAMEWORKS`)

Execute it:

```bash
curl -sS https://windrose-ai.com/api/frameworks/ping
```

Agent readiness audit example:

```bash
curl -sS -X POST https://windrose-ai.com/api/frameworks/site.audit.agent_ready \
  -H "content-type: application/json" \
  -d '{"domain":"example.com"}'
```

Decision simulator example (deterministic, not real-world prediction):

```bash
curl -sS -X POST https://windrose-ai.com/api/frameworks/agent.selection.simulate \
  -H "content-type: application/json" \
  -d '{
    "goal":"pick best option",
    "candidates":[
      {"id":"a","label":"Option A","signals":{"price":20,"trust_score":80,"latency_ms":200,"refund_policy":true,"availability":true}},
      {"id":"b","label":"Option B","signals":{"price":10,"trust_score":60,"latency_ms":350,"refund_policy":false,"availability":true}}
    ],
    "weights":{"price":1,"trust_score":2,"latency_ms":1,"refund_policy":0.5,"availability":0.5},
    "options":{"normalize":true,"explain":true}
  }'
```

### Add A Framework

1. Create a definition that matches `AgenticFrameworkDefinition` in:
   - `lib/agentic/types.ts`
2. Register it in the central registry:
   - `lib/agentic/registry.ts`

### Enable / Disable Frameworks

Frameworks are allowed by environment variable allowlist:

```bash
ENABLED_FRAMEWORKS=ping,directory.search,directory.webmcp,site.audit.agent_ready,agent.selection.simulate
```

Only IDs listed in `ENABLED_FRAMEWORKS` are active (plus the framework's own `enabled: true` flag).

### Logging

All framework executions are logged as JSONL records with:

`timestamp`, `framework_id`, `input`, `output`, `latency_ms`, `user_agent`, `ip`

Log file location:

- Local/dev: `./data/logs/framework-log.jsonl`
- Vercel: `/tmp/data/logs/framework-log.jsonl` (ephemeral; best-effort)

#### Persistent Logs On Vercel (Recommended)

Vercel serverless instances do not share a filesystem, so a file-based log can’t reliably power a cross-instance dashboard.

If you want the `/dashboard` to show executions consistently in production, connect an Upstash Redis integration in Vercel.
When `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are present, the runtime stores the last 1000 executions in Redis
and the dashboard reads the last 100.

### Dashboard

`/dashboard` is protected by `ADMIN_TOKEN` using middleware:

- Provide `?token=...` query param, or
- `Authorization: Bearer ...`, or
- `x-admin-token: ...`

**Important:** Set `ADMIN_TOKEN` in Vercel (Production) to a random value. Do not use `changeme`.

## Agent Readiness Surfaces

Windrose exposes two public, cacheable endpoints for agent discovery:

- `GET /api/agent`:
  Canonical index of Windrose tools (frameworks), their endpoints, and I/O field summaries.
- `GET /api/context?path=<route>`:
  Structured route summaries for agent consumption (e.g. `path=/`, `path=/dashboard`).

## Directory Integrity Model (WebMCP)

The WebMCP directory dataset (`data/webmcp_directory.json`) includes both:

- `confidence` (0-100): evidence-weighted score (heuristics + GitHub hits + well-known endpoint).
- `verification_status`: evidence-based state, independent of sponsorship/payment.
  - `unverified`: default
  - `verified`: strong evidence + high confidence
  - `revoked`: previously verified, but repeated monitoring failures

Monitoring semantics:

- `last_checked` updates on every scan.
- `last_verified_success` updates only when a strong evidence check succeeds.
- `fail_streak` increments on failures; if `fail_streak >= 5` and previously verified, `verification_status` becomes `revoked`.

## Submission (No UI)

Public endpoint (rate limited):

- `POST /api/submit-webmcp-site`

Body:

```json
{ "domain": "example.com", "proof_url": "https://example.com/docs", "notes": "optional" }
```

Submissions are queued for review and are not auto-approved.

## Local Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
