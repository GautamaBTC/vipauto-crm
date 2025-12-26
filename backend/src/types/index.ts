// Типы для API запросов и ответов
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginationResponse {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PaginatedResponse<T> extends ApiResponse<{
  items: T[];
  pagination: PaginationResponse;
}> {}

// Типы пользователей
export interface User {
  id: string;
  email: string;
  role: 'master' | 'admin' | 'director';
  full_name?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  role: 'master' | 'admin' | 'director';
  full_name?: string;
  phone?: string;
}

export interface UpdateUserData {
  email?: string;
  role?: 'master' | 'admin' | 'director';
  full_name?: string;
  phone?: string;
}

// Типы клиентов
export interface Client {
  id: string;
  name: string;
  phone?: string;
  car1?: string;
  car2?: string;
  vin?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  debt_total?: number;
}

export interface CreateClientData {
  name: string;
  phone?: string;
  car1?: string;
  car2?: string;
  vin?: string;
  notes?: string;
}

export interface UpdateClientData {
  name?: string;
  phone?: string;
  car1?: string;
  car2?: string;
  vin?: string;
  notes?: string;
}

// Типы услуг
export interface Service {
  id: string;
  name: string;
  price: number;
  category?: string;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateServiceData {
  name: string;
  price: number;
  category?: string;
  duration_minutes?: number;
  is_active?: boolean;
}

export interface UpdateServiceData {
  name?: string;
  price?: number;
  category?: string;
  duration_minutes?: number;
  is_active?: boolean;
}

// Типы заказов
export interface OrderService {
  service_id: string;
  qty: number;
  price: number;
  name?: string;
}

export interface OrderMaster {
  id: string;
  order_id: string;
  master_id: string;
  master_name?: string;
  percent: number;
  created_at: string;
}

export interface Order {
  id: string;
  client_id?: string;
  client?: Client;
  services: OrderService[];
  parts_cost: number;
  services_cost: number;
  total: number;
  status: 'новый' | 'принял' | 'диагностика' | 'в_работе' | 'ожидание_деталей' | 'готово' | 'ожидание_оплаты' | 'выдан' | 'закрыт';
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  masters?: OrderMaster[];
}

export interface CreateOrderData {
  client_id?: string;
  services: OrderService[];
  parts_cost?: number;
  masters?: Array<{
    master_id: string;
    percent: number;
  }>;
  status?: Order['status'];
  notes?: string;
}

export interface UpdateOrderData {
  client_id?: string;
  services?: OrderService[];
  parts_cost?: number;
  status?: Order['status'];
  notes?: string;
}

export interface OrderFilters {
  my?: boolean;
  status?: string;
  client_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

// Типы продаж запчастей
export interface PartsSale {
  id: string;
  client_name?: string;
  client_phone?: string;
  client_id?: string;
  client?: Client;
  part_name: string;
  part_number?: string;
  quantity: number;
  price: number;
  discount: number;
  total: number;
  seller_id?: string;
  seller?: User;
  notes?: string;
  created_at: string;
}

export interface CreatePartsSaleData {
  client_name?: string;
  client_phone?: string;
  client_id?: string;
  part_name: string;
  part_number?: string;
  quantity: number;
  price: number;
  discount?: number;
  notes?: string;
}

export interface UpdatePartsSaleData {
  client_name?: string;
  client_phone?: string;
  client_id?: string;
  part_name?: string;
  part_number?: string;
  quantity?: number;
  price?: number;
  discount?: number;
  notes?: string;
}

export interface PartsSaleFilters {
  date_from?: string;
  date_to?: string;
  seller_id?: string;
  client_phone?: string;
  search?: string;
}

// Типы долгов
export interface Debt {
  id: string;
  client_id: string;
  client?: Client;
  order_id?: string;
  order?: Order;
  amount: number;
  remaining: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDebtData {
  client_id: string;
  order_id?: string;
  amount: number;
  notes?: string;
}

export interface UpdateDebtData {
  client_id?: string;
  order_id?: string;
  amount?: number;
  remaining?: number;
  notes?: string;
}

// Типы оплат
export interface Payment {
  id: string;
  order_id?: string;
  order?: Order;
  parts_sale_id?: string;
  parts_sale?: PartsSale;
  debt_id?: string;
  debt?: Debt;
  amount: number;
  type: 'наличные' | 'карта' | 'перевод' | 'терминал';
  notes?: string;
  created_by?: string;
  created_at: string;
}

export interface CreatePaymentData {
  order_id?: string;
  parts_sale_id?: string;
  debt_id?: string;
  amount: number;
  type: Payment['type'];
  notes?: string;
}

export interface PaymentFilters {
  date_from?: string;
  date_to?: string;
  type?: string;
  order_id?: string;
  client_id?: string;
}

// Типы зарплат
export interface Salary {
  id: string;
  master_id: string;
  master?: User;
  order_id?: string;
  order?: Order;
  amount: number;
  paid: boolean;
  paid_at?: string;
  week_period: string;
  notes?: string;
  created_at: string;
}

export interface CreateSalaryData {
  master_id: string;
  order_id?: string;
  amount: number;
  week_period: string;
  notes?: string;
}

export interface UpdateSalaryData {
  master_id?: string;
  order_id?: string;
  amount?: number;
  paid?: boolean;
  paid_at?: string;
  week_period?: string;
  notes?: string;
}

export interface SalaryFilters {
  master_id?: string;
  week_period?: string;
  paid?: boolean;
  my?: boolean;
  date_from?: string;
  date_to?: string;
}

// Типы бонусов
export interface Bonus {
  id: string;
  director_id: string;
  director?: User;
  order_id?: string;
  order?: Order;
  amount: number;
  comment?: string;
  created_at: string;
}

export interface CreateBonusData {
  order_id?: string;
  amount: number;
  comment?: string;
}

export interface UpdateBonusData {
  order_id?: string;
  amount?: number;
  comment?: string;
}

export interface BonusFilters {
  director_id?: string;
  date_from?: string;
  date_to?: string;
}

// Типы уведомлений
export interface Notification {
  id: string;
  user_id: string;
  user?: User;
  title: string;
  message?: string;
  type?: string;
  entity_id?: string;
  entity_type?: string;
  read: boolean;
  created_at: string;
}

export interface CreateNotificationData {
  user_id: string;
  title: string;
  message?: string;
  type?: string;
  entity_id?: string;
  entity_type?: string;
}

export interface UpdateNotificationData {
  read?: boolean;
}

// Типы для статистики
export interface DashboardStats {
  orders: {
    new: number;
    in_progress: number;
    completed: number;
    total_today: number;
  };
  finance: {
    cash_today: number;
    cash_week: number;
    cash_month: number;
    debts_total: number;
  };
  top_masters: Array<{
    master_id: string;
    master_name: string;
    orders_completed: number;
    revenue: number;
  }>;
  recent_orders: Array<{
    id: string;
    client_name: string;
    status: string;
    total: number;
    created_at: string;
  }>;
}

export interface CashflowData {
  period: string;
  dates: string[];
  revenue: number[];
  expenses: number[];
  profit: number[];
}

export interface MasterStats {
  masters: Array<{
    master_id: string;
    master_name: string;
    orders_count: number;
    revenue: number;
    salary: number;
    efficiency: number;
  }>;
  summary: {
    total_orders: number;
    total_revenue: number;
    total_salary: number;
  };
}

export interface StatsFilters {
  period?: 'day' | 'week' | 'month' | 'year';
  date_from?: string;
  date_to?: string;
  master_id?: string;
}

// Типы для аутентификации
export interface LoginData {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: string;
  };
}

export interface GoogleLoginData {
  id_token: string;
}

export interface PhoneLoginData {
  phone: string;
}

export interface PhoneVerifyData {
  phone: string;
  code: string;
}

export interface RegisterData {
  email: string;
  password: string;
  full_name?: string;
  phone?: string;
}

// Типы для JWT
export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

// Типы для запросов
export interface AuthenticatedRequest extends Request {
  user?: User;
}

// Типы для ошибок
export interface ValidationErrorDetail {
  field: string;
  message: string;
  value?: any;
}

// Типы для кеширования
export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache tags for invalidation
}

// Типы для файлов
export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
}

// Типы для экспорта
export interface ExportOptions {
  format: 'csv' | 'excel' | 'pdf';
  date_from?: string;
  date_to?: string;
  filters?: any;
}

// Типы для поиска
export interface SearchParams {
  query?: string;
  fields?: string[];
  limit?: number;
  offset?: number;
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  query: string;
}

// Типы для сортировки
export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

// Типы для фильтрации
export interface FilterParams {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'not_in';
  value: any;
}