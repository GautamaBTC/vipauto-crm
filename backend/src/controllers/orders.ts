import { Request, Response } from 'express';
import { supabase } from '@/config/database';
import { 
  asyncHandler, 
  ValidationError, 
  NotFoundError, 
  ConflictError 
} from '@/middleware/errorHandler';
import { 
  Order, 
  CreateOrderData, 
  UpdateOrderData, 
  OrderFilters,
  ApiResponse,
  PaginatedResponse,
  PaginationParams
} from '@/types';
import { logger, logBusiness } from '@/utils/logger';

// Получение списка заказов
export const getOrders = asyncHandler(async (req: Request, res: Response) => {
  const {
    page = 1,
    limit = 20,
    my = false,
    status,
    client_id,
    date_from,
    date_to,
    search
  } = req.query as OrderFilters;

  const offset = (page - 1) * limit;

  try {
    let query = supabase
      .from('orders')
      .select(`
        *,
        client:clients(name, phone, car1, car2),
        order_masters!inner(
          master_id,
          percent,
          users!inner(full_name, phone)
        )
      `);

    // Применяем фильтры
    if (req.user?.role !== 'director' && req.user?.role !== 'admin') {
      if (my === 'true') {
        // Мастера видят только свои заказы
        query = query.in('id', 
          supabase
            .from('order_masters')
            .select('order_id')
            .eq('master_id', req.user.id)
        );
      }
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (client_id) {
      query = query.eq('client_id', client_id);
    }

    if (date_from) {
      query = query.gte('created_at', date_from);
    }

    if (date_to) {
      query = query.lte('created_at', date_to);
    }

    if (search) {
      query = query.or(`
        id.ilike.%${search}%, 
        client.name.ilike.%${search}%,
        client.phone.ilike.%${search}%
      `);
    }

    // Получаем общее количество для пагинации
    const { count, error: countError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: false });

    if (countError) {
      throw new Error('Ошибка получения количества заказов');
    }

    // Получаем данные
    const { data: orders, error } = await query
      .range(offset, limit)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Ошибка получения заказов: ${error.message}`);
    }

    const totalPages = Math.ceil(count / limit);

    res.json({
      success: true,
      data: {
        items: orders || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: totalPages
        }
      }
    } as PaginatedResponse<Order>);
  } catch (error) {
    logger.error('Ошибка получения списка заказов:', error);
    throw new Error('Внутренняя ошибка сервера');
  }
});

// Получение заказа по ID
export const getOrderById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw new ValidationError('ID заказа обязателен');
  }

  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        client:clients(name, phone, car1, car2, vin, notes),
        order_masters!inner(
          master_id,
          percent,
          users!inner(full_name, phone)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError('Заказ не найден');
      }
      throw new Error(`Ошибка получения заказа: ${error.message}`);
    }

    res.json({
      success: true,
      data: order
    } as ApiResponse<Order>);
  } catch (error) {
    logger.error('Ошибка получения заказа:', error);
    throw new Error('Внутренняя ошибка сервера');
  }
});

// Создание нового заказа
export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const orderData: CreateOrderData = req.body;

  // Валидация обязательных полей
  if (!orderData.services || orderData.services.length === 0) {
    throw new ValidationError('Услуги обязательны');
  }

  if (!orderData.masters || orderData.masters.length === 0) {
    throw new ValidationError('Мастера обязательны');
  }

  // Проверяем проценты мастеров
  const totalPercentage = orderData.masters.reduce((sum, master) => sum + master.percent, 0);
  if (Math.abs(totalPercentage - 100) > 0.01) {
    throw new ValidationError('Сумма процентов мастеров должна быть равна 100%');
  }

  try {
    // Рассчитываем стоимость услуг
    const servicesCost = orderData.services.reduce((sum, service) => 
      sum + (service.price * service.qty), 0
    );

    // Создаем заказ
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        client_id: orderData.client_id,
        services: orderData.services,
        parts_cost: orderData.parts_cost || 0,
        services_cost,
        status: orderData.status || 'новый',
        notes: orderData.notes,
        created_by: req.user?.id
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new ConflictError('Заказ с таким ID уже существует');
      }
      throw new Error(`Ошибка создания заказа: ${error.message}`);
    }

    // Добавляем мастеров к заказу
    if (orderData.masters && orderData.masters.length > 0) {
      const masterInserts = orderData.masters.map(master => ({
        order_id: order.id,
        master_id: master.master_id,
        percent: master.percent
      }));

      const { error: mastersError } = await supabase
        .from('order_masters')
        .insert(masterInserts);

      if (mastersError) {
        throw new Error(`Ошибка добавления мастеров: ${mastersError.message}`);
      }
    }

    logBusiness('Создан новый заказ', req.user?.id, { 
      orderId: order.id,
      clientId: orderData.client_id,
      total: order.total
    });

    // Получаем созданный заказ с мастерами
    const { data: fullOrder, error: fetchError } = await supabase
      .from('orders')
      .select(`
        *,
        client:clients(name, phone, car1, car2),
        order_masters!inner(
          master_id,
          percent,
          users!inner(full_name, phone)
        )
      `)
      .eq('id', order.id)
      .single();

    if (fetchError) {
      throw new Error(`Ошибка получения созданного заказа: ${fetchError.message}`);
    }

    res.status(201).json({
      success: true,
      data: fullOrder
    } as ApiResponse<Order>);
  } catch (error) {
    logger.error('Ошибка создания заказа:', error);
    throw new Error('Внутренняя ошибка сервера');
  }
});

// Обновление заказа
export const updateOrder = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData: UpdateOrderData = req.body;

  if (!id) {
    throw new ValidationError('ID заказа обязателен');
  }

  try {
    // Проверяем существование заказа
    const { data: existingOrder, error: checkError } = await supabase
      .from('orders')
      .select('id, status')
      .eq('id', id)
      .single();

    if (checkError) {
      throw new NotFoundError('Заказ не найден');
    }

    // Обновляем основные поля
    const { data: order, error } = await supabase
      .from('orders')
      .update({
        client_id: updateData.client_id,
        services: updateData.services,
        parts_cost: updateData.parts_cost,
        services_cost: updateData.services ? 
          updateData.services.reduce((sum, service) => sum + (service.price * service.qty), 0) :
          existingOrder.services_cost,
        status: updateData.status,
        notes: updateData.notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Ошибка обновления заказа: ${error.message}`);
    }

    // Обновляем мастеров если нужно
    if (updateData.masters && updateData.masters.length > 0) {
      // Удаляем старых мастеров
      await supabase
        .from('order_masters')
        .delete()
        .eq('order_id', id);

      // Добавляем новых мастеров
      const masterInserts = updateData.masters.map(master => ({
        order_id: id,
        master_id: master.master_id,
        percent: master.percent
      }));

      const { error: mastersError } = await supabase
        .from('order_masters')
        .insert(masterInserts);

      if (mastersError) {
        throw new Error(`Ошибка обновления мастеров: ${mastersError.message}`);
      }
    }

    logBusiness('Заказ обновлен', req.user?.id, { 
      orderId: id,
      oldStatus: existingOrder.status,
      newStatus: updateData.status
    });

    // Получаем обновленный заказ
    const { data: fullOrder, error: fetchError } = await supabase
      .from('orders')
      .select(`
        *,
        client:clients(name, phone, car1, car2),
        order_masters!inner(
          master_id,
          percent,
          users!inner(full_name, phone)
        )
      `)
      .eq('id', id)
      .single();

    if (fetchError) {
      throw new Error(`Ошибка получения обновленного заказа: ${fetchError.message}`);
    }

    res.json({
      success: true,
      data: fullOrder
    } as ApiResponse<Order>);
  } catch (error) {
    logger.error('Ошибка обновления заказа:', error);
    throw new Error('Внутренняя ошибка сервера');
  }
});

