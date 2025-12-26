import { Request, Response, NextFunction } from 'express';
import jwt, { TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
import { supabase } from '@/config/database';
import { AuthenticationError, AuthorizationError } from '@/middleware/errorHandler';
import { asyncHandler } from '@/middleware/errorHandler';
import { User } from '@/types';

// Расширяем интерфейс Request
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        full_name?: string;
        phone?: string;
      };
    }
  }
}

// Проверка JWT токена
export const authenticateToken = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Отсутствует токен аутентификации');
    }

    const token = authHeader.substring(7); // Удаляем 'Bearer '

    try {
      // Верифицируем JWT токен
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      
      // Получаем данные пользователя из Supabase
      const { data: user, error } = await supabase
        .from('auth.users')
        .select('id, email, role, full_name, phone')
        .eq('id', decoded.userId)
        .single();

      if (error || !user) {
        throw new AuthenticationError('Пользователь не найден');
      }

      // Добавляем пользователя в request
      req.user = user;
      next();
    } catch (jwtError) {
      if (jwtError instanceof TokenExpiredError) {
        throw new AuthenticationError('Токен просрочен');
      } else if (jwtError instanceof JsonWebTokenError) {
        throw new AuthenticationError('Неверный токен');
      } else {
        throw new AuthenticationError('Ошибка аутентификации');
      }
    }
  }
);

// Проверка роли пользователя
export const requireRole = (roles: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AuthenticationError('Требуется аутентификация');
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.user.role)) {
      throw new AuthorizationError(
        `Требуется одна из ролей: ${allowedRoles.join(', ')}`
      );
    }

    next();
  };
};

// Проверка прав доступа к ресурсу
export const requireOwnership = (
  resourceType: 'order' | 'client' | 'parts_sale' | 'salary'
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AuthenticationError('Требуется аутентификация');
    }

    // Директор и админ имеют доступ ко всему
    if (['director', 'admin'].includes(req.user.role)) {
      return next();
    }

    const resourceId = req.params.id;
    let hasAccess = false;

    switch (resourceType) {
      case 'order':
        // Проверяем доступ к заказу
        const { data: orderMasters } = await supabase
          .from('order_masters')
          .select('master_id')
          .eq('order_id', resourceId);

        hasAccess = orderMasters?.some((master: any) => master.master_id === req.user!.id);
        break;

      case 'client':
        // Мастера могут видеть клиентов только через заказы
        const { data: clientOrders } = await supabase
          .from('orders')
          .select('id')
          .eq('client_id', resourceId);

        if (clientOrders && clientOrders.length > 0) {
          // Проверяем есть ли у мастера доступ к этим заказам
          const { data: masterOrders } = await supabase
            .from('order_masters')
            .select('order_id')
            .eq('master_id', req.user!.id)
            .in('order_id', clientOrders.map((o: any) => o.id));

          hasAccess = masterOrders && masterOrders.length > 0;
        }
        break;

      case 'parts_sale':
        // Проверяем доступ к продаже запчастей
        const { data: partsSale } = await supabase
          .from('parts_sales')
          .select('seller_id')
          .eq('id', resourceId)
          .single();

        hasAccess = partsSale?.seller_id === req.user!.id;
        break;

      case 'salary':
        // Проверяем доступ к зарплате
        const { data: salary } = await supabase
          .from('salaries')
          .select('master_id')
          .eq('id', resourceId)
          .single();

        hasAccess = salary?.master_id === req.user!.id;
        break;
    }

    if (!hasAccess) {
      throw new AuthorizationError('Доступ к ресурсу запрещен');
    }

    next();
  };
};

// Опциональная аутентификация (не бросает ошибку если нет токена)
export const optionalAuth = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      
      const { data: user, error } = await supabase
        .from('auth.users')
        .select('id, email, role, full_name, phone')
        .eq('id', decoded.userId)
        .single();

      if (!error && user) {
        req.user = user;
      }
    } catch (error) {
      // Игнорируем ошибки опциональной аутентификации
    }

    next();
  }
);

// Проверка что пользователь работает с собой (для мастеров)
export const requireSelf = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    throw new AuthenticationError('Требуется аутентификация');
  }

  const targetUserId = req.params.userId || req.params.id;
  
  // Директор и админ имеют доступ ко всем
  if (['director', 'admin'].includes(req.user.role)) {
    return next();
  }

  // Мастер может работать только с собой
  if (req.user.id !== targetUserId) {
    throw new AuthorizationError('Доступ запрещен');
  }

  next();
};

// Middleware для API ключей (для внешних интеграций)
export const requireApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    throw new AuthenticationError('Отсутствует API ключ');
  }

  const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
  
  if (!validApiKeys.includes(apiKey)) {
    throw new AuthenticationError('Неверный API ключ');
  }

  next();
};