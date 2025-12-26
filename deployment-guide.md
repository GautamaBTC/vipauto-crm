# 🚀 План развертывания CRM VIPauto

## 📋 Обзор инфраструктуры

### Бесплатный стек хостинга:
- **Frontend**: Vercel (бесконечные деплои, CDN, SSL)
- **Backend**: Render (750 часов/месяц = 1 сервис всегда онлайн)
- **База данных**: Supabase (500MB + 10k строк бесплатно)
- **Домен**: Бесплатный subdomain (.vercel.app, .onrender.com)
- **CI/CD**: GitHub Actions (бесплатно для public repos)

## 🐳 Docker конфигурация

### docker-compose.yml (для разработки)
```yaml
version: '3.8'

services:
  # Frontend (React + Vite)
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://localhost:3001
      - VITE_SUPABASE_URL=${SUPABASE_URL}
      - VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
    volumes:
      - ./frontend:/app
      - /app/node_modules
    depends_on:
      - backend

  # Backend (Node.js + Express)
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - PORT=3001
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
      - JWT_SECRET=${JWT_SECRET}
      - TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID}
      - TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN}
    volumes:
      - ./backend:/app
      - /app/node_modules
    command: npm run dev

  # PostgreSQL (только для локальной разработки)
  postgres:
    image: postgres:15-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=vipauto_crm
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql

volumes:
  postgres_data:
```

### frontend/Dockerfile
```dockerfile
# Multi-stage build для оптимизации
FROM node:20-alpine AS base

# Устанавливаем зависимости
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Стадия сборки
FROM base AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Продакшн стадия
FROM nginx:alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
```

### backend/Dockerfile
```dockerfile
FROM node:20-alpine AS base

WORKDIR /app

# Копируем package файлы
COPY package.json package-lock.json ./

# Устанавливаем зависимости
RUN npm ci --only=production

# Копируем исходный код
COPY . .

# Собираем TypeScript
RUN npm run build

# Создаем пользователя без прав root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3001

CMD ["npm", "start"]
```

### frontend/nginx.conf
```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    server {
        listen 3000;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        # Gzip сжатие
        gzip on;
        gzip_vary on;
        gzip_min_length 1024;
        gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

        # PWA поддержка
        location / {
            try_files $uri $uri/ /index.html;
            add_header Cache-Control "no-cache";
        }

        # Статические файлы с кешированием
        location /assets/ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # Service Worker
        location /sw.js {
            expires 0;
            add_header Cache-Control "no-cache";
        }
    }
}
```

## 🌐 Vercel конфигурация (Frontend)

### vercel.json
```json
{
  "version": 2,
  "name": "vipauto-crm",
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/sw.js",
      "headers": {
        "Cache-Control": "no-cache"
      }
    },
    {
      "src": "/assets/(.*)",
      "headers": {
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "env": {
    "VITE_API_URL": "@api_url",
    "VITE_SUPABASE_URL": "@supabase_url",
    "VITE_SUPABASE_ANON_KEY": "@supabase_anon_key"
  },
  "functions": {
    "app/api/*.ts": {
      "runtime": "nodejs20.x"
    }
  }
}
```

### .vercelignore
```
node_modules
.git
.env
.env.local
.DS_Store
```

## 🎯 Render конфигурация (Backend)

### render.yaml
```yaml
services:
  - type: web
    name: vipauto-crm-api
    env: node
    plan: free
    buildCommand: "npm install && npm run build"
    startCommand: "npm start"
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_SERVICE_KEY
        sync: false
      - key: JWT_SECRET
        generateValue: true
      - key: TWILIO_ACCOUNT_SID
        sync: false
      - key: TWILIO_AUTH_TOKEN
        sync: false

  - type: worker
    name: vipauto-crm-cron
    env: node
    plan: free
    buildCommand: "npm install && npm run build"
    startCommand: "npm run cron"
    envVars:
      - key: NODE_ENV
        value: production
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_SERVICE_KEY
        sync: false

databases:
  - name: vipauto-crm-db
    plan: free
    databaseName: vipauto_crm
    user: vipauto_user
```

## 🗄️ Supabase настройка

### Создание проекта
```bash
# Установка Supabase CLI
npm install -g supabase

# Инициализация проекта
supabase init

# Создание нового проекта
supabase projects create vipauto-crm

# Применение миграций
supabase db push

# Генерация TypeScript типов
supabase gen types typescript --local > src/types/supabase.ts
```

### Переменные окружения Supabase
```bash
# .env.local
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
SUPABASE_DB_URL=postgresql://postgres:[password]@db.your-project.supabase.co:5432/postgres
```

## 🔧 GitHub Actions CI/CD

