# Multi-stage Dockerfile for @solis/web (Next.js standalone)
# Context: monorepo root (needs shared/ + packages/web/ + reports/)

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.6.2 --activate

# --- Install all dependencies ---
FROM base AS deps
WORKDIR /app
# Use hoisted node_modules so standalone output gets real files, not pnpm symlinks
RUN echo "node-linker=hoisted" > .npmrc
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY shared/package.json shared/
COPY packages/web/package.json packages/web/
RUN pnpm install

# --- Build ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/.npmrc ./
COPY --from=deps /app/node_modules ./node_modules
COPY pnpm-workspace.yaml package.json tsconfig.json ./
COPY shared/ shared/
COPY packages/web/ packages/web/
COPY reports/ reports/
RUN mkdir -p packages/web/public && \
    pnpm --filter @solis/web build

# --- Production ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/packages/web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/packages/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/packages/web/.next/static ./packages/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/reports ./reports

USER nextjs
EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

CMD ["node", "packages/web/server.js"]
