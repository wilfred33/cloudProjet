FROM node:20-alpine

WORKDIR /usr/src/recommendations-service

# Install system dependencies
RUN apk update && apk add curl

# Copy package files
ADD package.json .
RUN npm install

# Copy source code
ADD src src

# Expose port
EXPOSE 80

# Start service
CMD ["node", "src/app.js"]
