import { Injectable } from '@nestjs/common';
import { DishesService } from '../dishes/dishes.service';
import { CreateDishDto } from '../dishes/dto/create-dish.dto';
import { UpdateDishDto } from '../dishes/dto/update-dish.dto';

@Injectable()
export class WishlistsService {
  constructor(private readonly dishesService: DishesService) {}

  // Compatibility layer: the old wishlist page now manages the same dishes
  // that are rendered on the home ordering page.
  async getUserWishlists(_userId: string) {
    return this.dishesService.getAllManagedDishes();
  }

  async addWishlist(_userId: string, wishlistData: CreateDishDto) {
    return this.dishesService.createDish(wishlistData);
  }

  async updateWishlist(_userId: string, wishlistId: string, wishlistData: UpdateDishDto) {
    return this.dishesService.updateDish(wishlistId, wishlistData);
  }

  async deleteWishlist(_userId: string, wishlistId: string) {
    return this.dishesService.deleteDish(wishlistId);
  }

  async getAllWishlists() {
    return this.dishesService.getAllManagedDishes();
  }
}
