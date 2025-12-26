import { Router } from 'express';
import { body, query } from 'express-validator';
import {
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
  updateOrderStatus,
  updateOrderMasters,
  deleteOrder
} from '@/controllers/orders';
import { authenticateToken, requireRole, requireOwnership } from '@/middleware/auth';
import { validateRequest } from '@/middleware/validation';
import { asyncHandler } from '@/middleware/errorHandler';

const router = Router();

// Middleware для всех роутов заказов
router.use(authenticateToken);

// Валидация для создания заказа
const createOrderValidation = [
  body('client_id')
    .isUUID()
    .withMessage('ID клиента должен быть валидным UUID'),
  body('services')
    .isArray({ min: 1 })
    .withMessage('Услуги должны быть массивом'),
  body('parts_cost')
    .isNumeric()
    .withMessage('Стоимость запчастей должна быть числом'),
  body('status')
    .isIn(['новый', 'принял', 'диагностика', 'в_работе', 'ожидание_деталей', 'готово', 'ожидание_оплаты', 'выдан', 'закрыт'])
    .withMessage('Неверный статус'),
  body('masters')
    .isArray({ min: 1 })
    .withMessage('Мастера должны быть массивом'),
  body('masters.*.master_id')
    .isUUID()
    .withMessage('ID мастера должен быть валидным UUID'),
  body('masters.*.percent')
    .isFloat({ min: 0.01, max: 100 })
    .withMessage('Процент должен быть числом от 0.01 до 100'),
  body('notes')
    .optional()
    .isString()
    .withMessage('Примечания должны быть строкой')
];

// Валидация для обновления заказа
const updateOrderValidation = [
  body('client_id')
    .optional()
    .isUUID()
    .withMessage('ID клиента должен быть валидным UUID'),
  body('services')
    .optional()
    .isArray()
    .withMessage('Услуги должны быть массивом'),
  body('parts_cost')
    .optional()
    .isNumeric()
    .withMessage('Стоимость запчастей должна быть числом'),
  body('status')
    .optional()
    .isIn(['новый', 'принял', 'диагностика', 'в_работе', 'ожидание_деталей', 'готово', 'ожидание_оплаты', 'выдан', 'закрыт'])
    .withMessage('Неверный статус'),
  body('notes')
    .optional()
    .isString()
    .withMessage('Примечания должны быть строкой')
];

// Валидация для обновления статуса
const updateStatusValidation = [
  body('status')
    .isIn(['новый', 'принял', 'диагностика', 'в_работе', 'ожидание_деталей', 'готово', 'ожидание_оплаты', 'выдан', 'закрыт'])
    .withMessage('Неверный статус')
];

// Валидация для обновления мастеров
const updateMastersValidation = [
  body('masters')
    .isArray({ min: 1 })
    .withMessage('Мастера должны быть массивом'),
  body('masters.*.master_id')
    .isUUID()
    .withMessage('ID мастера должен быть валидным UUID'),
  body('masters.*.percent')
    .isFloat({ min: 0.01, max: 100 })
    .withMessage('Процент должен быть числом от 0.01 до 100')
];

// Валидация параметров запроса
const queryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Страница должна быть положительным числом'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Лимит должен быть числом от 1 до 100'),
  query('my')
    .optional()
    .isBoolean()
    .withMessage('Параметр my должен быть булевым'),
  query('status')
    .optional()
    .isIn(['новый', 'принял', 'диагностика', 'в_работе', 'ожидание_деталей', 'готово', 'ожидание_оплаты', 'выдан', 'закрыт'])
    .withMessage('Неверный статус'),
  query('client_id')
    .optional()
    .isUUID()
    .withMessage('ID клиента должен быть валидным UUID'),
  query('date_from')
    .optional()
    .isISO8601()
    .withMessage('Дата должна быть в формате ISO8601'),
  query('date_to')
    .optional()
    .isISO8601()
    .withMessage('Дата должна быть в формате ISO8601'),
  query('search')
    .optional()
    .isString()
    .withMessage('Поиск должен быть строкой')
    .isLength({ min: 1, max: 100 })
    .withMessage('Поиск должен содержать от 1 до 100 символов')
];

// Роуты
router.get('/', queryValidation, validateRequest, getOrders);
router.get('/:id', getOrderById);
router.post('/', createOrderValidation, validateRequest, createOrder);
router.put('/:id', updateOrderValidation, validateRequest, updateOrder);
router.patch('/:id/status', updateStatusValidation, validateRequest, updateOrderStatus);
router.patch('/:id/masters', updateMastersValidation, validateRequest, updateOrderMasters);

// Удаление заказов - только для директора и админа
router.delete('/:id', 
  requireRole(['director', 'admin']), 
  requireOwnership('order'), 
  deleteOrder
);

export default router;