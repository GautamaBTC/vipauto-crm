# 📡 API Спецификация CRM VIPauto

## Базовая конфигурация

- **Base URL**: `https://api.vipauto-crm.ru` (development: `http://localhost:3001`)
- **Authentication**: Bearer Token (JWT от Supabase)
- **Content-Type**: `application/json`
- **Rate Limiting**: 100 запросов в минуту

## 🔐 Аутентификация (/api/auth)

### POST /api/auth/login
Вход в систему

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "master",
      "full_name": "Владимир Чекало"
    },
    "session": {
      "access_token": "jwt_token",
      "refresh_token": "refresh_token",
      "expires_at": "2024-01-01T00:00:00Z"
    }
  }
}
```

### POST /api/auth/google
Вход через Google OAuth

**Request:**
```json
{
  "id_token": "google_id_token"
}
```

### POST /api/auth/phone-login
Вход по номеру телефона

**Request:**
```json
{
  "phone": "+79123456789"
}
```

**Response:**
```json
{
  "success": true,
  "message": "SMS код отправлен"
}
```

### POST /api/auth/phone-verify
Подтверждение SMS кода

**Request:**
```json
{
  "phone": "+79123456789",
  "code": "123456"
}
```

### POST /api/auth/refresh
Обновление токена

**Request:**
```json
{
  "refresh_token": "refresh_token"
}
```

### POST /api/auth/logout
Выход из системы

**Headers:** `Authorization: Bearer {token}`

## 📋 Заказы (/api/orders)

### GET /api/orders
Получение списка заказов

**Headers:** `Authorization: Bearer {token}`

**Query Parameters:**
- `my` (boolean) - только мои заказы (для мастеров)
- `status` (string) - фильтр по статусу
- `client_id` (uuid) - фильтр по клиенту
- `date_from` (date) - заказы с даты
- `date_to` (date) - заказы по дату
- `page` (number) - номер страницы
- `limit` (number) - количество на странице

**Response:**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "ZA001",
        "client": {
          "id": "uuid",
          "name": "Иван Петров",
          "phone": "+79123456789",
          "car1": "Toyota Camry",
          "car2": "Honda Civic"
        },
        "services": [
          {
            "service_id": "uuid",
            "name": "Замена масла",
            "price": 2000,
            "qty": 1
          }
        ],
        "parts_cost": 5000,
        "services_cost": 2000,
        "total": 7000,
        "status": "в_работе",
        "masters": [
          {
            "id": "uuid",
            "name": "Владимир Чекало",
            "percent": 50
          }
        ],
        "created_at": "2024-01-01T10:00:00Z",
        "updated_at": "2024-01-01T12:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5
    }
  }
}
```

### GET /api/orders/:id
Получение деталей заказа

### POST /api/orders
Создание нового заказа

**Request:**
```json
{
  "client_id": "uuid",
  "services": [
    {
      "service_id": "uuid",
      "qty": 2,
      "price": 2000
    }
  ],
  "parts_cost": 5000,
  "masters": [
    {
      "master_id": "uuid",
      "percent": 50
    }
  ],
  "notes": "Клиент просил срочно"
}
```

### PATCH /api/orders/:id
Обновление заказа

**Request:**
```json
{
  "status": "в_работе",
  "notes": "Начали работу"
}
```

### PATCH /api/orders/:id/masters
Обновление распределения мастеров

**Request:**
```json
{
  "masters": [
    {
      "master_id": "uuid",
      "percent": 60
    },
    {
      "master_id": "uuid2",
      "percent": 40
    }
  ]
}
```

### DELETE /api/orders/:id
Удаление заказа (только для админа/директора)

## 👥 Клиенты (/api/clients)

### GET /api/clients
Получение списка клиентов

**Query Parameters:**
- `search` (string) - поиск по имени/телефону
- `has_debts` (boolean) - только с долгами
- `page` (number)
- `limit` (number)

**Response:**
```json
{
  "success": true,
  "data": {
    "clients": [
      {
        "id": "uuid",
        "name": "Иван Петров",
        "phone": "+79123456789",
        "car1": "Toyota Camry",
        "car2": "Honda Civic",
        "vin": "JTHBE5C21A1234567",
        "debt_total": 15000,
        "created_at": "2024-01-01T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50
    }
  }
}
```

### GET /api/clients/:id
Получение деталей клиента

### POST /api/clients
Создание нового клиента

