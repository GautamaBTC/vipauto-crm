import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { errorHandler } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import { connectDB } from '@/config/database';
import { setupCronJobs } from '@/utils/cron';

// Импорт роутов
import authRoutes from '@/routes/auth';
import orderRoutes from '@/routes/orders';
import clientRoutes from '@/routes/clients';
import partsRoutes from '@/routes/parts';
import financeRoutes from '@/routes/finance';
import salaryRoutes from '@/routes/salaries';
import statsRoutes from '@/routes/stats';
import serviceRoutes from '@/routes/services';
import notificationRoutes from '@/routes/notifications';

// Загрузка переменных окружения
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(compression());

// CORS конфигурация
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? [
        process.env.FRONTEND_URL,
        'https://vipauto-crm.vercel.app',
        'https://www.vipauto-crm.vercel.app'
      ]
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 минут
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // лимит запросов
  message: {
    error: 'Слишком много запросов, попробуйте позже.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);

// Парсинг тела запроса
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Логирование запросов
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime()
    }
  });
});

// API роуты
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/parts', partsRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/salaries', salaryRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/notifications', notificationRoutes);

// Обработка 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Эндпоинт не найден'
    }
  });
});

// Обработка ошибок
app.use(errorHandler);

// Запуск сервера
async function startServer() {
  try {
    // Подключение к базе данных
    await connectDB();
    
    // Запуск cron задач
    setupCronJobs();
    
    // Запуск сервера
    app.listen(PORT, () => {
      logger.info(`🚀 Сервер запущен на порту ${PORT}`, {
        environment: process.env.NODE_ENV,
        port: PORT,
        timestamp: new Date().toISOString()
      });
    });
  } catch (error) {
    logger.error('❌ Ошибка запуска сервера:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM получен, завершение работы...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT получен, завершение работы...');
  process.exit(0);
});

// Обработка необработанных ошибок
process.on('uncaughtException', (error) => {
  logger.error('Необработанное исключение:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Необработанный Promise rejection:', { reason, promise });
  process.exit(1);
});

// Запуск
startServer();

export default app;