# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

ARG NEXT_PUBLIC_ENABLE_WEBSOCKET
ENV NEXT_PUBLIC_ENABLE_WEBSOCKET=$NEXT_PUBLIC_ENABLE_WEBSOCKET

RUN pnpm build

# Stage 2: Serve static export via 'serve'
# NOTE: jangan pakai flag -s/--single. Next 'output: export' + trailingSlash
# menghasilkan index.html per-route (out/dashboard/index.html dst). Flag -s
# (SPA mode) memaksa SEMUA route ke index.html root, sehingga reload /dashboard/
# menyajikan halaman home -> hydration mismatch -> halaman blank.
FROM node:20-alpine AS runner

WORKDIR /app

RUN npm install -g serve

COPY --from=builder /app/out ./out

ENV PORT=3000

EXPOSE 3000

CMD ["serve", "out", "-p", "3000"]
