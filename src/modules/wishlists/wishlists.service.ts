import { Injectable } from '@nestjs/common';
import { DishesService } from '../dishes/dishes.service';
import { CreateDishDto } from '../dishes/dto/create-dish.dto';
import { UpdateDishDto } from '../dishes/dto/update-dish.dto';

@Injectable()
export class WishlistsService {
  constructor(private readonly dishesService: DishesService) {}

  // Compatibility layer: the old wishlist page now manages the same dishes
  // that are rendered on the home ordering page.
  async getUserWishlists() {
    return this.dishesService.getAllManagedDishes();
  }

  async addWishlist(wishlistData: CreateDishDto) {
    return this.dishesService.createDish(wishlistData);
  }

  async updateWishlist(wishlistId: string, wishlistData: UpdateDishDto) {
    return this.dishesService.updateDish(wishlistId, wishlistData);
  }

  async deleteWishlist(wishlistId: string) {
    return this.dishesService.deleteDish(wishlistId);
  }

  async getAllWishlists() {
    return this.dishesService.getAllManagedDishes();
  }
}
