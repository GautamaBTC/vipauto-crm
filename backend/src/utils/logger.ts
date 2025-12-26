import winston from 'winston';
import path from 'path';

// Определяем уровни логирования
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Определяем цвета для каждого уровня
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Добавляем цвета в winston
winston.addColors(colors);

// Формат логов
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}${
      info.stack ? '\n' + info.stack : ''
    }${
      info.metadata && Object.keys(info.metadata).length > 0 
        ? '\n' + JSON.stringify(info.metadata, null, 2) 
        : ''
    }`
  ),
);

// Транспорты
const transports = [
  // Консольный вывод
  new winston.transports.Console({
    format,
  }),
];

// Добавляем файловые транспорты только в продакшене
if (process.env.NODE_ENV === 'production') {
  // Создаем директорию для логов если ее нет
  const logDir = 'logs';
  
  // Файл для всех логов
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    })
  );

  // Файл только для ошибок
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    })
  );
}

// Создаем logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
  levels,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports,
  // Обработка необработанных исключений
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join('logs', 'exceptions.log') 
    })
  ],
  // Обработка необработанных Promise rejection
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: path.join('logs', 'rejections.log') 
    })
  ],
});

// Расширяем интерфейс для метаданных
declare module 'winston' {
  interface Logger {
    metadata: any;
  }
}

// Вспомогательные функции
export const logInfo = (message: string, metadata?: any) => {
  logger.info(message, { metadata });
};

export const logError = (message: string, error?: Error | any, metadata?: any) => {
  const errorData = error instanceof Error ? {
    name: error.name,
    message: error.message,
    stack: error.stack
  } : error;
  
  logger.error(message, { 
    error: errorData, 
    metadata 
  });
};

export const logWarn = (message: string, metadata?: any) => {
  logger.warn(message, { metadata });
};

export const logDebug = (message: string, metadata?: any) => {
  logger.debug(message, { metadata });
};

// HTTP запросы
export const logHttp = (method: string, url: string, statusCode: number, responseTime: number, metadata?: any) => {
  logger.http(`${method} ${url} ${statusCode} - ${responseTime}ms`, { 
    method, 
    url, 
    statusCode, 
    responseTime,
    metadata 
  });
};

// Бизнес события
export const logBusiness = (event: string, userId?: string, metadata?: any) => {
  logger.info(`BUSINESS: ${event}`, { 
    event, 
    userId, 
    metadata,
    business: true 
  });
};

// Безопасность
export const logSecurity = (event: string, metadata?: any) => {
  logger.warn(`SECURITY: ${event}`, { 
    event, 
    metadata,
    security: true 
  });
};

// Производительность
export const logPerformance = (operation: string, duration: number, metadata?: any) => {
  logger.info(`PERFORMANCE: ${operation} - ${duration}ms`, { 
    operation, 
    duration,
    metadata,
    performance: true 
  });
};

export { logger };