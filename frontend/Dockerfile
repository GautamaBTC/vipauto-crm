# Multi-stage build для оптимизации
FROM node:20-alpine AS base

# Устанавливаем зависимости
FROM base AS deps
WORKDIR /app

# Копируем package файлы
COPY package.json package-lock.json ./

# Устанавливаем зависимости
RUN npm ci --only=production && npm cache clean --force

# Стадия сборки
FROM base AS builder
WORKDIR /app

# Копируем package файлы
COPY package.json package-lock.json ./

# Устанавливаем все зависимости
RUN npm ci

# Копируем исходный код
COPY . .

# Собираем проект
RUN npm run build

# Стадия оптимизации
FROM base AS optimizer
WORKDIR /app

# Устанавливаем инструменты для оптимизации
RUN npm install -g sharp

# Копируем собранные файлы
COPY --from=builder /app/dist ./dist

# Оптимизируем изображения
RUN npx sharp-optimize-cli --input=dist/assets/**/*.{jpg,jpeg,png,webp,svg} --output=dist/assets/

# Продакшн стадия
FROM nginx:alpine AS runner

# Устанавливаем инструменты для сжатия
RUN apk add --no-cache brotli

# Копируем оптимизированные файлы
COPY --from=optimizer /app/dist /usr/share/nginx/html

# Копируем конфигурацию nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Создаем директорию для brotli сжатия
RUN mkdir -p /var/cache/nginx/brotli

# Открываем порт
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ --output-document=- || exit 1

# Запуск nginx
CMD ["nginx", "-g", "daemon off;", "-c", "/etc/nginx/nginx.conf"]