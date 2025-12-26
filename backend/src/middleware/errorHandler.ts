import { Request, Response, NextFunction } from 'express';
import { logger, logError } from '@/utils/logger';

// Классы ошибок
export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Ошибка аутентификации') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Недостаточно прав доступа') {
    super(message, 403, 'INSUFFICIENT_PERMISSIONS');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Ресурс не найден') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Конфликт данных') {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

// Обработка ошибок Supabase
export function handleSupabaseError(error: any): AppError {
  const errorCode = error?.code;
  const errorMessage = error?.message;

  switch (errorCode) {
    case 'PGRST116':
      return new ValidationError('Отсутствуют обязательные поля', error.details);
    
    case 'PGRST301':
      return new AuthorizationError('Доступ запрещен');
    
    case 'PGRST302':
      return new NotFoundError('Запись не найдена');
    
    case '23505':
      return new ConflictError('Запись уже существует');
    
    case '23503':
      return new ValidationError('Нарушена целостность данных');
    
    case '23514':
      return new ValidationError('Нарушено ограничение');
    
    case '42501':
      return new AuthorizationError('Недостаточно прав для операции');
    
    default:
      logError('Неизвестная ошибка Supabase', error);
      return new AppError('Внутренняя ошибка сервера', 500, 'DATABASE_ERROR');
  }
}

// Основной обработчик ошибок
export function errorHandler(
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  let appError: AppError;

  // Если это наша ошибка, используем как есть
  if (error instanceof AppError) {
    appError = error;
  } else if (error.name === 'ValidationError') {
    // Ошибки валидации express-validator
    appError = new ValidationError(error.message, (error as any).details);
  } else if (error.name === 'JsonWebTokenError') {
    // Ошибки JWT
    appError = new AuthenticationError('Неверный токен');
  } else if (error.name === 'TokenExpiredError') {
    // Просроченный токен
    appError = new AuthenticationError('Токен просрочен');
  } else if (error.name === 'MulterError') {
    // Ошибки загрузки файлов
    appError = new ValidationError('Ошибка загрузки файла');
  } else if (error?.code?.startsWith('PGRST')) {
    // Ошибки Supabase
    appError = handleSupabaseError(error);
  } else {
    // Неизвестная ошибка
    logError('Необработанная ошибка', error, {
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    appError = new AppError('Внутренняя ошибка сервера', 500, 'INTERNAL_SERVER_ERROR');
  }

  // Логируем ошибку
  if (appError.statusCode >= 500) {
    logError('Ошибка сервера', appError, {
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  } else {
    logger.warn('Ошибка клиента:', {
      message: appError.message,
      code: appError.code,
      statusCode: appError.statusCode,
      url: req.url,
      method: req.method,
      ip: req.ip
    });
  }

  // Формируем ответ
  const response: any = {
    success: false,
    error: {
      code: appError.code,
      message: appError.message
    }
  };

  // Добавляем детали валидации если есть
  if (appError instanceof ValidationError && (appError as any).details) {
    response.error.details = (appError as any).details;
  }

  // В разработке добавляем стек ошибки
  if (process.env.NODE_ENV === 'development') {
    response.error.stack = appError.stack;
  }

  res.status(appError.statusCode).json(response);
}

// Async error wrapper
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Обработка 404
export function notFoundHandler(req: Request, res: Response) {
  const error = new NotFoundError(`Эндпоинт ${req.method} ${req.path} не найден`);
  
  res.status(404).json({
    success: false,
    error: {
      code: error.code,
      message: error.message
    }
  });
}