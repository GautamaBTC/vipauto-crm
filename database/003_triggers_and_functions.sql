-- Функция генерации ID заказа
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

-- Триггер для генерации ID заказа
CREATE TRIGGER trigger_generate_order_id
    BEFORE INSERT ON orders
    FOR EACH ROW
    WHEN (NEW.id IS NULL)
    EXECUTE FUNCTION generate_order_id();

-- Функция обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для обновления updated_at
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

-- Функция расчета зарплат при завершении заказа
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

-- Триггер для расчета зарплат
CREATE TRIGGER trigger_calculate_order_salary
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION calculate_order_salary();

-- Функция обновления долга при оплате
CREATE OR REPLACE FUNCTION update_debt_on_payment()
RETURNS TRIGGER AS $$
BEGIN
    -- Если оплата связана с долгом, уменьшаем остаток
    IF NEW.debt_id IS NOT NULL THEN
        UPDATE debts 
        SET remaining = GREATEST(0, remaining - NEW.amount),
            updated_at = NOW()
        WHERE id = NEW.debt_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для обновления долга при оплате
CREATE TRIGGER trigger_update_debt_on_payment
    AFTER INSERT ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_debt_on_payment();

-- Функция для создания уведомления о новом заказе
CREATE OR REPLACE FUNCTION create_order_notification()
RETURNS TRIGGER AS $$
DECLARE
    master_record RECORD;
BEGIN
    -- Создаем уведомления для всех мастеров назначенных на заказ
    FOR master_record IN 
        SELECT master_id FROM order_masters WHERE order_id = NEW.id
    LOOP
        INSERT INTO notifications (user_id, title, message, type, entity_id, entity_type)
        VALUES (
            master_record.master_id,
            'Новый заказ',
            'Заказ ' || NEW.id || ' назначен на вас',
            'order_assigned',
            NEW.id,
            'order'
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем таблицу уведомлений если ее нет
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    type VARCHAR(50),
    entity_id VARCHAR(100),
    entity_type VARCHAR(50),
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для уведомлений
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- RLS для уведомлений
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Пользователи видят свои уведомления" ON notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Система может создавать уведомления" ON notifications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Пользователи могут обновлять свои уведомления" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

-- Триггер для создания уведомлений
CREATE TRIGGER trigger_create_order_notification
    AFTER INSERT ON order_masters
    FOR EACH ROW
    EXECUTE FUNCTION create_order_notification();

-- Функция для получения статистики по заказам за период
CREATE OR REPLACE FUNCTION get_orders_stats(
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL
)
RETURNS TABLE(
    total_orders BIGINT,
    completed_orders BIGINT,
    total_revenue DECIMAL,
    avg_order_value DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_orders,
        COUNT(*) FILTER (WHERE status IN ('выдан', 'закрыт')) as completed_orders,
        COALESCE(SUM(total), 0) as total_revenue,
        COALESCE(AVG(total), 0) as avg_order_value
    FROM orders
    WHERE 
        (start_date IS NULL OR created_at >= start_date) AND
        (end_date IS NULL OR created_at <= end_date);
END;
$$ LANGUAGE plpgsql;

-- Функция для получения топ мастеров за период
CREATE OR REPLACE FUNCTION get_top_masters(
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    limit_count INTEGER DEFAULT 5
)
RETURNS TABLE(
    master_id UUID,
    master_name VARCHAR,
    orders_count BIGINT,
    total_revenue DECIMAL,
    salary_amount DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as master_id,
        u.full_name as master_name,
        COUNT(DISTINCT o.id) as orders_count,
        COALESCE(SUM(o.total), 0) as total_revenue,
        COALESCE(SUM(s.amount), 0) as salary_amount
    FROM auth.users u
    LEFT JOIN order_masters om ON u.id = om.master_id
    LEFT JOIN orders o ON om.order_id = o.id
    LEFT JOIN salaries s ON u.id = s.master_id AND o.id = s.order_id
    WHERE 
        u.role = 'master' AND
        (start_date IS NULL OR o.created_at >= start_date) AND
        (end_date IS NULL OR o.created_at <= end_date)
    GROUP BY u.id, u.full_name
    ORDER BY total_revenue DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;