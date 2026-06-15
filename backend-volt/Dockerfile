# Production image for the Volt backend (Railway), and the sole Docker setup.
# Run it locally via `docker compose --profile parity up backend` to check that
# the app packages and boots the same way it will in prod.
#
# Railway injects env vars at runtime: NODE_ENV=production, DATABASE_URL (Neon),
# CLERK_SECRET_KEY, ALLOWED_ORIGINS, PORT.
FROM node:22-slim

# Prisma's query engine links against OpenSSL at runtime; node:slim omits it.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps in their own layer so it's cached unless package files change.
# Full install (no --omit=dev) is deliberate: we run TypeScript directly with
# `tsx` and migrate with the `prisma` CLI at boot, and both live in
# devDependencies — they are genuine runtime needs in this image.
COPY package*.json ./
RUN npm ci

# .dockerignore keeps out node_modules, .env, dist, and src/generated.
COPY . .

# Regenerate the Prisma client since it isn't in the build context
RUN npx prisma generate

EXPOSE 8080

# Migrate, then start. The `&&` makes a failed migration abort startup so we
# never serve traffic against a stale or half-migrated schema.
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
