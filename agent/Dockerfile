FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache su-exec

COPY package*.json ./
RUN npm ci --omit=dev

COPY src/ ./src/
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Non-root runtime user. Socket group membership is applied at start
# by docker-entrypoint.sh (GID differs on Linux vs Docker Desktop).
RUN adduser -S appuser

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "src/index.js"]
