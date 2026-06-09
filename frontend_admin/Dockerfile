FROM node:18-alpine AS builder

WORKDIR /app

# Same as main frontend: server origin only (code appends /api/v1)
ARG VITE_API_URL=https://datilio.com
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./

# Configure npm for better network reliability
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set registry https://registry.npmjs.org/

# Install dependencies with retry logic
RUN npm install --legacy-peer-deps || npm install --legacy-peer-deps || npm install --legacy-peer-deps

COPY . .

# Remove .env files so Docker build args win (same as main frontend)
RUN rm -f .env .env.production .env.development .env.local 2>/dev/null || true

RUN echo "Building with VITE_API_URL=$VITE_API_URL"
RUN case "$VITE_API_URL" in http://datilio.com*) echo "ERROR: VITE_API_URL must be https://datilio.com for production" && exit 1 ;; esac

RUN npm run build && ! grep -rq "http://datilio.com" build/ || (echo "ERROR: build contains http://datilio.com" && exit 1)

# Production stage
FROM nginx:alpine

# Copy built files from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx configuration for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
