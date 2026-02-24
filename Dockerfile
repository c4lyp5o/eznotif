# Stage 1: Build Stage (client build)
FROM oven/bun:1.3.8-alpine AS builder

# Accept NODE_ENV as a build argument, defaulting to "production"
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /app

# Install root dependencies (Express etc.)
COPY package*.json ./
RUN bun install

# Copy client separately and install client dependencies + build
COPY client ./client
WORKDIR /app/client
RUN bun install && bun run build

# Move built files to /app/public in the builder stage
RUN mkdir -p /app/public && mv ../public/* /app/public/

# Return to root app dir
WORKDIR /app

# Stage 2: Production Stage
FROM oven/bun:1.3.8-alpine

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# Install for alpine
RUN apk update --no-cache && \
    apk add --no-cache curl

# Set timezone data
ENV TZ=Asia/Kuala_Lumpur

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN bun install --production

# Copy backend source code (everything except what's ignored)
COPY . .

# Copy built public files from builder
COPY --from=builder /app/public /app/public

# Expose your server port
EXPOSE 5000

# Start your app
CMD ["bun", "start"]