FROM node:18-alpine

WORKDIR /app

# Install system dependencies needed for node-gyp or other build tasks
RUN apk add --no-cache openssl build-base g++ cairo-dev jpeg-dev pango-dev giflib-dev python3

# Copy package configurations
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy Prisma schema
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build TypeScript code
RUN npm run build

# Expose port
EXPOSE 5000

# Set environment variables defaults
ENV PORT=5000
ENV NODE_ENV=production

# Start script running migrations, seeding and starting the server
CMD ["sh", "-c", "npx prisma migrate deploy && npm run db:seed && npm run start"]
