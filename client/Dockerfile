# Stage 1: Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Set build arguments for Vite environment variables
ARG VITE_API_URL
ARG VITE_SOCKET_URL

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

# Build the production bundle
RUN npm run build

# Stage 2: Serve stage
FROM nginx:alpine

# Copy Nginx custom configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build output to Nginx directory
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
