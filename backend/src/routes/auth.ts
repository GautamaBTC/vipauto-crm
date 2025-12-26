import { Router } from 'express';
import { body } from 'express-validator';
import {
  login,
  loginWithGoogle,
  loginWithPhone,
  verifyPhone,
  refreshToken,
  logout,
  getMe
} from '@/controllers/auth';
import { validateRequest } from '@/middleware/validation';
import { optionalAuth } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';

const router = Router();

// Валидация для входа по email/паролю
const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Неверный формат email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Пароль должен содержать минимум 6 символов')
];

// Валидация для Google OAuth
const googleValidation = [
  body('id_token')
    .notEmpty()
    .withMessage('ID токен обязателен')
];

// Валидация для входа по телефону
const phoneLoginValidation = [
  body('phone')
    .matches(/^\+?[1-9]\d{10,14}$/)
    .withMessage('Неверный формат телефона')
    .normalizeEmail()
];

// Валидация для подтверждения телефона
const phoneVerifyValidation = [
  body('phone')
    .matches(/^\+?[1-9]\d{10,14}$/)
    .withMessage('Неверный формат телефона'),
  body('code')
    .isLength({ min: 4, max: 6 })
    .withMessage('Код должен содержать 4-6 цифр')
    .isNumeric()
    .withMessage('Код должен содержать только цифры')
];

// Валидация для refresh токена
const refreshValidation = [
  body('refresh_token')
    .notEmpty()
    .withMessage('Refresh токен обязателен')
];

// Роуты
router.post('/login', loginValidation, validateRequest, login);
router.post('/google', googleValidation, validateRequest, loginWithGoogle);
router.post('/phone-login', phoneLoginValidation, validateRequest, loginWithPhone);
router.post('/phone-verify', phoneVerifyValidation, validateRequest, verifyPhone);
router.post('/refresh', refreshValidation, validateRequest, refreshToken);
router.post('/logout', logout);
router.get('/me', optionalAuth, getMe);

export default router;