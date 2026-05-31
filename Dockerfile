# Use lightweight Node LTS image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy codebase
COPY . .

# Expose HTTP port
EXPOSE 3000

# Default command starts the API server
CMD ["npm", "start"]
