import { Request, Response } from 'express';
import { supabase, supabaseAuth } from '@/config/database';
import { 
  AuthenticationError, 
  ValidationError, 
  ConflictError, 
  asyncHandler 
} from '@/middleware/errorHandler';
import { 
  LoginData, 
  LoginResponse, 
  GoogleLoginData, 
  PhoneLoginData, 
  PhoneVerifyData, 
  ApiResponse,
  User
} from '@/types';
import jwt from 'jsonwebtoken';
import { logger, logSecurity, logBusiness } from '@/utils/logger';

// Генерация JWT токена
function generateJWT(user: User): string {
  return jwt.sign(
    { 
      userId: user.id, 
      email: user.email, 
      role: user.role 
    },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );
}

// Обновление роли пользователя
async function updateUserRole(userId: string, role: string): Promise<void> {
  const { error } = await supabase
    .from('auth.users')
    .update({ role })
    .eq('id', userId);

  if (error) {
    throw new Error(`Ошибка обновления роли: ${error.message}`);
  }
}

// Вход по email и паролю
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password }: LoginData = req.body;

  if (!email || !password) {
    throw new ValidationError('Email и пароль обязательны');
  }

  try {
    // Аутентификация через Supabase
    const { data: authData, error: authError } = await supabaseAuth.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      logSecurity('Неудачная попытка входа', { email, error: authError.message });
      throw new AuthenticationError('Неверный email или пароль');
    }

    // Получаем данные пользователя из нашей таблицы
    const { data: user, error: userError } = await supabase
      .from('auth.users')
      .select('id, email, role, full_name, phone')
      .eq('id', authData.user.id)
      .single();

    if (userError || !user) {
      throw new AuthenticationError('Пользователь не найден');
    }

    // Устанавливаем роль если ее нет
    if (!user.role) {
      await updateUserRole(user.id, 'master');
      user.role = 'master';
    }

    // Генерируем JWT токен
    const token = generateJWT(user);

    logBusiness('Пользователь вошел в систему', user.id, { email, role: user.role });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          full_name: user.full_name,
          phone: user.phone
        },
        session: {
          access_token: token,
          refresh_token: authData.session?.refresh_token || '',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      } as LoginResponse
    } as ApiResponse<LoginResponse>);
  }
});

// Вход через Google OAuth
export const loginWithGoogle = asyncHandler(async (req: Request, res: Response) => {
  const { id_token }: GoogleLoginData = req.body;

  if (!id_token) {
    throw new ValidationError('ID токен обязателен');
  }

  try {
    // Аутентификация через Supabase
    const { data: authData, error: authError } = await supabaseAuth.auth.signInWithIdToken({
      provider: 'google',
      token: id_token
    });

    if (authError) {
      logSecurity('Неудачная попытка входа через Google', { error: authError.message });
      throw new AuthenticationError('Ошибка аутентификации Google');
    }

    // Получаем или создаем пользователя
    let { data: user, error: userError } = await supabase
      .from('auth.users')
      .select('id, email, role, full_name, phone')
      .eq('id', authData.user.id)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      throw new AuthenticationError('Ошибка получения данных пользователя');
    }

    // Если пользователя нет, создаем
    if (!user) {
      const { data: newUser, error: createError } = await supabase
        .from('auth.users')
        .insert({
          id: authData.user.id,
          email: authData.user.email,
          full_name: authData.user.user_metadata?.full_name || authData.user.email,
          phone: authData.user.phone,
          role: 'master'
        })
        .select('id, email, role, full_name, phone')
        .single();

      if (createError) {
        throw new Error(`Ошибка создания пользователя: ${createError.message}`);
      }

      user = newUser;
    } else if (!user.role) {
      // Устанавливаем роль если ее нет
      await updateUserRole(user.id, 'master');
      user.role = 'master';
    }

    // Генерируем JWT токен
    const token = generateJWT(user);

    logBusiness('Пользователь вошел через Google', user.id, { email: user.email });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          full_name: user.full_name,
          phone: user.phone
        },
        session: {
          access_token: token,
          refresh_token: authData.session?.refresh_token || '',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      } as LoginResponse
    } as ApiResponse<LoginResponse>);
  }
});

// Запрос SMS кода
export const loginWithPhone = asyncHandler(async (req: Request, res: Response) => {
  const { phone }: PhoneLoginData = req.body;

  if (!phone) {
    throw new ValidationError('Номер телефона обязателен');
  }

  // Валидация формата телефона
  const phoneRegex = /^\+?[1-9]\d{10,14}$/;
  if (!phoneRegex.test(phone)) {
    throw new ValidationError('Неверный формат телефона');
  }

  try {
    // Проверяем есть ли пользователь
    const { data: user, error: userError } = await supabase
      .from('auth.users')
      .select('id, phone')
      .eq('phone', phone)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      throw new Error('Ошибка проверки пользователя');
    }

    // Если пользователя нет, создаем
    if (!user) {
      const { data: newUser, error: createError } = await supabase
        .from('auth.users')
        .insert({
          phone,
          email: `${phone}@temp.com`, // Временный email
          role: 'master'
        })
        .select('id, phone')
        .single();

      if (createError) {
        throw new Error(`Ошибка создания пользователя: ${createError.message}`);
      }

      // Создаем пользователя в Supabase Auth
      const { error: authError } = await supabaseAuth.auth.admin.createUser({
        email: `${phone}@temp.com`,
        phone,
        password: Math.random().toString(36).substring(7), // Случайный пароль
        email_confirm: true
      });

      if (authError) {
        throw new Error(`Ошибка создания auth пользователя: ${authError.message}`);
      }
    }

    // Здесь должна быть интеграция с Twilio для отправки SMS
    // const smsCode = Math.floor(1000 + Math.random() * 9000).toString();
    // await sendSMSCode(phone, smsCode);

    logSecurity('Запрос SMS кода', { phone });

    res.json({
      success: true,
      data: {
        message: 'SMS код отправлен',
        // В разработке можно возвращать код для тестов
        // code: process.env.NODE_ENV === 'development' ? '123456' : undefined
      }
    } as ApiResponse);
  } catch (error) {
    logger.error('Ошибка отправки SMS:', error);
    throw new AuthenticationError('Ошибка отправки SMS');
  }
});

