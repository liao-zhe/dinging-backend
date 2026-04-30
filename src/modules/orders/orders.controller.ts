import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create order' })
  @ApiResponse({ status: 200, description: 'Created successfully' })
  @ApiResponse({ status: 400, description: 'Create failed' })
  async createOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      order_date: string;
      meal_type: string;
      people_count: number;
      items: Array<{ dish_id: string; quantity: number }>;
    },
  ) {
    const order = await this.ordersService.createOrder(user.userId, body);
    return {
      code: 0,
      data: order,
      message: '订单创建成功',
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user orders' })
  @ApiQuery({ name: 'status', description: 'Filter by order status', required: false })
  @ApiResponse({ status: 200, description: 'Success' })
  async getUserOrders(@CurrentUser() user: AuthenticatedUser, @Query('status') status?: string) {
    const orders = await this.ordersService.getUserOrders(user.userId, status);
    return {
      code: 0,
      data: orders,
      message: '查询成功',
    };
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('chef')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all orders for chef' })
  @ApiQuery({ name: 'status', description: 'Filter by order status', required: false })
  @ApiResponse({ status: 200, description: 'Success' })
  async getAllOrders(@Query('status') status?: string) {
    const orders = await this.ordersService.getAllOrders(status);
    return {
      code: 0,
      data: orders,
      message: '查询成功',
    };
  }

  @Put('admin/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('chef')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update order status for chef' })
  @ApiResponse({ status: 200, description: 'Updated successfully' })
  @ApiResponse({ status: 400, description: 'Update failed' })
  async updateOrderStatus(@Param('id') id: string, @Body() body: { status: string }) {
    const order = await this.ordersService.updateOrderStatus(id, body.status);
    return {
      code: 0,
      data: order,
      message: '订单状态更新成功',
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get order detail' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrderById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const order = await this.ordersService.getOrderById(id);
    const canAccess = order && (order.user_id === user.userId || user.role === 'chef');

    if (!canAccess) {
      return {
        code: 404,
        data: null,
        message: '订单不存在',
      };
    }

    return {
      code: 0,
      data: order,
      message: '查询成功',
    };
  }

  @Put(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel order' })
  @ApiResponse({ status: 200, description: 'Cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Cancel failed' })
  async cancelOrder(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const order = await this.ordersService.cancelOrder(user.userId, id);
    return {
      code: 0,
      data: order,
      message: '订单已取消',
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete order' })
  @ApiResponse({ status: 200, description: 'Deleted successfully' })
  @ApiResponse({ status: 400, description: 'Delete failed' })
  async deleteOrder(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const result = await this.ordersService.deleteOrder(user.userId, user.role, id);
    return {
      code: 0,
      data: result,
      message: '订单已删除',
    };
  }
}
