FROM node:22-slim

# Prisma's query engine links against OpenSSL at runtime; node:slim doesn't include it
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

EXPOSE 8080

# Source is bind-mounted at runtime via compose, so we don't COPY it here.
# `prisma migrate dev` runs the migration AND regenerates the client into src/generated/prisma.
CMD ["sh", "-c", "npx prisma migrate dev && npm run dev"]
