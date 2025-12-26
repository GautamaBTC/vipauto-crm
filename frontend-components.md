# 🎨 Frontend Компоненты CRM VIPauto

## 📱 Мобильный-first дизайн система

### Цветовая палитра
```css
:root {
  /* Primary */
  --primary-50: #eff6ff;
  --primary-500: #3b82f6;
  --primary-600: #2563eb;
  --primary-700: #1d4ed8;
  
  /* Secondary */
  --secondary-500: #64748b;
  --secondary-600: #475569;
  
  /* Success */
  --success-500: #10b981;
  --success-600: #059669;
  
  /* Warning */
  --warning-500: #f59e0b;
  --warning-600: #d97706;
  
  /* Error */
  --error-500: #ef4444;
  --error-600: #dc2626;
  
  /* Neutral */
  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  --gray-200: #e5e7eb;
  --gray-300: #d1d5db;
  --gray-400: #9ca3af;
  --gray-500: #6b7280;
  --gray-600: #4b5563;
  --gray-700: #374151;
  --gray-800: #1f2937;
  --gray-900: #111827;
  
  /* Border radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
}
```

### Типографика
```css
/* Mobile-first типографика */
.text-xs { font-size: 0.75rem; line-height: 1rem; }    /* 12px */
.text-sm { font-size: 0.875rem; line-height: 1.25rem; } /* 14px */
.text-base { font-size: 1rem; line-height: 1.5rem; }   /* 16px */
.text-lg { font-size: 1.125rem; line-height: 1.75rem; } /* 18px */
.text-xl { font-size: 1.25rem; line-height: 1.75rem; }  /* 20px */
.text-2xl { font-size: 1.5rem; line-height: 2rem; }     /* 24px */
.text-3xl { font-size: 1.875rem; line-height: 2.25rem; } /* 30px */

/* Desktop */
@media (min-width: 768px) {
  .text-xs { font-size: 0.75rem; line-height: 1rem; }
  .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
  .text-base { font-size: 1rem; line-height: 1.5rem; }
  .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
  .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
  .text-2xl { font-size: 1.5rem; line-height: 2rem; }
  .text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
  .text-4xl { font-size: 2.25rem; line-height: 2.5rem; } /* 36px */
  .text-5xl { font-size: 3rem; line-height: 1; }         /* 48px */
}
```

## 🧩 Базовые UI компоненты

### Button
```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

// Использование
<Button 
  variant="primary" 
  size="md" 
  fullWidth 
  loading={isLoading}
  onClick={handleSubmit}
>
  Сохранить
</Button>
```

### Input
```typescript
interface InputProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  type?: 'text' | 'email' | 'tel' | 'number' | 'password';
  icon?: React.ReactNode;
  multiline?: boolean;
  rows?: number;
}

// Использование
<Input
  label="Телефон клиента"
  placeholder="+7 (999) 123-45-67"
  value={phone}
  onChange={setPhone}
  error={phoneError}
  type="tel"
  icon={<PhoneIcon />}
/>
```

### Card
```typescript
interface CardProps {
  children: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  border?: boolean;
  rounded?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

// Использование
<Card padding="md" shadow="md" rounded="lg">
  <CardHeader>
    <CardTitle>Информация о заказе</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Контент */}
  </CardContent>
</Card>
```

### Badge
```typescript
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  rounded?: boolean;
}

// Использование для статусов заказов
<Badge variant="success" size="sm">выдан</Badge>
<Badge variant="warning" size="sm">в_работе</Badge>
<Badge variant="error" size="sm">новый</Badge>
```

## 📄 Страничные компоненты

