# Stage 1: Base
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install

# Stage 2: Development
FROM base AS development
COPY . .
EXPOSE 5174
CMD ["npm", "run", "dev", "--", "--port", "5174", "--host"]

# Stage 3: Builder
FROM base AS builder
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# Stage 4: Production
FROM nginx:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
# Add SPA config
RUN echo 'server { listen 80; location / { root /usr/share/nginx/html; index index.html index.htm; try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