**Request:**
```json
{
  "name": "Иван Петров",
  "phone": "+79123456789",
  "car1": "Toyota Camry",
  "car2": "Honda Civic",
  "vin": "JTHBE5C21A1234567",
  "notes": "Постоянный клиент"
}
```

### PATCH /api/clients/:id
Обновление клиента

### GET /api/clients/:id/orders
Получение заказов клиента

### GET /api/clients/:id/debts
Получение долгов клиента

## 🛒 Магазин запчастей (/api/parts)

### GET /api/parts/sales
Получение продаж запчастей

**Query Parameters:**
- `date_from` (date)
- `date_to` (date)
- `seller_id` (uuid)
- `client_phone` (string)

**Response:**
```json
{
  "success": true,
  "data": {
    "sales": [
      {
        "id": "uuid",
        "client_name": "Иван Петров",
        "client_phone": "+79123456789",
        "part_name": "Масляный фильтр Mann",
        "part_number": "HU716/2X",
        "quantity": 2,
        "price": 800,
        "discount": 100,
        "total": 1500,
        "seller": {
          "id": "uuid",
          "name": "Владимир Чекало"
        },
        "created_at": "2024-01-01T10:00:00Z"
      }
    ],
    "total_sales": 45000,
    "total_profit": 12000
  }
}
```

### POST /api/parts/sales
Создание продажи запчастей

**Request:**
```json
{
  "client_name": "Иван Петров",
  "client_phone": "+79123456789",
  "part_name": "Масляный фильтр Mann",
  "part_number": "HU716/2X",
  "quantity": 2,
  "price": 800,
  "discount": 100,
  "notes": "Клиент просил скидку"
}
```

### GET /api/parts/sales/:id
Получение деталей продажи

## 💰 Финансы (/api/finance)

### GET /api/finance/payments
Получение списка оплат

**Query Parameters:**
- `date_from` (date)
- `date_to` (date)
- `type` (string) - тип оплаты
- `order_id` (string)

**Response:**
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": "uuid",
        "order_id": "ZA001",
        "amount": 7000,
        "type": "карта",
        "created_by": {
          "id": "uuid",
          "name": "Роман"
        },
        "created_at": "2024-01-01T10:00:00Z"
      }
    ],
    "total_by_type": {
      "наличные": 25000,
      "карта": 45000,
      "перевод": 12000,
      "терминал": 8000
    }
  }
}
```

### POST /api/finance/payments
Создание оплаты

**Request:**
```json
{
  "order_id": "ZA001",
  "amount": 7000,
  "type": "карта",
  "notes": "Оплата за ремонт"
}
```

### GET /api/finance/debts
Получение списка долгов

**Query Parameters:**
- `client_id` (uuid)
- `remaining_only` (boolean) - только непогашенные

### POST /api/finance/debts
Создание долга

**Request:**
```json
{
  "client_id": "uuid",
  "order_id": "ZA001",
  "amount": 15000,
  "notes": "Частичная оплата"
}
```

## 💼 Зарплаты (/api/salaries)

### GET /api/salaries
Получение зарплат

**Query Parameters:**
- `master_id` (uuid) - фильтр по мастеру
- `week_period` (date) - фильтр по неделе
- `paid` (boolean) - оплаченные/неоплаченные
- `my` (boolean) - только мои (для мастеров)

**Response:**
```json
{
  "success": true,
  "data": {
    "salaries": [
      {
        "id": "uuid",
        "master": {
          "id": "uuid",
          "name": "Владимир Чекало"
        },
        "order": {
          "id": "ZA001",
          "total": 7000
        },
        "amount": 3500,
        "week_period": "2024-01-01",
        "paid": false,
        "paid_at": null,
        "created_at": "2024-01-01T10:00:00Z"
      }
    ],
    "total_unpaid": 45000,
    "total_paid": 120000
  }
}
```

### PATCH /api/salaries/:id/pay
Отметить зарплату как оплаченную

**Request:**
```json
{
  "paid_at": "2024-01-05T10:00:00Z"
}
```

### GET /api/salaries/summary
Сводка по зарплатам

**Response:**
```json
{
  "success": true,
  "data": {
    "current_week": {
      "week_start": "2024-01-01",
      "total": 45000,
      "by_master": [
        {
          "master_id": "uuid",
          "master_name": "Владимир Чекало",
          "amount": 15000
        }
      ]
    },
    "previous_week": {
      "week_start": "2023-12-25",
      "total": 38000
    }
  }
}
```

## 🎁 Бонусы (/api/bonuses)

### GET /api/bonuses
Получение бонусов

**Query Parameters:**
- `director_id` (uuid)
- `date_from` (date)
- `date_to` (date)

### POST /api/bonuses
Создание бонуса (только директор)

**Request:**
```json
{
  "order_id": "ZA001",
  "amount": 5000,
  "comment": "Сложный ремонт двигателя"
}
```

## 📊 Статистика (/api/stats)

### GET /api/stats/dashboard
Получение данных для дашборда

**Response:**
```json
{
  "success": true,
  "data": {
    "orders": {
      "new": 12,
      "in_progress": 8,
      "completed": 45,
      "total_today": 15
    },
    "finance": {
      "cash_today": 45000,
      "cash_week": 280000,
      "cash_month": 1200000,
      "debts_total": 150000
    },
    "top_masters": [
      {
        "master_id": "uuid",
        "master_name": "Владимир Чекало",
        "orders_completed": 25,
        "revenue": 180000
      }
    ],
    "recent_orders": [
      {
        "id": "ZA001",
        "client_name": "Иван Петров",
        "status": "в_работе",
        "total": 7000,
        "created_at": "2024-01-01T10:00:00Z"
      }
    ]
  }
}
```

### GET /api/stats/cashflow
Получение данных о денежном потоке

**Query Parameters:**
- `period` (string) - day, week, month, year
- `date_from` (date)
- `date_to` (date)

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "week",
    "dates": [
      "2024-01-01",
      "2024-01-02",
      "2024-01-03"
    ],
    "revenue": [
      45000,
      52000,
      38000
    ],
    "expenses": [
      12000,
      15000,
      10000
    ],
    "profit": [
      33000,
      37000,
      28000
    ]
  }
}
```

