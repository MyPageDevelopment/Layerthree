# ====================================
# STAGE 1: Dependencies
# ====================================
FROM node:20-alpine AS deps

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Generate Prisma Client
RUN npx prisma generate

# ====================================
# STAGE 2: Builder
# ====================================
FROM node:20-alpine AS builder

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copy package files and install ALL dependencies (including devDependencies)
COPY package*.json ./
RUN npm ci

# Copy source code and prisma
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build application
RUN npm run build

# ====================================
# STAGE 3: Runner
# ====================================
FROM node:20-alpine AS runner

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy production dependencies from deps stage
COPY --from=deps --chown=nestjs:nodejs /app/node_modules ./node_modules

# Copy prisma files
COPY --from=deps --chown=nestjs:nodejs /app/prisma ./prisma

# Copy built application from builder stage
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Copy package.json for scripts
COPY --chown=nestjs:nodejs package*.json ./

# Set user
USER nestjs

# Expose port
EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3003/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/main.js"]
