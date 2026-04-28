import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { UploadService } from '../upload/upload.service';
import { Dish } from './dish.entity';
import { Category } from './category.entity';
import { CreateDishDto } from './dto/create-dish.dto';
import { UpdateDishDto } from './dto/update-dish.dto';

@Injectable()
export class DishesService {
  constructor(
    @InjectRepository(Dish)
    private dishesRepository: Repository<Dish>,
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
    private readonly uploadService: UploadService,
  ) {}

  private normalizeDishImage<T extends Dish | Dish[] | null>(dishOrDishes: T): T {
    if (!dishOrDishes) {
      return dishOrDishes;
    }

    if (Array.isArray(dishOrDishes)) {
      return dishOrDishes.map((dish) => this.normalizeDishImage(dish)) as T;
    }

    dishOrDishes.image_url = this.uploadService.resolveFileUrl(dishOrDishes.image_url);
    return dishOrDishes;
  }

  async getCategories() {
    return this.categoriesRepository.find({
      where: { is_active: 1 },
      order: { sort_order: 'ASC' },
    });
  }

  async getDishes() {
    const dishes = await this.dishesRepository.find({
      where: { is_active: 1 },
      relations: ['category'],
      order: { sort_order: 'ASC' },
    });
    return this.normalizeDishImage(dishes);
  }

  async getAllManagedDishes() {
    const dishes = await this.dishesRepository.find({
      relations: ['category'],
      order: { sort_order: 'ASC', created_at: 'DESC' },
    });
    return this.normalizeDishImage(dishes);
  }

  async getDishesByCategory(categoryId: string) {
    const dishes = await this.dishesRepository.find({
      where: { category_id: categoryId, is_active: 1 },
      order: { sort_order: 'ASC' },
    });
    return this.normalizeDishImage(dishes);
  }

  async getDishById(id: string) {
    const dish = await this.dishesRepository.findOne({
      where: { id, is_active: 1 },
      relations: ['category'],
    });
    return this.normalizeDishImage(dish);
  }

  async createDish(data: CreateDishDto) {
    const name = data.name?.trim() || data.dish_name?.trim();
    if (!name) {
      throw new BadRequestException('Dish name is required');
    }

    if (!data.category_id) {
      throw new BadRequestException('category_id is required');
    }

    const category = await this.categoriesRepository.findOne({
      where: { id: data.category_id, is_active: 1 },
    });
    if (!category) {
      throw new BadRequestException('Category not found or inactive');
    }

    const rawMaxSort = await this.dishesRepository
      .createQueryBuilder('dish')
      .select('MAX(dish.sort_order)', 'max')
      .getRawOne<{ max: string | null }>();
    const nextSortOrder = rawMaxSort?.max ? Number(rawMaxSort.max) + 1 : 1;

    const dish = this.dishesRepository.create({
      id: uuidv4(),
      category_id: data.category_id,
      name,
      description: data.description ?? data.remark ?? null,
      image_url: data.image_url ?? null,
      tag: data.tag ?? null,
      sort_order: data.sort_order ?? nextSortOrder,
      is_active: data.is_active ?? 1,
    });

    const savedDish = await this.dishesRepository.save(dish);
    const nextDish = await this.dishesRepository.findOne({
      where: { id: savedDish.id },
      relations: ['category'],
    });
    return this.normalizeDishImage(nextDish);
  }

  async updateDish(id: string, data: UpdateDishDto) {
    const dish = await this.dishesRepository.findOne({ where: { id } });
    if (!dish) {
      throw new NotFoundException('Dish not found');
    }

    if (data.category_id) {
      const category = await this.categoriesRepository.findOne({
        where: { id: data.category_id, is_active: 1 },
      });
      if (!category) {
        throw new BadRequestException('Category not found or inactive');
      }
      dish.category_id = data.category_id;
    }

    if (data.name !== undefined || data.dish_name !== undefined) {
      const nextName = data.name?.trim() || data.dish_name?.trim();
      if (!nextName) {
        throw new BadRequestException('Dish name is required');
      }
      dish.name = nextName;
    }

    if (data.description !== undefined || data.remark !== undefined) {
      dish.description = data.description ?? data.remark ?? null;
    }

    if (data.image_url !== undefined) {
      dish.image_url = data.image_url ?? null;
    }

    if (data.tag !== undefined) {
      dish.tag = data.tag ?? null;
    }

    if (data.sort_order !== undefined) {
      dish.sort_order = Number(data.sort_order);
    }

    if (data.is_active !== undefined) {
      dish.is_active = Number(data.is_active);
    }

    const savedDish = await this.dishesRepository.save(dish);
    const nextDish = await this.dishesRepository.findOne({
      where: { id: savedDish.id },
      relations: ['category'],
    });
    return this.normalizeDishImage(nextDish);
  }

  async deleteDish(id: string) {
    const dish = await this.dishesRepository.findOne({ where: { id } });
    if (!dish) {
      throw new NotFoundException('Dish not found');
    }

    await this.dishesRepository.remove(dish);
    return { id };
  }

  async searchDishes(keyword: string) {
    const dishes = await this.dishesRepository
      .createQueryBuilder('dish')
      .where('dish.is_active = :active', { active: 1 })
      .andWhere('(dish.name LIKE :keyword OR dish.description LIKE :keyword)', {
        keyword: `%${keyword}%`,
      })
      .orderBy('dish.sort_order', 'ASC')
      .getMany();
    return this.normalizeDishImage(dishes);
  }
}
