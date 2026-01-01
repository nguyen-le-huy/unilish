FROM node:20-alpine

WORKDIR /app

# Install dependencies first for caching
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Default Express Port
EXPOSE 5000

# Start command (Ensure package.json has "dev": "nodemon ...")
CMD ["npm", "run", "dev"]
