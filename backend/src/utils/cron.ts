import * as cron from 'node-cron';
import { supabase } from '@/config/database';
import { logger, logBusiness } from '@/utils/logger';

// Ежедневный расчет зарплат в 20:00
const salaryCalculationJob = cron.schedule('0 20 * * *', async () => {
  logger.info('Запуск ежедневного расчета зарплат');
  
  try {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Начало недели
    
    // Получаем все завершенные заказы за неделю
    const { data: completedOrders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        total,
        created_at,
        order_masters!inner(
          master_id,
          percent
        )
      `)
      .in('status', ['выдан', 'закрыт'])
      .gte('updated_at', weekStart.toISOString())
      .lte('updated_at', new Date().toISOString());

    if (ordersError) {
      logger.error('Ошибка получения заказов для расчета зарплат:', ordersError);
      return;
    }

    if (!completedOrders || completedOrders.length === 0) {
      logger.info('Нет завершенных заказов за неделю');
      return;
    }

    // Группируем по мастерам и считаем зарплаты
    const masterSalaries = new Map();
    
    for (const order of completedOrders) {
      if (order.order_masters) {
        for (const master of order.order_masters) {
          const currentSalary = masterSalaries.get(master.master_id) || 0;
          const orderSalary = order.total * (master.percent / 100);
          masterSalaries.set(master.master_id, currentSalary + orderSalary);
        }
      }
    }

    // Вставляем или обновляем зарплаты
    for (const [masterId, salaryAmount] of masterSalaries.entries()) {
      const { data: existingSalary, error: salaryError } = await supabase
        .from('salaries')
        .select('id')
        .eq('master_id', masterId)
        .eq('week_period', weekStart.toISOString().split('T')[0])
        .single();

      if (salaryError && salaryError.code !== 'PGRST116') {
        logger.error(`Ошибка проверки зарплаты мастера ${masterId}:`, salaryError);
        continue;
      }

      if (existingSalary) {
        // Обновляем существующую зарплату
        const { error: updateError } = await supabase
          .from('salaries')
          .update({
            amount: salaryAmount,
            week_period: weekStart.toISOString().split('T')[0]
          })
          .eq('id', existingSalary.id);

        if (updateError) {
          logger.error(`Ошибка обновления зарплаты мастера ${masterId}:`, updateError);
        } else {
          logBusiness(`Зарплата мастера ${masterId} обновлена`, masterId, { 
            amount: salaryAmount,
            week_period: weekStart.toISOString().split('T')[0]
          });
        }
      } else {
        // Создаем новую зарплату
        const { error: insertError } = await supabase
          .from('salaries')
          .insert({
            master_id: masterId,
            amount: salaryAmount,
            week_period: weekStart.toISOString().split('T')[0]
          });

        if (insertError) {
          logger.error(`Ошибка создания зарплаты мастера ${masterId}:`, insertError);
        } else {
          logBusiness(`Зарплата мастера ${masterId} создана`, masterId, { 
            amount: salaryAmount,
            week_period: weekStart.toISOString().split('T')[0]
          });
        }
      }
    }

    logger.info(`Расчет зарплат завершен. Обработано мастеров: ${masterSalaries.size}`);
    
  } catch (error) {
    logger.error('Ошибка в cron задаче расчета зарплат:', error);
  }
}, {
  scheduled: true,
  timezone: 'Europe/Moscow'
});

// Еженедельная очистка старых уведомлений
const notificationCleanupJob = cron.schedule('0 2 * * 0', async () => {
  logger.info('Запуск очистки старых уведомлений');
  
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { error } = await supabase
      .from('notifications')
      .delete()
      .lt('created_at', thirtyDaysAgo.toISOString())
      .eq('read', true);

    if (error) {
      logger.error('Ошибка очистки уведомлений:', error);
    } else {
      logger.info('Старые уведомления успешно удалены');
    }
    
  } catch (error) {
    logger.error('Ошибка в cron задаче очистки уведомлений:', error);
  }
}, {
  scheduled: true,
  timezone: 'Europe/Moscow'
});

// Ежедневное обновление статистики
const statsUpdateJob = cron.schedule('0 21 * * *', async () => {
  logger.info('Запуск обновления статистики');
  
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Получаем статистику за сегодня
    const { data: ordersStats, error: statsError } = await supabase
      .from('orders')
      .select('status')
      .gte('created_at', today);

    if (statsError) {
      logger.error('Ошибка получения статистики:', statsError);
      return;
    }

    const stats = {
      total: ordersStats?.length || 0,
      new: ordersStats?.filter(o => o.status === 'новый').length || 0,
      in_progress: ordersStats?.filter(o => ['принял', 'диагностика', 'в_работе', 'ожидание_деталей'].includes(o.status)).length || 0,
      completed: ordersStats?.filter(o => ['готово', 'ожидание_оплаты', 'выдан', 'закрыт'].includes(o.status)).length || 0
    };

    // Здесь можно сохранить статистику в отдельную таблицу или кеш
    logBusiness('Ежедневная статистика обновлена', undefined, stats);
    
  } catch (error) {
    logger.error('Ошибка в cron задаче обновления статистики:', error);
  }
}, {
  scheduled: true,
  timezone: 'Europe/Moscow'
});

// Ежемесячная архивация старых данных
const dataArchivingJob = cron.schedule('0 3 1 * *', async () => {
  logger.info('Запуск ежемесячной архивации данных');
  
  try {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    // Архивация старых уведомлений
    const { error: notificationsError } = await supabase
      .from('notifications')
      .delete()
      .lt('created_at', threeMonthsAgo.toISOString());

    if (notificationsError) {
      logger.error('Ошибка архивации уведомлений:', notificationsError);
    }

    // Архивация старых логов (если есть таблица логов)
    // const { error: logsError } = await supabase
    //   .from('system_logs')
    //   .delete()
    //   .lt('created_at', threeMonthsAgo.toISOString());

    logger.info('Архивация данных завершена');
    
  } catch (error) {
    logger.error('Ошибка в cron задаче архивации:', error);
  }
}, {
  scheduled: true,
  timezone: 'Europe/Moscow'
});

// Функция для запуска всех cron задач
export function setupCronJobs(): void {
  logger.info('Настройка cron задач');
  
  // Запускаем все задачи
  salaryCalculationJob.start();
  notificationCleanupJob.start();
  statsUpdateJob.start();
  dataArchivingJob.start();
  
  logger.info('Cron задачи успешно запущены');
}

// Функция для остановки всех cron задач
export function stopCronJobs(): void {
  logger.info('Остановка cron задач');
  
  salaryCalculationJob.stop();
  notificationCleanupJob.stop();
  statsUpdateJob.stop();
  dataArchivingJob.stop();
  
  logger.info('Cron задачи остановлены');
}

// Функция для ручного запуска расчета зарплат
export async function triggerSalaryCalculation(): Promise<void> {
  logger.info('Ручной запуск расчета зарплат');
  
  try {
    await salaryCalculationJob.invoke();
    logger.info('Ручной расчет зарплат завершен');
  } catch (error) {
    logger.error('Ошибка ручного расчета зарплат:', error);
    throw error;
  }
}

// Функция для получения статуса cron задач
export function getCronJobsStatus(): any {
  return {
    salaryCalculation: salaryCalculationJob.running,
    notificationCleanup: notificationCleanupJob.running,
    statsUpdate: statsUpdateJob.running,
    dataArchiving: dataArchivingJob.running
  };
}

// Обработка завершения процесса
process.on('SIGTERM', () => {
  logger.info('SIGTERM получен, остановка cron задач');
  stopCronJobs();
});

process.on('SIGINT', () => {
  logger.info('SIGINT получен, остановка cron задач');
  stopCronJobs();
});