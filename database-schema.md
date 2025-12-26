# 🗄️ Схема базы данных CRM VIPauto

## Структура таблиц Supabase PostgreSQL

### 1. Пользователи (расширение Supabase Auth)

```sql
-- Расширение таблицы auth.users
ALTER TABLE auth.users 
ADD COLUMN role VARCHAR(20) DEFAULT 'master' CHECK (role IN ('master', 'admin', 'director')),
ADD COLUMN full_name VARCHAR(255),
ADD COLUMN phone VARCHAR(20);

-- Индексы
CREATE INDEX idx_users_role ON auth.users(role);
CREATE INDEX idx_users_phone ON auth.users(phone);
```

### 2. Клиенты

```sql
CREATE TABLE clients (
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

-- Индексы
CREATE INDEX idx_clients_phone ON clients(phone);
CREATE INDEX idx_clients_name ON clients(name);
CREATE INDEX idx_clients_vin ON clients(vin);
```

### 3. Услуги (справочник)

```sql
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    category VARCHAR(100),
    duration_minutes INTEGER DEFAULT 60,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_services_category ON services(category);
CREATE INDEX idx_services_active ON services(is_active);
```

### 4. Заказы

```sql
CREATE TABLE orders (
    id VARCHAR(10) PRIMARY KEY, -- ZA001, ZA002 (генерация)
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    services JSONB DEFAULT '[]', -- [{"service_id": "...", "qty": 2, "price": 2000}]
    parts_cost DECIMAL(10,2) DEFAULT 0,
    services_cost DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) GENERATED ALWAYS AS (parts_cost + services_cost) STORED,
    status VARCHAR(20) DEFAULT 'новый' CHECK (
        status IN ('новый', 'принял', 'диагностика', 'в_работе', 'ожидание_деталей', 'готово', 'ожидание_оплаты', 'выдан', 'закрыт')
    ),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_orders_client_id ON orders(client_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_created_by ON orders(created_by);
```

### 5. Распределение заказов между мастерами

```sql
CREATE TABLE order_masters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id VARCHAR(10) REFERENCES orders(id) ON DELETE CASCADE,
    master_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    percent DECIMAL(5,2) NOT NULL CHECK (percent > 0 AND percent <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(order_id, master_id)
);

-- Индексы
CREATE INDEX idx_order_masters_order_id ON order_masters(order_id);
CREATE INDEX idx_order_masters_master_id ON order_masters(master_id);
```

### 6. Продажи запчастей

```sql
CREATE TABLE parts_sales (
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
    seller_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_parts_sales_client_phone ON parts_sales(client_phone);
CREATE INDEX idx_parts_sales_seller_id ON parts_sales(seller_id);
CREATE INDEX idx_parts_sales_created_at ON parts_sales(created_at);
```

### 7. Долги

```sql
CREATE TABLE debts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    order_id VARCHAR(10) REFERENCES orders(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    remaining DECIMAL(10,2) NOT NULL CHECK (remaining >= 0),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_debts_client_id ON debts(client_id);
CREATE INDEX idx_debts_order_id ON debts(order_id);
CREATE INDEX idx_debts_remaining ON debts(remaining);
```

### 8. Оплаты

```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id VARCHAR(10) REFERENCES orders(id) ON DELETE SET NULL,
    parts_sale_id UUID REFERENCES parts_sales(id) ON DELETE SET NULL,
    debt_id UUID REFERENCES debts(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    type VARCHAR(20) NOT NULL CHECK (type IN ('наличные', 'карта', 'перевод', 'терминал')),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CHECK ((order_id IS NOT NULL) OR (parts_sale_id IS NOT NULL) OR (debt_id IS NOT NULL))
);

-- Индексы
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_parts_sale_id ON payments(parts_sale_id);
CREATE INDEX idx_payments_debt_id ON payments(debt_id);
CREATE INDEX idx_payments_type ON payments(type);
CREATE INDEX idx_payments_created_at ON payments(created_at);
```

### 9. Зарплаты

```sql
CREATE TABLE salaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    order_id VARCHAR(10) REFERENCES orders(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    paid BOOLEAN DEFAULT false,
    paid_at TIMESTAMP WITH TIME ZONE,
    week_period DATE NOT NULL, -- Начало недели выплат
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_salaries_master_id ON salaries(master_id);
CREATE INDEX idx_salaries_order_id ON salaries(order_id);
CREATE INDEX idx_salaries_paid ON salaries(paid);
CREATE INDEX idx_salaries_week_period ON salaries(week_period);
```

### 10. Бонусы директора

```sql
CREATE TABLE bonuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    director_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    order_id VARCHAR(10) REFERENCES orders(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_bonuses_director_id ON bonuses(director_id);
CREATE INDEX idx_bonuses_order_id ON bonuses(order_id);
CREATE INDEX idx_bonuses_created_at ON bonuses(created_at);
```

## RLS (Row Level Security) политики

### Включаем RLS для всех таблиц

```sql
-- Включаем RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_masters ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE salaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE bonuses ENABLE ROW LEVEL SECURITY;
```

### Политики для мастеров

