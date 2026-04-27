import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateDishDto } from '../dishes/dto/create-dish.dto';
import { UpdateDishDto } from '../dishes/dto/update-dish.dto';
import { WishlistsService } from './wishlists.service';

@ApiTags('managed-dishes-compat')
@Controller('wishlists')
export class WishlistsController {
  constructor(private readonly wishlistsService: WishlistsService) {}

  @Get()
  @ApiOperation({ summary: 'Compatibility list for managed dishes' })
  @ApiResponse({ status: 200, description: 'Success' })
  async getUserWishlists() {
    const dishes = await this.wishlistsService.getUserWishlists();
    return {
      code: 0,
      data: dishes,
      message: 'success',
    };
  }

  @Post()
  @ApiOperation({ summary: 'Compatibility create endpoint for managed dishes' })
  @ApiResponse({ status: 200, description: 'Created successfully' })
  async addWishlist(@Body() body: CreateDishDto) {
    const dish = await this.wishlistsService.addWishlist(body);
    return {
      code: 0,
      data: dish,
      message: 'created',
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Compatibility update endpoint for managed dishes' })
  @ApiResponse({ status: 200, description: 'Updated successfully' })
  async updateWishlist(@Param('id') id: string, @Body() body: UpdateDishDto) {
    const dish = await this.wishlistsService.updateWishlist(id, body);
    return {
      code: 0,
      data: dish,
      message: 'updated',
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Compatibility delete endpoint for managed dishes' })
  @ApiResponse({ status: 200, description: 'Deleted successfully' })
  async deleteWishlist(@Param('id') id: string) {
    const result = await this.wishlistsService.deleteWishlist(id);
    return {
      code: 0,
      data: result,
      message: 'deleted',
    };
  }

  @Get('admin/all')
  @ApiOperation({ summary: 'Get all managed dishes through compatibility endpoint' })
  @ApiResponse({ status: 200, description: 'Success' })
  async getAllWishlists() {
    const dishes = await this.wishlistsService.getAllWishlists();
    return {
      code: 0,
      data: dishes,
      message: 'success',
    };
  }
}
