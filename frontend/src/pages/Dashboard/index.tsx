import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  CarIcon, 
  CurrencyDollarIcon, 
  UserGroupIcon, 
  DocumentTextIcon,
  ClockIcon,
  ChartBarIcon,
  WrenchIcon
} from '@heroicons/react/24/outline';

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

const Dashboard: React.FC = () => {
  // Получаем статистику дашборда
  const { data: stats, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await fetch('/api/stats/dashboard');
      if (!response.ok) {
        throw new Error('Ошибка загрузки статистики');
      }
      return response.json();
    },
    refetchInterval: 30000, // Обновляем каждые 30 секунд
  });

  // Форматирование чисел
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600 text-center">
          <p>Ошибка загрузки данных</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Дашборд
        </h1>
        
        {/* Ключевые метрики */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-blue-50 rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-600 rounded-full">
                <DocumentTextIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-blue-600">
                {stats?.orders.new || 0}
              </p>
              <p className="text-sm text-gray-600">
                Новых заказов
              </p>
            </div>
          </div>

          <div className="bg-yellow-50 rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-600 rounded-full">
                <ClockIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-yellow-600">
                {stats?.orders.inProgress || 0}
              </p>
              <p className="text-sm text-gray-600">
                В работе
              </p>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-600 rounded-full">
                <ChartBarIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-green-600">
                {stats?.orders.completed || 0}
              </p>
              <p className="text-sm text-gray-600">
                Выполнено
              </p>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-600 rounded-full">
                <WrenchIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-purple-600">
                {stats?.orders.totalToday || 0}
              </p>
              <p className="text-sm text-gray-600">
                Всего за сегодня
              </p>
            </div>
          </div>
        </div>

        {/* Финансовые метрики */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="flex items-center mb-4">
              <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(stats?.finance.cashToday || 0)}
              </p>
              <p className="text-sm text-gray-600">
                Касса сегодня
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="flex items-center mb-4">
              <CurrencyDollarIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(stats?.finance.cashWeek || 0)}
              </p>
              <p className="text-sm text-gray-600">
                Касса за неделю
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="flex items-center mb-4">
              <CurrencyDollarIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(stats?.finance.cashMonth || 0)}
              </p>
              <p className="text-sm text-gray-600">
                Касса за месяц
              </p>
            </div>
          </div>

          <div className="bg-red-50 rounded-lg p-6 border border-red-200">
            <div className="flex items-center mb-4">
              <CurrencyDollarIcon className="h-8 w-8 text-red-600" />
            </div>
            <div>
              <p className="text-lg font-semibold text-red-600">
                {formatCurrency(stats?.finance.debtsTotal || 0)}
              </p>
              <p className="text-sm text-gray-600">
                Общая сумма долгов
              </p>
            </div>
          </div>
        </div>

        {/* Топ мастера */}
        {stats?.topMasters && stats.topMasters.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Топ мастера за неделю
            </h2>
            <div className="space-y-3">
              {stats.topMasters.map((master, index) => (
                <div key={master.masterId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <UserGroupIcon className="h-6 w-6 text-gray-400" />
                    <div className="ml-3">
                      <p className="font-semibold text-gray-900">
                        {master.masterName}
                      </p>
                      <p className="text-sm text-gray-600">
                        {master.ordersCompleted} заказов
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(master.revenue)}
                    </p>
                    <p className="text-sm text-gray-600">
                      Выручка
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Последние заказы */}
        {stats?.recentOrders && stats.recentOrders.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Последние заказы
            </h2>
            <div className="space-y-3">
              {stats.recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {order.id}
                    </p>
                    <p className="text-sm text-gray-600">
                      {order.clientName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">
                      {formatCurrency(order.total)}
                    </p>
                    <div className={`inline-block px-2 py-1 text-xs rounded-full ${
                      order.status === 'новый' ? 'bg-red-100 text-red-800' :
                      order.status === 'в_работе' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'готово' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;