```sql
-- Мастера видят только свои заказы
CREATE POLICY "Мастера видят свои заказы" ON orders
    FOR SELECT USING (
        auth.uid() IN (
            SELECT master_id FROM order_masters WHERE order_id = orders.id
        )
    );

-- Мастера могут создавать заказы
CREATE POLICY "Мастера могут создавать заказы" ON orders
    FOR INSERT WITH CHECK (auth.role() = 'master' OR auth.role() = 'admin' OR auth.role() = 'director');

-- Мастера могут обновлять свои заказы
CREATE POLICY "Мастера могут обновлять свои заказы" ON orders
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT master_id FROM order_masters WHERE order_id = orders.id
        )
    );

-- Мастера видят свои зарплаты
CREATE POLICY "Мастера видят свои зарплаты" ON salaries
    FOR SELECT USING (master_id = auth.uid());

-- Мастера могут продавать запчасти
CREATE POLICY "Мастера могут продавать запчасти" ON parts_sales
    FOR ALL USING (seller_id = auth.uid() OR auth.role() = 'admin' OR auth.role() = 'director');
```

### Политики для админа (Роман)

```sql
-- Админ имеет полный доступ ко всем данным
CREATE POLICY "Админ полный доступ" ON clients
    FOR ALL USING (auth.role() = 'admin' OR auth.role() = 'director');

CREATE POLICY "Админ полный доступ" ON services
    FOR ALL USING (auth.role() = 'admin' OR auth.role() = 'director');

CREATE POLICY "Админ полный доступ" ON orders
    FOR ALL USING (auth.role() = 'admin' OR auth.role() = 'director');

CREATE POLICY "Админ полный доступ" ON order_masters
    FOR ALL USING (auth.role() = 'admin' OR auth.role() = 'director');

CREATE POLICY "Админ полный доступ" ON parts_sales
    FOR ALL USING (auth.role() = 'admin' OR auth.role() = 'director');

CREATE POLICY "Админ полный доступ" ON debts
    FOR ALL USING (auth.role() = 'admin' OR auth.role() = 'director');

CREATE POLICY "Админ полный доступ" ON payments
    FOR ALL USING (auth.role() = 'admin' OR auth.role() = 'director');

CREATE POLICY "Админ полный доступ" ON salaries
    FOR ALL USING (auth.role() = 'admin' OR auth.role() = 'director');

CREATE POLICY "Админ полный доступ" ON bonuses
    FOR ALL USING (auth.role() = 'admin' OR auth.role() = 'director');
```

## Триггеры и функции

### Функция генерации ID заказа

```sql
CREATE OR REPLACE FUNCTION generate_order_id()
RETURNS TRIGGER AS $$
DECLARE
    new_id VARCHAR(10);
    max_id VARCHAR(10);
    next_num INTEGER;
BEGIN
    -- Получаем максимальный номер заказа
    SELECT MAX(id) INTO max_id FROM orders WHERE id ~ '^ZA[0-9]+$';
    
    IF max_id IS NULL THEN
        new_id := 'ZA001';
    ELSE
        next_num := (SUBSTRING(max_id, 3)::INTEGER) + 1;
        new_id := 'ZA' || LPAD(next_num::TEXT, 3, '0');
    END IF;
    
    NEW.id := new_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_order_id
    BEFORE INSERT ON orders
    FOR EACH ROW
    WHEN (NEW.id IS NULL)
    EXECUTE FUNCTION generate_order_id();
```

### Функция обновления updated_at

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Применяем ко всем таблицам с updated_at
CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at
    BEFORE UPDATE ON services
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_debts_updated_at
    BEFORE UPDATE ON debts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### Функция расчета зарплат

```sql
CREATE OR REPLACE FUNCTION calculate_order_salary()
RETURNS TRIGGER AS $$
DECLARE
    master_record RECORD;
    salary_amount DECIMAL(10,2);
    week_start DATE;
BEGIN
    -- Если заказ завершен, рассчитываем зарплаты мастерам
    IF NEW.status IN ('выдан', 'закрыт') AND OLD.status NOT IN ('выдан', 'закрыт') THEN
        week_start := date_trunc('week', CURRENT_DATE);
        
        FOR master_record IN 
            SELECT * FROM order_masters WHERE order_id = NEW.id
        LOOP
            salary_amount := NEW.total * (master_record.percent / 100);
            
            INSERT INTO salaries (master_id, order_id, amount, week_period)
            VALUES (master_record.master_id, NEW.id, salary_amount, week_start)
            ON CONFLICT (master_id, order_id) DO NOTHING;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_order_salary
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION calculate_order_salary();
```

## Начальные данные (Seed)

```sql
-- Вставляем пользователей (через Supabase Auth UI или API)
-- Директор: Владимир Михайлович Орлов (director)
-- Админ: Роман (admin) 
-- Мастера: Владимир Чекало, Владимир Архипов, Андрей, Алексей, Артём (master)

-- Вставляем базовые услуги
INSERT INTO services (name, price, category, duration_minutes) VALUES
('Замена масла', 2000.00, 'ТО', 30),
('Замена масляного фильтра', 500.00, 'ТО', 15),
('Замена воздушного фильтра', 800.00, 'ТО', 20),
('Замена салонного фильтра', 1200.00, 'ТО', 25),
('Замена тормозных колодок', 3500.00, 'Тормоза', 60),
('Замена тормозных дисков', 5000.00, 'Тормоза', 90),
('Диагностика ходовой части', 1500.00, 'Диагностика', 45),
('Диагностика двигателя', 2000.00, 'Диагностика', 60),
('Ремонт подвески', 8000.00, 'Ходовая часть', 180),
('Ремонт двигателя', 15000.00, 'Двигатель', 300),
('Замена свечей зажигания', 2500.00, 'Двигатель', 40),
('Замена ремня ГРМ', 12000.00, 'Двигатель', 150),
('Компьютерная диагностика', 1800.00, 'Диагностика', 30),
('Шиномонтаж', 2000.00, 'Шины', 60),
('Балансировка колес', 1500.00, 'Шины', 30);