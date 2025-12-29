FROM node:18-alpine AS builder

WORKDIR /app

# Build argument for API URL (defaults to production URL)
ARG VITE_API_URL=https://datilio.com

# Set as environment variable for Vite build
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./

RUN npm install

COPY . .

# Build the app for production
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx configuration (optional - you may want to create a custom nginx.conf)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