### .github/workflows/deploy.yml
```yaml
name: Deploy VIPauto CRM

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: |
          cd frontend && npm ci
          cd ../backend && npm ci
      
      - name: Run tests
        run: |
          cd frontend && npm test
          cd ../backend && npm test
      
      - name: Run linting
        run: |
          cd frontend && npm run lint
          cd ../backend && npm run lint

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          working-directory: ./frontend

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Render
        uses: johnbeynon/render-deploy-action@v0.0.8
        with:
          service-id: ${{ secrets.RENDER_SERVICE_ID }}
          api-key: ${{ secrets.RENDER_API_KEY }}
          working-directory: ./backend

  deploy-database:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        with:
          version: latest
          
      - name: Push database changes
        run: |
          supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}
```

## 📱 PWA настройка

### public/manifest.json
```json
{
  "name": "VIPauto CRM",
  "short_name": "VIPauto",
  "description": "CRM система для автосервиса",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "orientation": "portrait-primary",
  "scope": "/",
  "lang": "ru",
  "categories": ["business", "productivity"],
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable any"
    }
  ],
  "shortcuts": [
    {
      "name": "Новый заказ",
      "short_name": "Заказ",
      "description": "Создать новый заказ",
      "url": "/orders/new",
      "icons": [{ "src": "/icons/icon-96x96.png", "sizes": "96x96" }]
    },
    {
      "name": "Продажа запчастей",
      "short_name": "Запчасти",
      "description": "Продать запчасти",
      "url": "/parts-sales/new",
      "icons": [{ "src": "/icons/icon-96x96.png", "sizes": "96x96" }]
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/desktop.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide"
    },
    {
      "src": "/screenshots/mobile.png",
      "sizes": "375x667",
      "type": "image/png",
      "form_factor": "narrow"
    }
  ]
}
```

## 🔐 Безопасность

### Environment Variables
```bash
# .env.example
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# Backend
JWT_SECRET=your_jwt_secret_here
NODE_ENV=production
PORT=3001

# Twilio (для SMS)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Push уведомления
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_EMAIL=your_email@example.com
```

### CORS настройка (backend)
```typescript
// backend/src/middleware/cors.ts
import cors from 'cors';

const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://vipauto-crm.vercel.app', 'https://www.vipauto-crm.vercel.app']
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  optionsSuccessStatus: 200
};

export default cors(corsOptions);
```

## 📊 Мониторинг и логирование

### Vercel Analytics
```typescript
// frontend/src/lib/analytics.ts
import { Analytics } from '@vercel/analytics/react';

export const AnalyticsProvider = () => {
  return <Analytics />;
};
```

### Backend логирование
```typescript
// backend/src/utils/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    }),
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
});

export default logger;
```

## 🚀 Скрипты развертывания

### deploy.sh
```bash
#!/bin/bash

# Скрипт развертывания VIPauto CRM

set -e

echo "🚀 Начинаем развертывание VIPauto CRM..."

# Проверяем переменные окружения
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    echo "❌ Отсутствуют переменные окружения Supabase"
    exit 1
fi

# Устанавливаем зависимости
echo "📦 Установка зависимостей..."
cd frontend && npm ci && cd ..
cd backend && npm ci && cd ..

# Запускаем тесты
echo "🧪 Запуск тестов..."
cd frontend && npm test && cd ..
cd backend && npm test && cd ..

# Собираем проекты
echo "🔨 Сборка проектов..."
cd frontend && npm run build && cd ..
cd backend && npm run build && cd ..

# Применяем миграции базы данных
echo "🗄️ Применение миграций базы данных..."
supabase db push

# Деплоим frontend на Vercel
echo "🌐 Деплой frontend на Vercel..."
cd frontend
vercel --prod --confirm
cd ..

# Деплоим backend на Render
echo "⚙️ Деплой backend на Render..."
cd backend
curl -X POST \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"serviceId": "'$RENDER_SERVICE_ID'"}' \
  https://api.render.com/v1/services/$RENDER_SERVICE_ID/deploys
cd ..

echo "✅ Развертывание завершено успешно!"
echo "🌐 Frontend: https://vipauto-crm.vercel.app"
echo "⚙️ Backend: https://vipauto-crm-api.onrender.com"
```

## 🔄 Обновление и поддержка

### Автоматические обновления
```yaml
# .github/workflows/update.yml
name: Update Dependencies

on:
  schedule:
    - cron: '0 2 * * 1'  # Каждый понедельник в 2:00
  workflow_dispatch:

jobs:
  update:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          
      - name: Update frontend dependencies
        run: |
          cd frontend
          npm update
          npm audit fix
          
      - name: Update backend dependencies
        run: |
          cd backend
          npm update
          npm audit fix
          
      - name: Create Pull Request
        uses: peter-evans/create-pull-request@v5
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          commit-message: '🔧 Автоматическое обновление зависимостей'
          title: '🔧 Автоматическое обновление зависимостей'
          body: |
            Автоматическое обновление зависимостей:
            - Frontend: обновлены пакеты
            - Backend: обновлены пакеты
            
            Пожалуйста, проверьте и протестируйте перед слиянием.
          branch: auto-update-dependencies
```

Этот план развертывания обеспечивает полностью бесплатную инфраструктуру для CRM системы с автоматическим CI/CD, мониторингом и поддержкой.