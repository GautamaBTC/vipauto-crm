-- Включаем RLS для всех таблиц
ALTER TABLE masters ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_masters ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE salaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE bonuses ENABLE ROW LEVEL SECURITY;

-- Политики для мастеров
CREATE POLICY "Все видят список мастеров" ON masters
    FOR SELECT USING (true);

CREATE POLICY "Только директор может управлять мастерами" ON masters
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'director'
    );

-- Политики для клиентов
CREATE POLICY "Все пользователи могут читать клиентов" ON clients
    FOR SELECT USING (true);

CREATE POLICY "Админ и директор могут создавать клиентов" ON clients
    FOR INSERT WITH CHECK (
        auth.jwt() ->> 'role' IN ('admin', 'director') OR
        auth.jwt() ->> 'role' = 'master'
    );

CREATE POLICY "Админ и директор могут обновлять клиентов" ON clients
    FOR UPDATE USING (
        auth.jwt() ->> 'role' IN ('admin', 'director')
    );

CREATE POLICY "Только директор может удалять клиентов" ON clients
    FOR DELETE USING (
        auth.jwt() ->> 'role' = 'director'
    );

-- Политики для услуг
CREATE POLICY "Все пользователи могут читать активные услуги" ON services
    FOR SELECT USING (is_active = true);

CREATE POLICY "Админ и директор могут управлять услугами" ON services
    FOR ALL USING (
        auth.jwt() ->> 'role' IN ('admin', 'director')
    );

-- Политики для заказов
CREATE POLICY "Мастера видят свои заказы" ON orders
    FOR SELECT USING (
        auth.jwt() ->> 'role' IN ('admin', 'director') OR
        auth.uid() IN (
            SELECT master_id FROM masters WHERE id = (
                SELECT master_id FROM order_masters WHERE order_id = orders.id
            )
        )
    );

CREATE POLICY "Мастера могут создавать заказы" ON orders
    FOR INSERT WITH CHECK (
        auth.jwt() ->> 'role' IN ('master', 'admin', 'director')
    );

CREATE POLICY "Мастера могут обновлять свои заказы" ON orders
    FOR UPDATE USING (
        auth.jwt() ->> 'role' IN ('admin', 'director') OR
        created_by = auth.uid() OR
        auth.uid() IN (
            SELECT master_id FROM order_masters WHERE order_id = orders.id
        )
    );

CREATE POLICY "Админ и директор могут удалять заказы" ON orders
    FOR DELETE USING (
        auth.jwt() ->> 'role' IN ('admin', 'director')
    );

-- Политики для order_masters
CREATE POLICY "Мастера видят свои назначения" ON order_masters
    FOR SELECT USING (
        auth.jwt() ->> 'role' IN ('admin', 'director') OR
        master_id = auth.uid()
    );

CREATE POLICY "Админ и директор могут управлять назначениями" ON order_masters
    FOR ALL USING (
        auth.jwt() ->> 'role' IN ('admin', 'director')
    );

-- Политики для продаж запчастей
CREATE POLICY "Все видят продажи запчастей" ON parts_sales
    FOR SELECT USING (
        auth.jwt() ->> 'role' IN ('admin', 'director') OR
        seller_id = auth.uid()
    );

CREATE POLICY "Все могут создавать продажи запчастей" ON parts_sales
    FOR INSERT WITH CHECK (
        seller_id = auth.uid()
    );

CREATE POLICY "Продавец может обновлять свою продажу" ON parts_sales
    FOR UPDATE USING (
        auth.jwt() ->> 'role' IN ('admin', 'director') OR
        seller_id = auth.uid()
    );

CREATE POLICY "Админ и директор могут удалять продажи" ON parts_sales
    FOR DELETE USING (
        auth.jwt() ->> 'role' IN ('admin', 'director')
    );

-- Политики для долгов
CREATE POLICY "Админ и директор видят все долги" ON debts
    FOR SELECT USING (
        auth.jwt() ->> 'role' IN ('admin', 'director')
    );

CREATE POLICY "Мастера видят долги по своим заказам" ON debts
    FOR SELECT USING (
        auth.uid() IN (
            SELECT master_id FROM order_masters WHERE order_id = debts.order_id
        )
    );

CREATE POLICY "Админ и директор могут управлять долгами" ON debts
    FOR ALL USING (
        auth.jwt() ->> 'role' IN ('admin', 'director')
    );

-- Политики для оплат
CREATE POLICY "Все видят оплаты" ON payments
    FOR SELECT USING (
        auth.jwt() ->> 'role' IN ('admin', 'director') OR
        created_by = auth.uid()
    );

CREATE POLICY "Все могут создавать оплаты" ON payments
    FOR INSERT WITH CHECK (
        created_by = auth.uid()
    );

CREATE POLICY "Админ и директор могут обновлять оплаты" ON payments
    FOR UPDATE USING (
        auth.jwt() ->> 'role' IN ('admin', 'director')
    );

CREATE POLICY "Админ и директор могут удалять оплаты" ON payments
    FOR DELETE USING (
        auth.jwt() ->> 'role' IN ('admin', 'director')
    );

-- Политики для зарплат
CREATE POLICY "Мастера видят свои зарплаты" ON salaries
    FOR SELECT USING (
        auth.jwt() ->> 'role' IN ('admin', 'director') OR
        master_id = auth.uid()
    );

CREATE POLICY "Админ и директор могут управлять зарплатами" ON salaries
    FOR ALL USING (
        auth.jwt() ->> 'role' IN ('admin', 'director')
    );

-- Политики для бонусов
CREATE POLICY "Директор видит все бонусы" ON bonuses
    FOR SELECT USING (
        auth.jwt() ->> 'role' = 'director'
    );

CREATE POLICY "Только директор может управлять бонусами" ON bonuses
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'director'
    );