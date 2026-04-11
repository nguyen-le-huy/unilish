# Stage 1: Base
FROM node:20-alpine AS base
WORKDIR /app
# ffmpeg is required by fluent-ffmpeg for audio processing (TTS mix pipeline)
RUN apk add --no-cache ffmpeg
COPY package*.json ./
RUN npm install

# Stage 2: Development
FROM base AS development
COPY . .
EXPOSE 5432
CMD ["npm", "run", "dev"]

# Stage 3: Builder
FROM base AS builder
COPY . .
RUN npm run build

# Stage 4: Production
FROM node:20-alpine AS production
WORKDIR /app
RUN apk add --no-cache ffmpeg
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
# Copy .env so dotenv can load secrets at runtime (env_file via Docker Compose is the primary source,
# but this acts as a reliable fallback when compose env_file fails to inject vars)
COPY --from=builder /app/.env .env
EXPOSE 5432
CMD ["npm", "run", "start"]
