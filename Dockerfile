# ---- Multi-Architecture Build ----
# Supported platforms: linux/amd64, linux/arm64, linux/arm/v7
# Build with: docker buildx build --platform linux/amd64,linux/arm64 -t <image> .

ARG TARGETPLATFORM
ARG BUILDPLATFORM

# ---- Build Stage ----
# Run builder on the host platform for speed; dependencies are pure JS so no cross-compile issues
FROM --platform=$BUILDPLATFORM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# ---- Production Stage ----
FROM node:20-alpine
WORKDIR /app

# OCI metadata labels
LABEL org.opencontainers.image.title="Daily Routine Planner"
LABEL org.opencontainers.image.description="A modern daily routine planner web application"
LABEL org.opencontainers.image.source="https://github.com/manukoli1986/daily-routine-page"
LABEL maintainer="manukoli1986"

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy dependencies and app code
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
COPY index.js ./
COPY public/ ./public/

# Set ownership to non-root user
RUN chown -R appuser:appgroup /app
USER appuser

# Bind to all interfaces (required for Docker networking & Azure App Service)
ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000

# Health check for Azure App Service
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:${PORT}/ || exit 1

CMD ["node", "index.js"]
