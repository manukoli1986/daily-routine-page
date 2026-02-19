# ---- Build Stage ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# ---- Production Stage ----
FROM node:20-alpine
WORKDIR /app

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
