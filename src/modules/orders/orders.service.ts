import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Resend } from 'resend';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { Dish } from '../dishes/dish.entity';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  private readonly resend: Resend | null;

  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemsRepository: Repository<OrderItem>,
    @InjectRepository(Dish)
    private dishesRepository: Repository<Dish>,
    private readonly configService: ConfigService,
    private readonly uploadService: UploadService,
  ) {
    const resendApiKey = this.configService.get<string>('RESEND_API_KEY');
    this.resend = resendApiKey ? new Resend(resendApiKey) : null;
  }

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

  private formatOrderCreatedAt(date: Date | string | undefined): string {
    const value = date ? new Date(date) : new Date();
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(value);
  }

  private formatOrderDate(date: Date | string): string {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(date));
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private buildOrderNotificationHtml(payload: {
    orderNo: string;
    createdAt: string;
    orderDate: string;
    mealType: string;
    peopleCount: number;
    items: Array<{ name: string; quantity: number }>;
  }) {
    const itemsHtml = payload.items
      .map(
        (item) =>
          `<li style="margin:0 0 8px;">${this.escapeHtml(item.name)} x ${item.quantity}</li>`,
      )
      .join('');

    return `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f2937;line-height:1.7;">
        <h2 style="margin:0 0 16px;color:#111827;">哲哲私厨新订单通知</h2>
        <p style="margin:0 0 8px;"><strong>订单号：</strong>${this.escapeHtml(payload.orderNo)}</p>
        <p style="margin:0 0 8px;"><strong>下单时间：</strong>${this.escapeHtml(payload.createdAt)}</p>
        <p style="margin:0 0 8px;"><strong>用餐日期：</strong>${this.escapeHtml(payload.orderDate)}</p>
        <p style="margin:0 0 8px;"><strong>餐期：</strong>${this.escapeHtml(payload.mealType)}</p>
        <p style="margin:0 0 16px;"><strong>人数：</strong>${payload.peopleCount}</p>
        <div style="margin-top:16px;">
          <strong>菜品清单：</strong>
          <ul style="margin:12px 0 0;padding-left:20px;">
            ${itemsHtml}
          </ul>
        </div>
      </div>
    `;
  }

  private async sendOrderNotificationEmail(payload: {
    orderNo: string;
    createdAt: string;
    orderDate: string;
    mealType: string;
    peopleCount: number;
    items: Array<{ name: string; quantity: number }>;
  }) {
    if (!this.resend) {
      this.logger.warn('RESEND_API_KEY not configured, skip order email notification');
      return;
    }

    const from = this.configService.get<string>('RESEND_FROM');
    const to = this.configService.get<string>('CHEF_NOTIFY_EMAIL');

    if (!from || !to) {
      this.logger.warn('RESEND_FROM or CHEF_NOTIFY_EMAIL not configured, skip order email notification');
      return;
    }

    const { error } = await this.resend.emails.send({
      from,
      to: [to],
      subject: `哲哲私厨新订单通知：${payload.orderNo}`,
      html: this.buildOrderNotificationHtml(payload),
    });

    if (error) {
      throw new Error(error.message || 'send order notification email failed');
    }
  }

  private async sendOrderCancellationEmail(payload: {
    orderNo: string;
    createdAt: string;
    orderDate: string;
    mealType: string;
    peopleCount: number;
    items: Array<{ name: string; quantity: number }>;
  }) {
    if (!this.resend) {
      this.logger.warn('RESEND_API_KEY not configured, skip order cancellation email notification');
      return;
    }

    const from = this.configService.get<string>('RESEND_FROM');
    const to = this.configService.get<string>('CHEF_NOTIFY_EMAIL');

    if (!from || !to) {
      this.logger.warn('RESEND_FROM or CHEF_NOTIFY_EMAIL not configured, skip order cancellation email notification');
      return;
    }

    const itemsHtml = payload.items
      .map(
        (item) =>
          `<li style="margin:0 0 8px;">${this.escapeHtml(item.name)} x ${item.quantity}</li>`,
      )
      .join('');

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f2937;line-height:1.7;">
        <h2 style="margin:0 0 16px;color:#dc2626;">⚠️ 订单取消通知</h2>
        <p style="margin:0 0 8px;"><strong>订单号：</strong>${this.escapeHtml(payload.orderNo)}</p>
        <p style="margin:0 0 8px;"><strong>下单时间：</strong>${this.escapeHtml(payload.createdAt)}</p>
        <p style="margin:0 0 8px;"><strong>用餐日期：</strong>${this.escapeHtml(payload.orderDate)}</p>
        <p style="margin:0 0 8px;"><strong>餐期：</strong>${this.escapeHtml(payload.mealType)}</p>
        <p style="margin:0 0 16px;"><strong>人数：</strong>${payload.peopleCount}</p>
        <div style="margin-top:16px;">
          <strong>菜品清单：</strong>
          <ul style="margin:12px 0 0;padding-left:20px;">
            ${itemsHtml}
          </ul>
        </div>
        <p style="margin-top:16px;color:#dc2626;font-weight:bold;">该订单已被用户取消，请留意。</p>
      </div>
    `;

    const { error } = await this.resend.emails.send({
      from,
      to: [to],
      subject: `⚠️ 哲哲私厨订单取消通知：${payload.orderNo}`,
      html,
    });

    if (error) {
      throw new Error(error.message || 'send order cancellation email failed');
    }
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

    void this.sendOrderNotificationEmail({
      orderNo: savedOrder.order_no,
      createdAt: this.formatOrderCreatedAt(savedOrder.created_at),
      orderDate: this.formatOrderDate(savedOrder.order_date),
      mealType: savedOrder.meal_type,
      peopleCount: savedOrder.people_count,
      items: orderItems.map((item) => ({
        name: item.dish_name,
        quantity: item.quantity,
      })),
    }).catch((error) => {
      this.logger.error(
        `send order notification email failed for order ${savedOrder.order_no}: ${error instanceof Error ? error.message : String(error)}`,
      );
    });

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
      relations: ['items'],
    });

    if (!order) {
      throw new BadRequestException('订单不存在');
    }

    if (order.status === 'confirmed') {
      throw new BadRequestException('已确认的订单不能取消');
    }

    order.status = 'cancelled';
    const savedOrder = await this.ordersRepository.save(order);

    // 发送取消订单邮件通知主厨
    void this.sendOrderCancellationEmail({
      orderNo: savedOrder.order_no,
      createdAt: this.formatOrderCreatedAt(savedOrder.created_at),
      orderDate: this.formatOrderDate(savedOrder.order_date),
      mealType: savedOrder.meal_type,
      peopleCount: savedOrder.people_count,
      items: order.items.map((item) => ({
        name: item.dish_name,
        quantity: item.quantity,
      })),
    }).catch((error) => {
      this.logger.error(
        `send order cancellation email failed for order ${savedOrder.order_no}: ${error instanceof Error ? error.message : String(error)}`,
      );
    });

    return savedOrder;
  }

  async deleteOrder(userId: string, role: string, orderId: string) {
    if (role === 'chef') {
      throw new BadRequestException('主厨账号不能删除订单');
    }

    const order = await this.ordersRepository.findOne({
      where: { id: orderId, user_id: userId },
    });

    if (!order) {
      throw new BadRequestException('订单不存在');
    }

    if (!['confirmed', 'cancelled'].includes(order.status)) {
      throw new BadRequestException('只有已确认或已取消的订单才能删除');
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
