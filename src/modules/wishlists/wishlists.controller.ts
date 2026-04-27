import { Body, Controller, Delete, Get, Param, Post, Put, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WishlistsService } from './wishlists.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateDishDto } from '../dishes/dto/create-dish.dto';
import { UpdateDishDto } from '../dishes/dto/update-dish.dto';

@ApiTags('managed-dishes-compat')
@Controller('wishlists')
export class WishlistsController {
  constructor(private readonly wishlistsService: WishlistsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Compatibility list for managed dishes' })
  @ApiResponse({ status: 200, description: 'Success' })
  async getUserWishlists(@Request() req) {
    const dishes = await this.wishlistsService.getUserWishlists(req.user.userId);
    return {
      code: 0,
      data: dishes,
      message: 'success',
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Compatibility create endpoint for managed dishes' })
  @ApiResponse({ status: 200, description: 'Created successfully' })
  async addWishlist(
    @Request() req,
    @Body()
    body: CreateDishDto,
  ) {
    const dish = await this.wishlistsService.addWishlist(req.user.userId, body);
    return {
      code: 0,
      data: dish,
      message: 'created',
    };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Compatibility update endpoint for managed dishes' })
  @ApiResponse({ status: 200, description: 'Updated successfully' })
  async updateWishlist(
    @Request() req,
    @Param('id') id: string,
    @Body()
    body: UpdateDishDto,
  ) {
    const dish = await this.wishlistsService.updateWishlist(req.user.userId, id, body);
    return {
      code: 0,
      data: dish,
      message: 'updated',
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Compatibility delete endpoint for managed dishes' })
  @ApiResponse({ status: 200, description: 'Deleted successfully' })
  async deleteWishlist(@Request() req, @Param('id') id: string) {
    const result = await this.wishlistsService.deleteWishlist(req.user.userId, id);
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
