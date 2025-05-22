# frontend/Dockerfile
FROM node:18-alpine as build

WORKDIR /app
COPY frontend/package*.json ./
RUN npm install --include=dev
COPY frontend/ ./
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
