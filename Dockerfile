FROM node:20-slim

WORKDIR /app

# Copy package files for both workspaces
COPY backend/package*.json backend/
COPY frontend/package*.json frontend/

# Install dependencies
RUN cd backend && npm install && cd ../frontend && npm install

# Copy source code
COPY backend/ backend/
COPY frontend/ frontend/

# Build frontend (produces frontend/dist)
RUN cd frontend && npm run build

# Build backend (compiles TypeScript)
RUN cd backend && npm run build

# Remove frontend node_modules + src (only dist is needed at runtime)
RUN rm -rf frontend/node_modules frontend/src

EXPOSE 3001

CMD ["node", "backend/dist/server.js"]
