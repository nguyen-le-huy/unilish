FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5174

# Start Vite on port 5174 with host exposure
CMD ["npm", "run", "dev", "--", "--port", "5174", "--host"]
