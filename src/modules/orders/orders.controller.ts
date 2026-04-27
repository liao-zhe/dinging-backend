import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UsersService } from '../users/users.service';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create order' })
  @ApiResponse({ status: 200, description: 'Created successfully' })
  @ApiResponse({ status: 400, description: 'Create failed' })
  async createOrder(
    @Body()
    body: {
      order_date: string;
      meal_type: string;
      people_count: number;
      items: Array<{ dish_id: string; quantity: number }>;
    },
  ) {
    const defaultUser = await this.usersService.getDefaultUser();
    const order = await this.ordersService.createOrder(defaultUser.id, body);
    return {
      code: 0,
      data: order,
      message: 'order created',
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get user orders' })
  @ApiQuery({ name: 'status', description: 'Filter by order status', required: false })
  @ApiResponse({ status: 200, description: 'Success' })
  async getUserOrders(@Query('status') status?: string) {
    const defaultUser = await this.usersService.getDefaultUser();
    const orders = await this.ordersService.getUserOrders(defaultUser.id, status);
    return {
      code: 0,
      data: orders,
      message: 'success',
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order detail' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrderById(@Param('id') id: string) {
    const defaultUser = await this.usersService.getDefaultUser();
    const order = await this.ordersService.getOrderById(id);
    if (!order || order.user_id !== defaultUser.id) {
      return {
        code: 404,
        data: null,
        message: 'order not found',
      };
    }

    return {
      code: 0,
      data: order,
      message: 'success',
    };
  }

  @Put(':id/cancel')
  @ApiOperation({ summary: 'Cancel order' })
  @ApiResponse({ status: 200, description: 'Cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Cancel failed' })
  async cancelOrder(@Param('id') id: string) {
    const defaultUser = await this.usersService.getDefaultUser();
    const order = await this.ordersService.cancelOrder(defaultUser.id, id);
    return {
      code: 0,
      data: order,
      message: 'order cancelled',
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete order' })
  @ApiResponse({ status: 200, description: 'Deleted successfully' })
  @ApiResponse({ status: 400, description: 'Delete failed' })
  async deleteOrder(@Param('id') id: string) {
    const defaultUser = await this.usersService.getDefaultUser();
    const result = await this.ordersService.deleteOrder(defaultUser.id, id);
    return {
      code: 0,
      data: result,
      message: 'order deleted',
    };
  }

  @Get('admin/all')
  @ApiOperation({ summary: 'Get all orders for admin' })
  @ApiQuery({ name: 'status', description: 'Filter by order status', required: false })
  @ApiResponse({ status: 200, description: 'Success' })
  async getAllOrders(@Query('status') status?: string) {
    const orders = await this.ordersService.getAllOrders(status);
    return {
      code: 0,
      data: orders,
      message: 'success',
    };
  }

  @Put('admin/:id/status')
  @ApiOperation({ summary: 'Update order status for admin' })
  @ApiResponse({ status: 200, description: 'Updated successfully' })
  @ApiResponse({ status: 400, description: 'Update failed' })
  async updateOrderStatus(@Param('id') id: string, @Body() body: { status: string }) {
    const order = await this.ordersService.updateOrderStatus(id, body.status);
    return {
      code: 0,
      data: order,
      message: 'updated',
    };
  }
}
