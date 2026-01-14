# Dockerfile per Sales Support CRM
# Multi-stage build per ottimizzare dimensioni

# Stage 1: Dependencies
FROM node:20-slim AS deps
WORKDIR /app

# Copia file di lock e package
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Installa dipendenze
RUN npm ci

# Stage 2: Builder
FROM node:20-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Genera Prisma client
RUN npx prisma generate

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Runner
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Crea utente non-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copia files necessari
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

# Set permissions per prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copia build output con permessi corretti
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
