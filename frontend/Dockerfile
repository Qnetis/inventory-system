# Этап сборки
FROM node:18-alpine as build

WORKDIR /app
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
# Установка зависимостей
COPY package*.json ./
RUN npm ci

# Копирование исходного кода и сборка
COPY . .
RUN npm run build

# Продакшн этап
FROM nginx:alpine

# Копирование собранного приложения
COPY --from=build /app/dist /usr/share/nginx/html

# Копирование конфигурации nginx
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]