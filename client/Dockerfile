FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

# Start Vite with host exposure
CMD ["npm", "run", "dev", "--", "--host"]
