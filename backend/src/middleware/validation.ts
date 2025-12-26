import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '@/middleware/errorHandler';
import { asyncHandler } from '@/middleware/errorHandler';

// Middleware для валидации запросов
export const validateRequest = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = req.validationErrors;
    
    if (errors && errors.length > 0) {
      const formattedErrors = errors.reduce((acc, error) => {
        acc[error.path] = error.msg;
        return acc;
      }, {} as Record<string, string>);

      throw new ValidationError('Ошибка валидации', formattedErrors);
    }

    next();
  }
);

// Вспомогательная функция для форматирования ошибок валидации
export function formatValidationErrors(errors: any[]): Record<string, string> {
  return errors.reduce((acc, error) => {
    acc[error.path || error.param] = error.msg || error.message;
    return acc;
  }, {} as Record<string, string>);
}

// Middleware для проверки обязательных полей
export const requireFields = (fields: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const missingFields = fields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      throw new ValidationError(
        `Отсутствуют обязательные поля: ${missingFields.join(', ')}`
      );
    }

    next();
  };
};

// Middleware для валидации email
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Middleware для валидации телефона
export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[1-9]\d{10,14}$/;
  return phoneRegex.test(phone);
};

// Middleware для валидации VIN номера
export const validateVIN = (vin: string): boolean => {
  const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;
  return vinRegex.test(vin.toUpperCase());
};

// Middleware для валидации числовых полей
export const validateNumber = (value: any, min?: number, max?: number): boolean => {
  const num = Number(value);
  
  if (isNaN(num)) {
    return false;
  }

  if (min !== undefined && num < min) {
    return false;
  }

  if (max !== undefined && num > max) {
    return false;
  }

  return true;
};

// Middleware для валидации даты
export const validateDate = (date: string): boolean => {
  const dateObj = new Date(date);
  return !isNaN(dateObj.getTime());
};

// Middleware для валидации UUID
export const validateUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Middleware для очистки и нормализации данных
export const sanitizeData = (data: any): any => {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sanitized: any = Array.isArray(data) ? [] : {};

  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      const value = data[key];
      
      if (typeof value === 'string') {
        // Удаляем лишние пробелы и экранируем HTML
        sanitized[key] = value.trim().replace(/<[^>]*>/g, '');
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }
  }

  return sanitized;
};

// Middleware для проверки размера файла
export const validateFileSize = (file: Express.Multer.File, maxSize: number): boolean => {
  return file.size <= maxSize;
};

// Middleware для проверки типа файла
export const validateFileType = (file: Express.Multer.File, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(file.mimetype);
};

// Middleware для валидации статуса заказа
export const validateOrderStatus = (status: string): boolean => {
  const validStatuses = [
    'новый', 'принял', 'диагностика', 'в_работе', 
    'ожидание_деталей', 'готово', 'ожидание_оплаты', 'выдан', 'закрыт'
  ];
  return validStatuses.includes(status);
};

// Middleware для валидации роли пользователя
export const validateUserRole = (role: string): boolean => {
  const validRoles = ['master', 'admin', 'director'];
  return validRoles.includes(role);
};

// Middleware для валидации типа оплаты
export const validatePaymentType = (type: string): boolean => {
  const validTypes = ['наличные', 'карта', 'перевод', 'терминал'];
  return validTypes.includes(type);
};

// Middleware для валидации процента
export const validatePercentage = (percent: number): boolean => {
  return typeof percent === 'number' && percent >= 0 && percent <= 100;
};

// Middleware для валидации количества
export const validateQuantity = (quantity: number): boolean => {
  return typeof quantity === 'number' && quantity > 0 && Number.isInteger(quantity);
};

// Middleware для валидации цены
export const validatePrice = (price: number): boolean => {
  return typeof price === 'number' && price >= 0 && price <= 999999.99;
};

// Middleware для проверки длины строки
export const validateStringLength = (
  str: string, 
  minLength?: number, 
  maxLength?: number
): boolean => {
  if (typeof str !== 'string') {
    return false;
  }

  const length = str.length;

  if (minLength !== undefined && length < minLength) {
    return false;
  }

  if (maxLength !== undefined && length > maxLength) {
    return false;
  }

  return true;
};

// Middleware для валидации JSON
export const validateJSON = (str: string): boolean => {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
};

// Middleware для проверки SQL инъекций (базовая защита)
export const validateSQLInjection = (str: string): boolean => {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
    /(--|\/\*|\*\/|;|'|"/i,
    /\bOR\b.*?=.*\bAND\b/i,
    /\bAND\b.*?=.*\bOR\b/i
  ];

  return !sqlPatterns.some(pattern => pattern.test(str));
};

// Middleware для комплексной валидации
export const validateComplex = (
  data: any, 
  rules: Record<string, (value: any) => boolean>
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  for (const field in rules) {
    if (rules.hasOwnProperty(field)) {
      const value = data[field];
      const isValid = rules[field](value);

      if (!isValid) {
        errors.push(`Поле ${field} неверно`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};