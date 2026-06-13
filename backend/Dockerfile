# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# pnpm v10: compatible with Node 20, reads package.json#pnpm settings
RUN npm install -g pnpm@10

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY prisma ./prisma/

# shamefully-hoist=true (in .npmrc) flattens node_modules like npm
RUN pnpm install --frozen-lockfile

COPY . .

# Dummy DATABASE_URL satisfies prisma.config.ts during generate (no real DB needed)
RUN DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy pnpm prisma generate

RUN pnpm build

# Stage 2: Production
FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
# prisma.config.ts WAJIB ada di runner: Prisma 7 membaca datasource.url dari sini
# saat 'prisma migrate deploy'. Tanpa file ini migrate gagal & DB tidak ter-migrate.
COPY --from=builder /app/prisma.config.ts ./
COPY docker-entrypoint.sh ./

RUN chmod +x docker-entrypoint.sh

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/main"]
