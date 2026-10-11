# Stage 1: Build React/Vite production distribution
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . ./
RUN npm run build

# Stage 2: Production Nginx web server
FROM nginx:alpine

# Copy compiled static assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy reverse proxy and SPA configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 5173

HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:5173/ > /dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