### 1. Dashboard (Главная страница)
```typescript
interface DashboardStats {
  orders: {
    new: number;
    inProgress: number;
    completed: number;
    totalToday: number;
  };
  finance: {
    cashToday: number;
    cashWeek: number;
    cashMonth: number;
    debtsTotal: number;
  };
  topMasters: Array<{
    masterId: string;
    masterName: string;
    ordersCompleted: number;
    revenue: number;
  }>;
  recentOrders: Array<{
    id: string;
    clientName: string;
    status: string;
    total: number;
    createdAt: string;
  }>;
}

// Компонент для директора/админа
const AdminDashboard: React.FC = () => {
  const { data: stats, isLoading } = useQuery('dashboard-stats', getDashboardStats);
  
  return (
    <div className="space-y-6">
      {/* Критичные метрики */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Новых заказов"
          value={stats?.orders.new}
          icon={<DocumentTextIcon />}
          trend="+12%"
          color="primary"
        />
        <MetricCard
          title="В работе"
          value={stats?.orders.inProgress}
          icon={<ClockIcon />}
          trend="+5%"
          color="warning"
        />
        <MetricCard
          title="Касса сегодня"
          value={formatCurrency(stats?.finance.cashToday)}
          icon={<CurrencyDollarIcon />}
          trend="+18%"
          color="success"
        />
        <MetricCard
          title="Долги"
          value={formatCurrency(stats?.finance.debtsTotal)}
          icon={<ExclamationIcon />}
          trend="-8%"
          color="error"
        />
      </div>

      {/* Kanban доска заказов */}
      <OrdersKanban />

      {/* Графики и топ мастера */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CashFlowChart period="week" />
        <TopMastersList masters={stats?.topMasters} />
      </div>
    </div>
  );
};

// Компонент для мастера
const MasterDashboard: React.FC = () => {
  const { data: myOrders } = useQuery('my-orders', getMyOrders);
  const { data: mySalary } = useQuery('my-salary', getMySalary);
  
  return (
    <div className="space-y-6">
      {/* Мои метрики */}
      <div className="grid grid-cols-2 gap-4">
        <MetricCard
          title="Мои заказы"
          value={myOrders?.length}
          icon={<WrenchIcon />}
          color="primary"
        />
        <MetricCard
          title="Моя зарплата"
          value={formatCurrency(mySalary?.currentWeek)}
          icon={<BanknotesIcon />}
          color="success"
        />
      </div>

      {/* Мои заказы */}
      <MyOrdersList orders={myOrders} />

      {/* Быстрые действия */}
      <QuickActions />
    </div>
  );
};
```

### 2. Заказы (Orders)
```typescript
// Список заказов
const OrdersList: React.FC = () => {
  const [filters, setFilters] = useState<OrderFilters>({});
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const { data: orders, isLoading } = useQuery(
    ['orders', filters, statusFilter],
    () => getOrders({ ...filters, status: statusFilter === 'all' ? undefined : statusFilter })
  );

  return (
    <div className="space-y-4">
      {/* Фильтры */}
      <OrdersFilters
        filters={filters}
        onFiltersChange={setFilters}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      {/* Поиск */}
      <SearchInput
        placeholder="Поиск по клиенту или заказу..."
        value={filters.search}
        onChange={(search) => setFilters({ ...filters, search })}
      />

      {/* Список с virtual scroll */}
      {isLoading ? (
        <OrdersListSkeleton />
      ) : (
        <VirtualizedList
          items={orders}
          renderItem={(order) => (
            <OrderCard
              key={order.id}
              order={order}
              onEdit={() => navigate(`/orders/${order.id}`)}
              onStatusChange={(status) => updateOrderStatus(order.id, status)}
            />
          )}
          itemHeight={120}
        />
      )}

      {/* FAB для создания заказа */}
      <Fab
        icon={<PlusIcon />}
        onClick={() => navigate('/orders/new')}
        position="bottom-right"
      />
    </div>
  );
};

// Карточка заказа
const OrderCard: React.FC<OrderCardProps> = ({ order, onEdit, onStatusChange }) => {
  return (
    <Card padding="md" shadow="sm" className="mb-3">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-semibold text-lg">{order.id}</h3>
          <p className="text-gray-600">{order.client.name}</p>
          <p className="text-sm text-gray-500">{order.client.car1}</p>
        </div>
        <Badge variant={getStatusVariant(order.status)} size="sm">
          {order.status}
        </Badge>
      </div>

      <div className="flex justify-between items-center">
        <div className="text-lg font-semibold">
          {formatCurrency(order.total)}
        </div>
        <div className="flex space-x-2">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <PencilIcon className="w-4 h-4" />
          </Button>
          <StatusDropdown
            currentStatus={order.status}
            onStatusChange={onStatusChange}
          />
        </div>
      </div>

      {/* Мастера */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="flex flex-wrap gap-2">
          {order.masters.map((master) => (
            <Badge key={master.id} variant="secondary" size="sm">
              {master.name} ({master.percent}%)
            </Badge>
          ))}
        </div>
      </div>
    </Card>
  );
};

// Форма создания/редактирования заказа
const OrderForm: React.FC = () => {
  const { id } = useParams();
  const isEdit = !!id;
  
  const { control, handleSubmit, watch, setValue } = useForm<OrderFormData>();
  const selectedServices = watch('services') || [];
  
  return (
    <div className="space-y-6">
      <Header
        title={isEdit ? `Заказ ${id}` : 'Новый заказ'}
        backButton
        rightAction={
          <Button type="submit" form="order-form" loading={isSubmitting}>
            Сохранить
          </Button>
        }
      />

      <form id="order-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Клиент */}
        <Card>
          <CardHeader>
            <CardTitle>Клиент</CardTitle>
          </CardHeader>
          <CardContent>
            <ClientSelector
              value={watch('clientId')}
              onChange={(clientId) => setValue('clientId', clientId)}
              onClientCreate={handleClientCreate}
            />
          </CardContent>
        </Card>

        {/* Услуги */}
        <Card>
          <CardHeader>
            <CardTitle>Услуги</CardTitle>
          </CardHeader>
          <CardContent>
            <ServicesSelector
              value={selectedServices}
              onChange={(services) => setValue('services', services)}
            />
            <div className="mt-4 text-right">
              <div className="text-lg font-semibold">
                Итого: {formatCurrency(calculateServicesTotal(selectedServices))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Запчасти */}
        <Card>
          <CardHeader>
            <CardTitle>Запчасти</CardTitle>
          </CardHeader>
          <CardContent>
            <Controller
              name="partsCost"
              control={control}
              render={({ field }) => (
                <Input
                  label="Стоимость запчастей"
                  type="number"
                  placeholder="0"
                  {...field}
                />
              )}
            />
          </CardContent>
        </Card>

        {/* Мастера */}
        <Card>
          <CardHeader>
            <CardTitle>Мастера</CardTitle>
          </CardHeader>
          <CardContent>
            <MastersSelector
              value={watch('masters')}
              onChange={(masters) => setValue('masters', masters)}
            />
          </CardContent>
        </Card>

        {/* Статус */}
        <Card>
          <CardHeader>
            <CardTitle>Статус</CardTitle>
          </CardHeader>
          <CardContent>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <StatusSelector {...field} />
              )}
            />
          </CardContent>
        </Card>

        {/* Примечания */}
        <Card>
          <CardHeader>
            <CardTitle>Примечания</CardTitle>
          </CardHeader>
          <CardContent>
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <Input
                  multiline
                  rows={3}
                  placeholder="Дополнительная информация..."
                  {...field}
                />
              )}
            />
          </CardContent>
        </Card>
      </form>
    </div>
  );
};
```

