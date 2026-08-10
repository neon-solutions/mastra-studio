# Mastra Studio on Neon

Self-host [Mastra Studio](https://mastra.ai/docs/getting-started/studio) with Neon.

- Neon Functions serves the Mastra API and proxies the Studio SPA.
- Neon Object Storage holds the static Studio assets.
- Neon AI Gateway runs the example assistant.
- Neon Postgres stores memory, logs, traces, and metrics.
- Mastra SimpleAuth protects Studio and every Mastra API route.

![Mastra Studio trace view](docs/mastra-studio.png)

## Architecture

```text
Browser ──▶ Neon Function ──▶ Object Storage (Studio assets)
                       ├────▶ AI Gateway (model calls)
                       └────▶ Postgres
                              ├─ public schema (memory)
                              └─ mastra_observability schema (logs, traces, metrics)
```

The Studio bucket is public-read because it contains only versioned static assets. The Function keeps the API behind authentication.

## Deploy

Prerequisites:

- [Bun](https://bun.sh/)
- [Neon CLI](https://neon.com/docs/reference/cli-reference)
- A Neon project on a plan that includes AI Gateway

Install dependencies and create the two deployment settings:

```bash
bun install
cp .env.example .env.deploy
```

Set `MASTRA_STUDIO_TOKEN` in `.env.deploy` to a random value, for example from `openssl rand -hex 32`.

Link the checkout to the target Neon project and branch:

```bash
neon link
neon checkout main
```

Provision Postgres, Object Storage, Functions, and AI Gateway:

```bash
env -u MASTRA_MODEL -u MASTRA_STUDIO_TOKEN neon deploy --env .env.deploy
neon env pull
```

Upload the installed Mastra Studio build:

```bash
bun run studio:upload
```

Open the Function URL printed by `neon deploy`, then sign in with:

```text
Email:    admin@example.com
Password: the MASTRA_STUDIO_TOKEN value
```

## Local development

```bash
set -a
source .env.deploy
set +a
neon dev
```

Studio runs at `http://localhost:8787`.

## Included example

The Studio exposes:

- one memory-enabled assistant
- `calculate`, `get-current-time`, and `get-database-time` tools
- persisted logs, full trace trees, and automatic model/agent metrics

## Verify

```bash
bun run typecheck
bun test
curl http://localhost:8787/health
```

Unauthenticated requests to `/api/*` return `401`.

## Production boundaries

- SimpleAuth is a shared-token example, not multi-user authentication.
- Observability uses a separate schema in the application database, not a separate database. Each live Function isolate can open up to five Postgres connections.
- Traces can include prompts and model output. Configure redaction and retention for your data policy; this example does not add a retention job.
- The Mastra packages are pinned alpha releases because the observability APIs used here are not yet stable.
