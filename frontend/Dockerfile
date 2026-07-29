# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig*.json next.config.js tailwind.config.ts postcss.config.js ./
RUN npm install

COPY src ./src
COPY public ./public

ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production runner stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
