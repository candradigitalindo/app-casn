#!/bin/sh
set -e

# Tulis DATABASE_URL ke .env agar prisma.config.ts (dotenv) bisa membacanya saat migrate.
printf "DATABASE_URL=%s\n" "$DATABASE_URL" > /app/.env

echo "Running database migrations..."
# 'set -e' membuat container GAGAL bila migrate error — supaya tidak diam-diam
# start dengan DB kosong/tidak sinkron. Dengan restart policy ia akan retry.
node_modules/.bin/prisma migrate deploy

echo "Starting application..."
exec "$@"