### 3. Магазин запчастей
```typescript
const PartsSalesList: React.FC = () => {
  const { data: sales, isLoading } = useQuery('parts-sales', getPartsSales);
  
  return (
    <div className="space-y-4">
      <Header
        title="Продажи запчастей"
        rightAction={
          <Button onClick={() => navigate('/parts-sales/new')}>
            <PlusIcon className="w-4 h-4 mr-2" />
            Продажа
          </Button>
        }
      />

      {/* Фильтры */}
      <PartsSalesFilters />

      {/* Список продаж */}
      {isLoading ? (
        <PartsSalesListSkeleton />
      ) : (
        <div className="space-y-3">
          {sales.map((sale) => (
            <PartsSaleCard
              key={sale.id}
              sale={sale}
              onEdit={() => navigate(`/parts-sales/${sale.id}/edit`)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const PartsSaleForm: React.FC = () => {
  const { control, handleSubmit, watch } = useForm<PartsSaleFormData>();
  
  return (
    <div className="space-y-6">
      <Header
        title="Новая продажа запчастей"
        backButton
        rightAction={
          <Button type="submit" form="parts-sale-form" loading={isSubmitting}>
            Сохранить
          </Button>
        }
      />

      <form id="parts-sale-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Клиент */}
        <Card>
          <CardHeader>
            <CardTitle>Клиент</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Controller
              name="clientName"
              control={control}
              render={({ field }) => (
                <Input
                  label="Имя клиента"
                  placeholder="Иван Иванов"
                  {...field}
                />
              )}
            />
            <Controller
              name="clientPhone"
              control={control}
              render={({ field }) => (
                <Input
                  label="Телефон"
                  type="tel"
                  placeholder="+7 (999) 123-45-67"
                  {...field}
                />
              )}
            />
          </CardContent>
        </Card>

        {/* Запчасть */}
        <Card>
          <CardHeader>
            <CardTitle>Запчасть</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Controller
              name="partName"
              control={control}
              render={({ field }) => (
                <Input
                  label="Название запчасти"
                  placeholder="Масляный фильтр Mann"
                  {...field}
                />
              )}
            />
            <Controller
              name="partNumber"
              control={control}
              render={({ field }) => (
                <Input
                  label="Артикул"
                  placeholder="HU716/2X"
                  {...field}
                />
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <Controller
                name="quantity"
                control={control}
                render={({ field }) => (
                  <Input
                    label="Количество"
                    type="number"
                    min="1"
                    {...field}
                  />
                )}
              />
              <Controller
                name="price"
                control={control}
                render={({ field }) => (
                  <Input
                    label="Цена за шт."
                    type="number"
                    min="0"
                    {...field}
                  />
                )}
              />
            </div>
            <Controller
              name="discount"
              control={control}
              render={({ field }) => (
                <Input
                  label="Скидка"
                  type="number"
                  min="0"
                  placeholder="0"
                  {...field}
                />
              )}
            />
          </CardContent>
        </Card>

        {/* Итого */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-right">
              <div className="text-lg font-semibold">
                Итого: {formatCurrency(calculateTotal(watch()))}
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};
```