// Подтверждение SMS кода
export const verifyPhone = asyncHandler(async (req: Request, res: Response) => {
  const { phone, code }: PhoneVerifyData = req.body;

  if (!phone || !code) {
    throw new ValidationError('Телефон и код обязательны');
  }

  // В разработке принимаем тестовый код
  if (process.env.NODE_ENV === 'development' && code !== '123456') {
    throw new ValidationError('Неверный код подтверждения');
  }

  try {
    // Получаем пользователя по телефону
    const { data: user, error: userError } = await supabase
      .from('auth.users')
      .select('id, email, role, full_name, phone')
      .eq('phone', phone)
      .single();

    if (userError || !user) {
      throw new AuthenticationError('Пользователь не найден');
    }

    // Генерируем JWT токен
    const token = generateJWT(user);

    logBusiness('Пользователь вошел через телефон', user.id, { phone });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          full_name: user.full_name,
          phone: user.phone
        },
        session: {
          access_token: token,
          refresh_token: '',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      } as LoginResponse
    } as ApiResponse<LoginResponse>);
  } catch (error) {
    logger.error('Ошибка верификации телефона:', error);
    throw new AuthenticationError('Ошибка верификации');
  }
});

// Обновление токена
export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    throw new ValidationError('Refresh токен обязателен');
  }

  try {
    const { data: authData, error } = await supabaseAuth.auth.refreshSession(refresh_token);

    if (error) {
      throw new AuthenticationError('Неверный refresh токен');
    }

    // Получаем данные пользователя
    const { data: user, error: userError } = await supabase
      .from('auth.users')
      .select('id, email, role, full_name, phone')
      .eq('id', authData.user.id)
      .single();

    if (userError || !user) {
      throw new AuthenticationError('Пользователь не найден');
    }

    // Генерируем новый JWT токен
    const token = generateJWT(user);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          full_name: user.full_name,
          phone: user.phone
        },
        session: {
          access_token: token,
          refresh_token: authData.session?.refresh_token || refresh_token,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      } as LoginResponse
    } as ApiResponse<LoginResponse>);
  } catch (error) {
    logger.error('Ошибка обновления токена:', error);
    throw new AuthenticationError('Ошибка обновления токена');
  }
});

// Выход из системы
export const logout = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { error } = await supabaseAuth.auth.signOut();

    if (error) {
      logger.error('Ошибка выхода из системы:', error);
    }

    logBusiness('Пользователь вышел из системы', req.user?.id);

    res.json({
      success: true,
      data: {
        message: 'Выход выполнен успешно'
      }
    } as ApiResponse);
  } catch (error) {
    logger.error('Ошибка выхода:', error);
    throw new AuthenticationError('Ошибка выхода из системы');
  }
});

// Получение текущего пользователя
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AuthenticationError('Требуется аутентификация');
  }

  res.json({
    success: true,
    data: {
      user: req.user,
      permissions: getUserPermissions(req.user.role)
    }
  } as ApiResponse);
});

// Получение прав доступа по роли
function getUserPermissions(role: string): string[] {
  const permissions = {
    master: [
      'orders:read', 'orders:create', 'orders:update',
      'clients:read', 'clients:create',
      'parts:read', 'parts:create',
      'salaries:read:own',
      'notifications:read', 'notifications:update'
    ],
    admin: [
      'orders:read', 'orders:create', 'orders:update', 'orders:delete',
      'clients:read', 'clients:create', 'clients:update', 'clients:delete',
      'parts:read', 'parts:create', 'parts:update', 'parts:delete',
      'salaries:read', 'salaries:update',
      'services:read', 'services:create', 'services:update', 'services:delete',
      'stats:read',
      'notifications:read', 'notifications:update'
    ],
    director: [
      'orders:read', 'orders:create', 'orders:update', 'orders:delete',
      'clients:read', 'clients:create', 'clients:update', 'clients:delete',
      'parts:read', 'parts:create', 'parts:update', 'parts:delete',
      'salaries:read', 'salaries:update',
      'bonuses:read', 'bonuses:create',
      'services:read', 'services:create', 'services:update', 'services:delete',
      'stats:read',
      'users:manage',
      'notifications:read', 'notifications:update'
    ]
  };

  return permissions[role as keyof typeof permissions] || [];
}