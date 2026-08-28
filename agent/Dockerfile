FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src/ ./src/

# Run as non-root user
# Note: agent needs access to docker.sock — the socket gid on the host
# is usually 999 (docker group). We add that group here.
RUN addgroup -g 999 docker && \
    adduser -S appuser -G docker

USER appuser

CMD ["node", "src/index.js"]