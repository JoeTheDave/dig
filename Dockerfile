FROM node:18-alpine AS base

# Install dependencies for server (including dev deps for build)
FROM base AS server-deps
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci

# Install production dependencies for server
FROM base AS server-prod-deps
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev

# Install dependencies for client
FROM base AS client-deps
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci

# Build the application
FROM base AS builder
WORKDIR /app

# Copy source code
COPY . .

# Copy server dependencies
COPY --from=server-deps /app/server/node_modules ./server/node_modules

# Copy client dependencies
COPY --from=client-deps /app/client/node_modules ./client/node_modules

# Generate Prisma client for production
RUN cd server && npx prisma generate

# Build client
RUN cd client && npm run build

# Build server
RUN cd server && npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Copy built application  
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/node_modules ./server/node_modules
COPY --from=builder /app/server/package.json ./server/
COPY --from=builder /app/server/prisma ./server/prisma
COPY --from=builder /app/client/dist ./client/dist

# Set working directory to server for Prisma commands
WORKDIR /app/server

# Fix permissions for node_modules
RUN chmod -R 755 /app/server/node_modules

EXPOSE 8080

CMD ["node", "dist/index.js"]