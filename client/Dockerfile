FROM node:20-alpine AS build

WORKDIR /app

# Vite inlines these at build time, not at container run time
ARG VITE_BACKEND_API_URL
ARG VITE_BACKEND_WS
ENV VITE_BACKEND_API_URL=$VITE_BACKEND_API_URL
ENV VITE_BACKEND_WS=$VITE_BACKEND_WS

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
