FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json tsconfig.json tsconfig.build.json ./
RUN npm ci

COPY app.ts index.ts env.ts ./
COPY config/ ./config/
COPY middleware/ ./middleware/
COPY repositories/ ./repositories/
COPY routes/ ./routes/
COPY schemas/ ./schemas/
COPY services/ ./services/
COPY types/ ./types/
COPY utils/ ./utils/
COPY validators/ ./validators/
COPY ws/ ./ws/

RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

# Never run as root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3001

CMD ["node", "dist/index.js"]
