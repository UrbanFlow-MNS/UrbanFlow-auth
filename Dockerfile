FROM node:20-alpine AS builder
WORKDIR /build

COPY modules/proto/ ./proto/
COPY modules/shared/ ./shared/

COPY modules/auth/package*.json ./auth/
RUN cd auth && npm ci --no-audit --no-fund

COPY modules/auth/ ./auth/
RUN cd auth && npm run build

FROM node:20-alpine
WORKDIR /app

COPY modules/auth/package*.json ./auth/
RUN cd auth && npm ci --omit=dev --no-audit --no-fund

COPY --from=builder /build/auth/dist ./auth/dist
COPY --from=builder /build/proto ./auth/dist/proto

WORKDIR /app/auth
EXPOSE 4001
CMD ["node", "dist/auth/src/main.js"]
