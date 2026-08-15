# apps/storefront/Dockerfile — multi-stage build producing the Next.js
# `output: "standalone"` server, built inside the pnpm workspace so the
# @flexova/shared workspace dependency resolves correctly.
#
# Build from the repo root:
#   docker build -f apps/storefront/Dockerfile -t flexova-storefront .

FROM node:20-alpine AS base
RUN corepack enable

# ---- deps: install only what apps/storefront needs, with its workspace deps
FROM base AS deps
WORKDIR /repo
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/storefront/package.json apps/storefront/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile --filter @flexova/storefront...

# ---- builder: bring in full source, build the standalone output
FROM base AS builder
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/storefront/node_modules ./apps/storefront/node_modules
COPY --from=deps /repo/packages/shared/node_modules ./packages/shared/node_modules
COPY turbo.json ./
COPY apps/storefront ./apps/storefront
COPY packages/shared ./packages/shared
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @flexova/storefront build

# ---- runner: minimal production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /repo/apps/storefront/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/storefront/.next/static ./apps/storefront/.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/apps/storefront/public ./apps/storefront/public

USER nextjs
EXPOSE 3000
CMD ["node", "apps/storefront/server.js"]
