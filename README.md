# Flexova — monorepo

pnpm + Turborepo workspace for Flexova. Frontend-only: the ERP backend API is
a separate repo/service (see `erp-api` placeholder in `docker-compose.yml`).

```
.
├── apps/
│   ├── erp/                 ← the ERP admin app (formerly the repo root) — unchanged source
│   └── storefront/          ← Next.js App Router public store (FE_21)
├── packages/
│   └── shared/               ← FE_00 design-token CSS contract + shared types, consumed by both apps
├── docker-compose.yml        ← reverse proxy + storefront (scalable) + Redis + erp-api placeholder
├── turbo.json                ← build/dev/lint/test pipeline
└── pnpm-workspace.yaml
```

## Requirements
- Node ≥ 18
- pnpm, via Corepack: `corepack enable` (or prefix commands with `corepack pnpm` if you can't write shims into your Node install)

## Commands (from repo root)
```
pnpm install         # installs all workspaces
pnpm dev              # turbo run dev — both apps in parallel
pnpm build            # turbo run build
pnpm --filter @flexova/erp dev
pnpm --filter @flexova/storefront dev
```

Per-app docs:
- `apps/erp/README.md` — the ERP app (build order, stack, commands)
- `apps/storefront/docs/` — storefront build docs (added when FE_21 storefront work starts)

## Docker
```
docker compose up --build
docker compose up --scale storefront=3   # horizontal scale behind Traefik
```
Redis backs the storefront's Next.js cache handler (`apps/storefront/lib/cache/redis-handler.mjs`)
so ISR/data-cache and tag invalidation are shared across every storefront instance.
