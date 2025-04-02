FROM node:16-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .

EXPOSE 1883
EXPOSE 3000

CMD ["node", "mqtt-client.js"]