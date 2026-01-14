# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Install build-time deps
COPY package*.json ./
RUN npm ci

# Copy sources and build
COPY . .
RUN npm run build --if-present --quiet

# Production stage
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built artifacts
COPY --from=builder /app/dist/basse-tidsstampling ./dist/basse-tidsstampling

EXPOSE 4000

# Start the SSR server
CMD ["node", "dist/basse-tidsstampling/server/server.mjs"]
