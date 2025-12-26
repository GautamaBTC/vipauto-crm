import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';

// Импортируем основные страницы (пока заглушки)
const Dashboard = React.lazy(() => import('@/pages/Dashboard'));
const OrdersList = React.lazy(() => import('@/pages/Orders/OrdersList'));
const OrderForm = React.lazy(() => import('@/pages/Orders/OrderForm'));
const ClientsList = React.lazy(() => import('@/pages/Clients/ClientsList'));
const ClientForm = React.lazy(() => import('@/pages/Clients/ClientForm'));
const PartsSales = React.lazy(() => import('@/pages/PartsSales/PartsSales'));
const PartsSaleForm = React.lazy(() => import('@/pages/PartsSales/PartsSaleForm'));
const Salaries = React.lazy(() => import('@/pages/Salaries/Salaries'));
const Profile = React.lazy(() => import('@/pages/Profile/Profile'));
const Login = React.lazy(() => import('@/pages/Auth/Login'));

// Создаем React Query клиент
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ReactQueryDevtools initialIsOpen={false} />
      
      <Router>
        <div className="min-h-screen bg-gray-50">
          {/* Навигация */}
          <nav className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex items-center">
                  <h1 className="text-xl font-bold text-blue-600">
                    🚗 VIPauto CRM
                  </h1>
                </div>
                
                <div className="hidden md:flex md:items-center md:space-x-8">
                  <a
                    href="/orders"
                    className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Заказы
                  </a>
                  <a
                    href="/clients"
                    className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Клиенты
                  </a>
                  <a
                    href="/parts-sales"
                    className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Запчасти
                  </a>
                  <a
                    href="/salaries"
                    className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Зарплаты
                  </a>
                  <a
                    href="/profile"
                    className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Профиль
                  </a>
                </div>
                
                {/* Мобильное меню */}
                <div className="md:hidden">
                  <button className="p-2 rounded-md text-gray-700 hover:text-blue-600">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m0 8h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </nav>

          {/* Основной контент */}
          <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/orders" element={<OrdersList />} />
              <Route path="/orders/new" element={<OrderForm />} />
              <Route path="/orders/:id" element={<OrderForm />} />
              <Route path="/clients" element={<ClientsList />} />
              <Route path="/clients/new" element={<ClientForm />} />
              <Route path="/clients/:id" element={<ClientForm />} />
              <Route path="/parts-sales" element={<PartsSales />} />
              <Route path="/parts-sales/new" element={<PartsSaleForm />} />
              <Route path="/salaries" element={<Salaries />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/login" element={<Login />} />
            </Routes>
          </main>
        </div>

        {/* Уведомления */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#3b82f6',
              color: '#ffffff',
            },
          }}
        />
      </Router>
    </QueryClientProvider>
  );
}

export default App;