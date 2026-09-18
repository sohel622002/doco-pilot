FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev \
  && npm cache clean --force \
  && find node_modules -type f \( -name '*.md' -o -name '*.markdown' -o -name '*.map' \) -delete

FROM node:20-alpine AS nodebin

FROM alpine:3.21 AS runtime

WORKDIR /app

# Node binary from the official image needs the C++ runtime on plain Alpine.
RUN apk add --no-cache su-exec ca-certificates libstdc++ libgcc \
  && adduser -S appuser

COPY --from=nodebin /usr/local/bin/node /usr/local/bin/node
COPY --from=deps /app/node_modules ./node_modules
COPY src/ ./src/
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENV NODE_ENV=production

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "src/index.js"]
