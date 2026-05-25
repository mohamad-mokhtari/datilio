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

# Build the app for production
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx configuration for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
