-- Таблица пользователей (мастеров и персонала)
CREATE TABLE IF NOT EXISTS masters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'master' CHECK (role IN ('master', 'admin', 'director')),
    password_hash VARCHAR(255), -- Для локальной аутентификации
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание индексов для пользователей
CREATE INDEX IF NOT EXISTS idx_masters_role ON masters(role);
CREATE INDEX IF NOT EXISTS idx_masters_phone ON masters(phone);
CREATE INDEX IF NOT EXISTS idx_masters_email ON masters(email);

-- Таблица клиентов
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE,
    car1 VARCHAR(255),
    car2 VARCHAR(255),
    vin VARCHAR(17),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для клиентов
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_vin ON clients(vin);

-- Таблица услуг (справочник)
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    category VARCHAR(100),
    duration_minutes INTEGER DEFAULT 60,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для услуг
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active);

-- Таблица заказов
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(10) PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    services JSONB DEFAULT '[]',
    parts_cost DECIMAL(10,2) DEFAULT 0,
    services_cost DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) GENERATED ALWAYS AS (parts_cost + services_cost) STORED,
    status VARCHAR(20) DEFAULT 'новый' CHECK (
        status IN ('новый', 'принял', 'диагностика', 'в_работе', 'ожидание_деталей', 'готово', 'ожидание_оплаты', 'выдан', 'закрыт')
    ),
    notes TEXT,
    created_by UUID REFERENCES masters(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для заказов
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(created_by);

-- Таблица распределения заказов между мастерами
CREATE TABLE IF NOT EXISTS order_masters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id VARCHAR(10) REFERENCES orders(id) ON DELETE CASCADE,
    master_id UUID REFERENCES masters(id) ON DELETE CASCADE,
    percent DECIMAL(5,2) NOT NULL CHECK (percent > 0 AND percent <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(order_id, master_id)
);

-- Индексы для order_masters
CREATE INDEX IF NOT EXISTS idx_order_masters_order_id ON order_masters(order_id);
CREATE INDEX IF NOT EXISTS idx_order_masters_master_id ON order_masters(master_id);

-- Таблица продаж запчастей
CREATE TABLE IF NOT EXISTS parts_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name VARCHAR(255),
    client_phone VARCHAR(20),
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    part_name VARCHAR(255) NOT NULL,
    part_number VARCHAR(100),
    quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    discount DECIMAL(10,2) DEFAULT 0 CHECK (discount >= 0),
    total DECIMAL(10,2) GENERATED ALWAYS AS (quantity * price - discount) STORED,
    seller_id UUID REFERENCES masters(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для продаж запчастей
CREATE INDEX IF NOT EXISTS idx_parts_sales_client_phone ON parts_sales(client_phone);
CREATE INDEX IF NOT EXISTS idx_parts_sales_seller_id ON parts_sales(seller_id);
CREATE INDEX IF NOT EXISTS idx_parts_sales_created_at ON parts_sales(created_at);

-- Таблица долгов
CREATE TABLE IF NOT EXISTS debts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    order_id VARCHAR(10) REFERENCES orders(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    remaining DECIMAL(10,2) NOT NULL CHECK (remaining >= 0),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для долгов
CREATE INDEX IF NOT EXISTS idx_debts_client_id ON debts(client_id);
CREATE INDEX IF NOT EXISTS idx_debts_order_id ON debts(order_id);
CREATE INDEX IF NOT EXISTS idx_debts_remaining ON debts(remaining);

-- Таблица оплат
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id VARCHAR(10) REFERENCES orders(id) ON DELETE SET NULL,
    parts_sale_id UUID REFERENCES parts_sales(id) ON DELETE SET NULL,
    debt_id UUID REFERENCES debts(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    type VARCHAR(20) NOT NULL CHECK (type IN ('наличные', 'карта', 'перевод', 'терминал')),
    notes TEXT,
    created_by UUID REFERENCES masters(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CHECK ((order_id IS NOT NULL) OR (parts_sale_id IS NOT NULL) OR (debt_id IS NOT NULL))
);

-- Индексы для оплат
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_parts_sale_id ON payments(parts_sale_id);
CREATE INDEX IF NOT EXISTS idx_payments_debt_id ON payments(debt_id);
CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(type);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- Таблица зарплат
CREATE TABLE IF NOT EXISTS salaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id UUID REFERENCES masters(id) ON DELETE CASCADE,
    order_id VARCHAR(10) REFERENCES orders(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    paid BOOLEAN DEFAULT false,
    paid_at TIMESTAMP WITH TIME ZONE,
    week_period DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для зарплат
CREATE INDEX IF NOT EXISTS idx_salaries_master_id ON salaries(master_id);
CREATE INDEX IF NOT EXISTS idx_salaries_order_id ON salaries(order_id);
CREATE INDEX IF NOT EXISTS idx_salaries_paid ON salaries(paid);
CREATE INDEX IF NOT EXISTS idx_salaries_week_period ON salaries(week_period);

-- Таблица бонусов директора
CREATE TABLE IF NOT EXISTS bonuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    director_id UUID REFERENCES masters(id) ON DELETE CASCADE,
    order_id VARCHAR(10) REFERENCES orders(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для бонусов
CREATE INDEX IF NOT EXISTS idx_bonuses_director_id ON bonuses(director_id);
CREATE INDEX IF NOT EXISTS idx_bonuses_order_id ON bonuses(order_id);
CREATE INDEX IF NOT EXISTS idx_bonuses_created_at ON bonuses(created_at);