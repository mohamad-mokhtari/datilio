FROM node:18-alpine AS builder

WORKDIR /app

# Build argument for API URL (defaults to production URL)
#production
ARG VITE_API_BASE_URL=https://datilio.com
# #development
# ARG VITE_API_BASE_URL=http://localhost:8000

# Set as environment variable for Vite build
# This will override any .env files
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

# Remove .env files to ensure build args are used instead
RUN rm -f .env .env.production .env.development .env.local 2>/dev/null || true

# Verify the environment variable is set correctly
RUN echo "Building with VITE_API_URL=$VITE_API_URL"

# Build the app for production
# VITE_API_URL is set via ENV above, which takes precedence
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx configuration for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
