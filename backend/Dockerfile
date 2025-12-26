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

# Устанавливаем все зависимости (включая dev)
RUN npm ci

# Копируем исходный код
COPY . .

# Собираем TypeScript
RUN npm run build

# Продакшн стадия
FROM node:20-alpine AS runner

# Создаем пользователя без прав root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

WORKDIR /app

# Копируем собранные файлы из стадии сборки
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=nodejs:nodejs /app/package.json ./package.json

# Создаем директорию для логов
RUN mkdir -p /app/logs && chown nodejs:nodejs /app/logs

# Переключаемся на пользователя nodejs
USER nodejs

# Открываем порт
EXPOSE 3001

# Переменные окружения
ENV NODE_ENV=production
ENV PORT=3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); http.get('http://localhost:3001/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

# Запуск приложения
CMD ["npm", "start"]