### 4. Клиенты
```typescript
const ClientsList: React.FC = () => {
  const { data: clients, isLoading } = useQuery('clients', getClients);
  
  return (
    <div className="space-y-4">
      <Header
        title="Клиенты"
        rightAction={
          <Button onClick={() => navigate('/clients/new')}>
            <PlusIcon className="w-4 h-4 mr-2" />
            Клиент
          </Button>
        }
      />

      {/* Поиск */}
      <SearchInput
        placeholder="Поиск по имени или телефону..."
        onSearch={handleSearch}
      />

      {/* Список клиентов */}
      {isLoading ? (
        <ClientsListSkeleton />
      ) : (
        <VirtualizedList
          items={clients}
          renderItem={(client) => (
            <ClientCard
              key={client.id}
              client={client}
              onClick={() => navigate(`/clients/${client.id}`)}
            />
          )}
          itemHeight={100}
        />
      )}
    </div>
  );
};

const ClientCard: React.FC<ClientCardProps> = ({ client, onClick }) => {
  return (
    <Card padding="md" shadow="sm" className="mb-3 cursor-pointer" onClick={onClick}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{client.name}</h3>
          <p className="text-gray-600">{client.phone}</p>
          <div className="mt-2 space-y-1">
            {client.car1 && (
              <p className="text-sm text-gray-500">🚗 {client.car1}</p>
            )}
            {client.car2 && (
              <p className="text-sm text-gray-500">🚙 {client.car2}</p>
            )}
          </div>
        </div>
        {client.debtTotal > 0 && (
          <Badge variant="error" size="sm">
            Долг: {formatCurrency(client.debtTotal)}
          </Badge>
        )}
      </div>
    </Card>
  );
};
```

## 🔄 State Management (Zustand)

### Auth Store
```typescript
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithPhone: (phone: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  
  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const response = await authApi.login({ email, password });
      set({
        user: response.data.user,
        isAuthenticated: true,
        isLoading: false,
      });
      await SecureStore.setItemAsync('access_token', response.data.session.access_token);
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
  
  // ... другие методы
}));
```

### Orders Store
```typescript
interface OrdersState {
  orders: Order[];
  currentOrder: Order | null;
  filters: OrderFilters;
  isLoading: boolean;
  setOrders: (orders: Order[]) => void;
  setCurrentOrder: (order: Order | null) => void;
  setFilters: (filters: OrderFilters) => void;
  updateOrderStatus: (orderId: string, status: string) => Promise<void>;
  createOrder: (order: CreateOrderData) => Promise<void>;
}

const useOrdersStore = create<OrdersState>((set, get) => ({
  orders: [],
  currentOrder: null,
  filters: {},
  isLoading: false,
  
  setOrders: (orders) => set({ orders }),
  
  updateOrderStatus: async (orderId, status) => {
    try {
      await ordersApi.updateStatus(orderId, { status });
      const orders = get().orders.map(order =>
        order.id === orderId ? { ...order, status } : order
      );
      set({ orders });
    } catch (error) {
      console.error('Failed to update order status:', error);
      throw error;
    }
  },
  
  // ... другие методы
}));
```

## 📱 PWA Конфигурация

### Manifest
```json
{
  "name": "VIPauto CRM",
  "short_name": "VIPauto",
  "description": "CRM система для автосервиса VIPauto",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Service Worker
```typescript
// sw.ts
const CACHE_NAME = 'vipauto-crm-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});
```

## 🎭 Анимации и переходы

### Tailwind animations
```css
/* Для мобильных устройств */
@keyframes slideUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.animate-slide-up {
  animation: slideUp 0.3s ease-out;
}

.animate-fade-in {
  animation: fadeIn 0.2s ease-out;
}

/* Touch feedback */
.touch-feedback {
  transition: all 0.15s ease;
}

.touch-feedback:active {
  transform: scale(0.95);
  opacity: 0.8;
}
```

## 🔔 Push уведомления
```typescript
// Настройка push уведомлений
const setupPushNotifications = async () => {
  if ('Notification' in window && 'serviceWorker' in navigator) {
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: VAPID_PUBLIC_KEY
      });
      
      // Отправляем subscription на бэкенд
      await api.savePushSubscription(subscription);
    }
  }
};
```

Эта спецификация frontend компонентов обеспечивает мобильный-first подход с учетом всех требований CRM системы автосервиса VIPauto.