# Use Node.js LTS as base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files (we'll create package.json)
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application files
COPY . .

# Expose ports
# 3000 for static web server
# 8080 for CORS proxy
EXPOSE 3000 8080

# Start both servers
CMD ["npm", "start"]
