import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateDishDto } from './dto/create-dish.dto';
import { UpdateDishDto } from './dto/update-dish.dto';
import { DishesService } from './dishes.service';

@ApiTags('dishes')
@Controller('dishes')
export class DishesController {
  constructor(private readonly dishesService: DishesService) {}

  @Get('categories')
  @ApiOperation({ summary: 'Get dish categories' })
  @ApiResponse({ status: 200, description: 'Success' })
  async getCategories() {
    const categories = await this.dishesService.getCategories();
    return {
      code: 0,
      data: categories,
      message: '查询成功',
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get active dishes for the home page' })
  @ApiResponse({ status: 200, description: 'Success' })
  async getDishes() {
    const dishes = await this.dishesService.getDishes();
    return {
      code: 0,
      data: dishes,
      message: '查询成功',
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a dish for home page display' })
  @ApiResponse({ status: 200, description: 'Created successfully' })
  async createDish(@Body() body: CreateDishDto) {
    const dish = await this.dishesService.createDish(body);
    return {
      code: 0,
      data: dish,
      message: '菜品创建成功',
    };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a managed dish' })
  @ApiResponse({ status: 200, description: 'Updated successfully' })
  async updateDish(@Param('id') id: string, @Body() body: UpdateDishDto) {
    const dish = await this.dishesService.updateDish(id, body);
    return {
      code: 0,
      data: dish,
      message: '菜品更新成功',
    };
  }

  @Get('category/:categoryId')
  @ApiOperation({ summary: 'Get dishes by category' })
  @ApiResponse({ status: 200, description: 'Success' })
  async getDishesByCategory(@Param('categoryId') categoryId: string) {
    const dishes = await this.dishesService.getDishesByCategory(categoryId);
    return {
      code: 0,
      data: dishes,
      message: '查询成功',
    };
  }

  @Get('search')
  @ApiOperation({ summary: 'Search dishes' })
  @ApiQuery({ name: 'keyword', description: 'Search keyword', required: true })
  @ApiResponse({ status: 200, description: 'Success' })
  async searchDishes(@Query('keyword') keyword: string) {
    if (!keyword) {
      return {
        code: 0,
        data: [],
        message: '查询成功',
      };
    }

    const dishes = await this.dishesService.searchDishes(keyword);
    return {
      code: 0,
      data: dishes,
      message: '查询成功',
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a managed dish' })
  @ApiResponse({ status: 200, description: 'Deleted successfully' })
  async deleteDish(@Param('id') id: string) {
    const result = await this.dishesService.deleteDish(id);
    return {
      code: 0,
      data: result,
      message: '菜品已删除',
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get dish detail' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 404, description: 'Dish not found' })
  async getDishById(@Param('id') id: string) {
    const dish = await this.dishesService.getDishById(id);
    if (!dish) {
      return {
        code: 404,
        data: null,
        message: '菜品不存在',
      };
    }

    return {
      code: 0,
      data: dish,
      message: '查询成功',
    };
  }
}
