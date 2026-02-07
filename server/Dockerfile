# Stage 1: Base
FROM node:20-alpine AS base
WORKDIR /app
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
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 5432
CMD ["npm", "run", "start"]