### GET /api/stats/masters
Статистика по мастерам

**Query Parameters:**
- `period` (string)
- `master_id` (uuid)

**Response:**
```json
{
  "success": true,
  "data": {
    "masters": [
      {
        "master_id": "uuid",
        "master_name": "Владимир Чекало",
        "orders_count": 45,
        "revenue": 320000,
        "salary": 64000,
        "efficiency": 85.5
      }
    ],
    "summary": {
      "total_orders": 120,
      "total_revenue": 850000,
      "total_salary": 170000
    }
  }
}
```

## 🛠️ Услуги (/api/services)

### GET /api/services
Получение справочника услуг

**Query Parameters:**
- `category` (string)
- `active` (boolean)

**Response:**
```json
{
  "success": true,
  "data": {
    "services": [
      {
        "id": "uuid",
        "name": "Замена масла",
        "price": 2000,
        "category": "ТО",
        "duration_minutes": 30,
        "is_active": true
      }
    ]
  }
}
```

### POST /api/services
Создание услуги (только админ/директор)

### PATCH /api/services/:id
Обновление услуги

### DELETE /api/services/:id
Удаление услуги

## 🔔 Уведомления (/api/notifications)

### GET /api/notifications
Получение уведомлений

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "uuid",
        "title": "Новый заказ",
        "message": "Заказ ZA001 назначен на вас",
        "type": "order_assigned",
        "read": false,
        "created_at": "2024-01-01T10:00:00Z"
      }
    ],
    "unread_count": 3
  }
}
```

### PATCH /api/notifications/:id/read
Отметить уведомление как прочитанное

### PATCH /api/notifications/read-all
Отметить все уведомления как прочитанные

## 📄 Системные эндпоинты

### GET /api/health
Проверка здоровья системы

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T10:00:00Z",
    "version": "1.0.0",
    "database": "connected"
  }
}
```

### GET /api/me
Текущий пользователь

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "master",
    "full_name": "Владимир Чекало",
    "phone": "+79123456789",
    "permissions": [
      "orders:read",
      "orders:create",
      "orders:update"
    ]
  }
}
```

## 🚨 Обработка ошибок

### Стандартный формат ошибок

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Неверные входные данные",
    "details": {
      "field": "email",
      "message": "Email обязателен"
    }
  }
}
```

### Коды ошибок

- `AUTHENTICATION_REQUIRED` - Требуется аутентификация
- `INSUFFICIENT_PERMISSIONS` - Недостаточно прав
- `VALIDATION_ERROR` - Ошибка валидации
- `NOT_FOUND` - Ресурс не найден
- `CONFLICT` - Конфликт данных
- `RATE_LIMIT_EXCEEDED` - Превышен лимит запросов
- `INTERNAL_SERVER_ERROR` - Внутренняя ошибка сервера

### HTTP статусы

- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `429` - Too Many Requests
- `500` - Internal Server Error