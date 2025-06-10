FROM node:18-alpine

WORKDIR /app

# Установка системных зависимостей для canvas (если нужен для штрихкодов)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

# Установка зависимостей
COPY package*.json ./
RUN npm ci --only=production

# Копирование исходного кода
COPY . .

# Сборка Strapi
ENV NODE_ENV=production
RUN npm run build

EXPOSE 1337

# Команда по умолчанию
CMD ["npm", "start"]