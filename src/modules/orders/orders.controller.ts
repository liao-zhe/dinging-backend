import { Body, Controller, Delete, Get, Param, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

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
    @Request() req,
    @Body()
    body: {
      order_date: string;
      meal_type: string;
      people_count: number;
      items: Array<{ dish_id: string; quantity: number }>;
    },
  ) {
    const order = await this.ordersService.createOrder(req.user.userId, body);
    return {
      code: 0,
      data: order,
      message: 'order created',
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user orders' })
  @ApiQuery({ name: 'status', description: 'Filter by order status', required: false })
  @ApiResponse({ status: 200, description: 'Success' })
  async getUserOrders(@Request() req, @Query('status') status?: string) {
    const orders = await this.ordersService.getUserOrders(req.user.userId, status);
    return {
      code: 0,
      data: orders,
      message: 'success',
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get order detail' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrderById(@Request() req, @Param('id') id: string) {
    const order = await this.ordersService.getOrderById(id);
    if (!order || order.user_id !== req.user.userId) {
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel order' })
  @ApiResponse({ status: 200, description: 'Cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Cancel failed' })
  async cancelOrder(@Request() req, @Param('id') id: string) {
    const order = await this.ordersService.cancelOrder(req.user.userId, id);
    return {
      code: 0,
      data: order,
      message: 'order cancelled',
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete order' })
  @ApiResponse({ status: 200, description: 'Deleted successfully' })
  @ApiResponse({ status: 400, description: 'Delete failed' })
  async deleteOrder(@Request() req, @Param('id') id: string) {
    const result = await this.ordersService.deleteOrder(req.user.userId, id);
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles('chef')
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
