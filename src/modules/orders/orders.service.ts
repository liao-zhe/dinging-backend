import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { Dish } from '../dishes/dish.entity';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemsRepository: Repository<OrderItem>,
    @InjectRepository(Dish)
    private dishesRepository: Repository<Dish>,
    private readonly uploadService: UploadService,
  ) {}

  private normalizeOrderImages<T extends Order | Order[] | null>(orderOrOrders: T): T {
    if (!orderOrOrders) {
      return orderOrOrders;
    }

    if (Array.isArray(orderOrOrders)) {
      return orderOrOrders.map((order) => this.normalizeOrderImages(order)) as T;
    }

    orderOrOrders.items?.forEach((item) => {
      item.dish_image = this.uploadService.resolveFileUrl(item.dish_image);
    });

    return orderOrOrders;
  }

  private generateOrderNo(): string {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `FC${year}${month}${day}${random}`;
  }

  async createOrder(
    userId: string,
    orderData: {
      order_date: string;
      meal_type: string;
      people_count: number;
      items: Array<{ dish_id: string; quantity: number }>;
    },
  ) {
    const dishIds = orderData.items.map((item) => item.dish_id);
    const dishes = await this.dishesRepository.findByIds(dishIds);

    if (dishes.length !== dishIds.length) {
      throw new BadRequestException('部分菜品不存在');
    }

    const orderItems = orderData.items.map((item) => {
      const dish = dishes.find((d) => d.id === item.dish_id);

      return {
        id: uuidv4(),
        dish_id: dish.id,
        dish_name: dish.name,
        dish_image: this.uploadService.resolveFileUrl(dish.image_url),
        quantity: item.quantity,
      };
    });

    const order = this.ordersRepository.create({
      id: uuidv4(),
      user_id: userId,
      order_no: this.generateOrderNo(),
      order_date: new Date(orderData.order_date),
      meal_type: orderData.meal_type,
      people_count: orderData.people_count,
      status: 'pending',
    });

    const savedOrder = await this.ordersRepository.save(order);

    for (const item of orderItems) {
      const orderItem = this.orderItemsRepository.create({
        ...item,
        order_id: savedOrder.id,
      });
      await this.orderItemsRepository.save(orderItem);
    }

    return this.getOrderById(savedOrder.id);
  }

  async getUserOrders(userId: string, status?: string) {
    const where: Record<string, any> = { user_id: userId };
    if (status) {
      where.status = status;
    }

    const orders = await this.ordersRepository.find({
      where,
      relations: ['items'],
      order: { created_at: 'DESC' },
    });
    return this.normalizeOrderImages(orders);
  }

  async getOrderById(orderId: string) {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: ['items', 'user'],
    });
    return this.normalizeOrderImages(order);
  }

  async cancelOrder(userId: string, orderId: string) {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId, user_id: userId },
    });

    if (!order) {
      throw new BadRequestException('订单不存在');
    }

    if (order.status !== 'pending') {
      throw new BadRequestException('只有待处理的订单才能取消');
    }

    order.status = 'cancelled';
    return this.ordersRepository.save(order);
  }

  async deleteOrder(userId: string, orderId: string) {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId, user_id: userId },
    });

    if (!order) {
      throw new BadRequestException('订单不存在');
    }

    if (!['cancelled', 'completed'].includes(order.status)) {
      throw new BadRequestException('只有已取消或已完成的订单才能删除');
    }

    await this.ordersRepository.remove(order);
    return { id: orderId };
  }

  async getAllOrders(status?: string) {
    const where: Record<string, any> = {};
    if (status) {
      where.status = status;
    }

    const orders = await this.ordersRepository.find({
      where,
      relations: ['items', 'user'],
      order: { created_at: 'DESC' },
    });
    return this.normalizeOrderImages(orders);
  }

  async updateOrderStatus(orderId: string, status: string) {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new BadRequestException('订单不存在');
    }

    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException('无效的订单状态');
    }

    order.status = status;
    return this.ordersRepository.save(order);
  }
}
