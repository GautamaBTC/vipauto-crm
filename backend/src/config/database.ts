import { createClient } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';

// Supabase клиент для работы с базой данных
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    }
  }
);

// Supabase клиент для аутентификации (с anon key)
export const supabaseAuth = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true
    }
  }
);

// Функция подключения к базе данных
export async function connectDB(): Promise<void> {
  try {
    // Проверяем подключение к Supabase
    const { data, error } = await supabase
      .from('clients')
      .select('count')
      .limit(1);

    if (error) {
      throw new Error(`Ошибка подключения к Supabase: ${error.message}`);
    }

    logger.info('✅ Успешное подключение к Supabase', {
      url: process.env.SUPABASE_URL,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ Ошибка подключения к базе данных:', error);
    throw error;
  }
}

// Функция проверки здоровья базы данных
export async function checkDBHealth(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('clients')
      .select('count')
      .limit(1);

    return !error;
  } catch (error) {
    logger.error('Ошибка проверки здоровья БД:', error);
    return false;
  }
}

// Типы для Supabase
export interface Database {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string;
          name: string;
          phone: string | null;
          car1: string | null;
          car2: string | null;
          vin: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          phone?: string | null;
          car1?: string | null;
          car2?: string | null;
          vin?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          phone?: string | null;
          car1?: string | null;
          car2?: string | null;
          vin?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      services: {
        Row: {
          id: string;
          name: string;
          price: number;
          category: string | null;
          duration_minutes: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          price: number;
          category?: string | null;
          duration_minutes?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          price?: number;
          category?: string | null;
          duration_minutes?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          client_id: string | null;
          services: any[];
          parts_cost: number;
          services_cost: number;
          total: number;
          status: string;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id?: string | null;
          services?: any[];
          parts_cost?: number;
          services_cost?: number;
          status?: string;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string | null;
          services?: any[];
          parts_cost?: number;
          services_cost?: number;
          status?: string;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      // ... другие таблицы
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}