// Обновление статуса заказа
export const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!id) {
    throw new ValidationError('ID заказа обязателен');
  }

  if (!status) {
    throw new ValidationError('Статус обязателен');
  }

  const validStatuses = [
    'новый', 'принял', 'диагностика', 'в_работе', 
    'ожидание_деталей', 'готово', 'ожидание_оплаты', 'выдан', 'закрыт'
  ];

  if (!validStatuses.includes(status)) {
    throw new ValidationError('Неверный статус');
  }

  try {
    const { data: order, error } = await supabase
      .from('orders')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Ошибка обновления статуса: ${error.message}`);
    }

    logBusiness('Статус заказа изменен', req.user?.id, { 
      orderId: id,
      newStatus: status
    });

    res.json({
      success: true,
      data: order
    } as ApiResponse<Order>);
  } catch (error) {
    logger.error('Ошибка обновления статуса заказа:', error);
    throw new Error('Внутренняя ошибка сервера');
  }
});

// Обновление распределения мастеров
export const updateOrderMasters = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { masters } = req.body;

  if (!id) {
    throw new ValidationError('ID заказа обязателен');
  }

  if (!masters || masters.length === 0) {
    throw new ValidationError('Мастера обязательны');
  }

  // Проверяем проценты
  const totalPercentage = masters.reduce((sum, master) => sum + master.percent, 0);
  if (Math.abs(totalPercentage - 100) > 0.01) {
    throw new ValidationError('Сумма процентов мастеров должна быть равна 100%');
  }

  try {
    // Удаляем старых мастеров
    await supabase
      .from('order_masters')
      .delete()
      .eq('order_id', id);

    // Добавляем новых мастеров
    const masterInserts = masters.map(master => ({
      order_id: id,
      master_id: master.master_id,
      percent: master.percent
    }));

    const { error } = await supabase
      .from('order_masters')
      .insert(masterInserts);

    if (error) {
      throw new Error(`Ошибка обновления мастеров: ${error.message}`);
    }

    logBusiness('Распределение мастеров обновлено', req.user?.id, { 
      orderId: id,
      mastersCount: masters.length
    });

    res.json({
      success: true,
      data: { message: 'Распределение мастеров обновлено' }
    } as ApiResponse);
  } catch (error) {
    logger.error('Ошибка обновления мастеров:', error);
    throw new Error('Внутренняя ошибка сервера');
  }
});

// Удаление заказа
export const deleteOrder = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw new ValidationError('ID заказа обязателен');
  }

  try {
    // Проверяем права на удаление
    if (req.user?.role !== 'director' && req.user?.role !== 'admin') {
      throw new ValidationError('Только директор и админ могут удалять заказы');
    }

    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Ошибка удаления заказа: ${error.message}`);
    }

    logBusiness('Заказ удален', req.user?.id, { orderId: id });

    res.json({
      success: true,
      data: { message: 'Заказ успешно удален' }
    } as ApiResponse);
  } catch (error) {
    logger.error('Ошибка удаления заказа:', error);
    throw new Error('Внутренняя ошибка сервера');
  }
});