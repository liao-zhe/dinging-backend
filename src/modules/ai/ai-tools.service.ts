import { Injectable, Logger } from '@nestjs/common';
import { DishesService } from '../dishes/dishes.service';
import { WishlistsService } from '../wishlists/wishlists.service';
import { OrdersService } from '../orders/orders.service';
import { Tool } from './providers/llm-provider.interface';

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

@Injectable()
export class AiToolsService {
  private readonly logger = new Logger(AiToolsService.name);

  constructor(
    private readonly dishesService: DishesService,
    private readonly wishlistsService: WishlistsService,
    private readonly ordersService: OrdersService,
  ) {}

  // 工具定义列表，供 Function Calling 使用
  getToolDefinitions(): Tool[] {
    return [
      {
        type: 'function',
        function: {
          name: 'search_dishes',
          description: '根据关键词或分类搜索菜品',
          parameters: {
            type: 'object',
            properties: {
              keyword: {
                type: 'string',
                description: '搜索关键词（如：鸡、辣、汤）',
              },
              category_id: {
                type: 'string',
                description: '分类ID（可选）',
              },
              limit: {
                type: 'number',
                description: '返回数量，默认5',
              },
            },
            required: [],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_dish_detail',
          description: '获取指定菜品的详细信息',
          parameters: {
            type: 'object',
            properties: {
              dish_id: {
                type: 'string',
                description: '菜品ID',
              },
            },
            required: ['dish_id'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_all_categories',
          description: '获取所有菜品分类列表',
          parameters: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_user_wishlist',
          description: '获取当前用户收藏的菜品列表',
          parameters: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_recent_orders',
          description: '获取用户最近的订单记录',
          parameters: {
            type: 'object',
            properties: {
              limit: {
                type: 'number',
                description: '返回数量，默认3',
              },
            },
            required: [],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'recommend_dishes',
          description: '根据条件推荐菜品',
          parameters: {
            type: 'object',
            properties: {
              people_count: {
                type: 'number',
                description: '用餐人数',
              },
              preferences: {
                type: 'string',
                description: '偏好描述（如：清淡、重口、素食）',
              },
              meal_type: {
                type: 'string',
                description: '餐类型：lunch/dinner',
              },
            },
            required: [],
          },
        },
      },
    ];
  }

  // 执行工具调用
  async executeTool(
    toolName: string,
    args: Record<string, any>,
    userId?: string,
  ): Promise<ToolResult> {
    try {
      this.logger.log(`Executing tool: ${toolName}, args: ${JSON.stringify(args)}`);

      switch (toolName) {
        case 'search_dishes':
          return await this.searchDishes(args);
        case 'get_dish_detail':
          return await this.getDishDetail(args);
        case 'get_all_categories':
          return await this.getAllCategories();
        case 'get_user_wishlist':
          return await this.getUserWishlist();
        case 'get_recent_orders':
          return await this.getRecentOrders(args, userId);
        case 'recommend_dishes':
          return await this.recommendDishes(args);
        default:
          return { success: false, error: `Unknown tool: ${toolName}` };
      }
    } catch (error) {
      this.logger.error(`Tool execution failed: ${toolName}`, error?.stack || error);
      return {
        success: false,
        error: error?.message || '工具执行失败',
      };
    }
  }

  // 1. 搜索菜品
  private async searchDishes(args: {
    keyword?: string;
    category_id?: string;
    limit?: number;
  }): Promise<ToolResult> {
    let dishes;

    if (args.keyword) {
      dishes = await this.dishesService.searchDishes(args.keyword);
    } else if (args.category_id) {
      dishes = await this.dishesService.getDishesByCategory(args.category_id);
    } else {
      dishes = await this.dishesService.getDishes();
    }

    // 限制返回数量
    const limit = args.limit || 5;
    dishes = dishes.slice(0, limit);

    // 格式化返回数据
    const formattedDishes = dishes.map((dish) => ({
      id: dish.id,
      name: dish.name,
      description: dish.description,
      category: dish.category?.name,
      image_url: dish.image_url,
      tag: dish.tag,
    }));

    return {
      success: true,
      data: formattedDishes,
    };
  }

  // 2. 获取菜品详情
  private async getDishDetail(args: Record<string, any>): Promise<ToolResult> {
    const dish = await this.dishesService.getDishById(args.dish_id);

    if (!dish) {
      return { success: false, error: '菜品不存在' };
    }

    return {
      success: true,
      data: {
        id: dish.id,
        name: dish.name,
        description: dish.description,
        category: dish.category?.name,
        image_url: dish.image_url,
        tag: dish.tag,
      },
    };
  }

  // 3. 获取所有分类
  private async getAllCategories(): Promise<ToolResult> {
    const categories = await this.dishesService.getCategories();

    return {
      success: true,
      data: categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
      })),
    };
  }

  // 4. 获取用户心愿单
  private async getUserWishlist(): Promise<ToolResult> {
    const dishes = await this.wishlistsService.getUserWishlists();

    return {
      success: true,
      data: dishes.map((dish) => ({
        id: dish.id,
        name: dish.name,
        description: dish.description,
        category: dish.category?.name,
        image_url: dish.image_url,
      })),
    };
  }

  // 5. 获取最近订单
  private async getRecentOrders(
    args: { limit?: number },
    userId?: string,
  ): Promise<ToolResult> {
    if (!userId) {
      return { success: false, error: '用户未登录' };
    }

    const orders = await this.ordersService.getUserOrders(userId);
    const limit = args.limit || 3;
    const recentOrders = orders.slice(0, limit);

    return {
      success: true,
      data: recentOrders.map((order) => ({
        order_no: order.order_no,
        order_date: order.order_date,
        meal_type: order.meal_type,
        people_count: order.people_count,
        status: order.status,
        items: order.items?.map((item) => ({
          dish_name: item.dish_name,
          quantity: item.quantity,
        })),
      })),
    };
  }

  // 6. 智能推荐
  private async recommendDishes(args: {
    people_count?: number;
    preferences?: string;
    meal_type?: string;
  }): Promise<ToolResult> {
    const allDishes = await this.dishesService.getDishes();

    if (allDishes.length === 0) {
      return { success: false, error: '暂无可用菜品' };
    }

    // 根据偏好过滤
    let filteredDishes = allDishes;
    if (args.preferences) {
      const prefLower = args.preferences.toLowerCase();
      const keywordMatch = filteredDishes.filter(
        (d) =>
          d.name?.toLowerCase().includes(prefLower) ||
          d.description?.toLowerCase().includes(prefLower) ||
          d.tag?.toLowerCase().includes(prefLower),
      );
      if (keywordMatch.length > 0) {
        filteredDishes = keywordMatch;
      }
    }

    // 按分类搭配推荐
    const categories = await this.dishesService.getCategories();
    const recommended: any[] = [];

    // 按分类分组
    const dishesByCategory = new Map<string, typeof filteredDishes>();
    for (const dish of filteredDishes) {
      const catId = dish.category_id;
      if (!dishesByCategory.has(catId)) {
        dishesByCategory.set(catId, []);
      }
      dishesByCategory.get(catId).push(dish);
    }

    // 从每个分类选1-2个菜品
    for (const [catId, dishes] of dishesByCategory) {
      const category = categories.find((c) => c.id === catId);
      const selected = dishes.slice(0, 2);
      for (const dish of selected) {
        recommended.push({
          id: dish.id,
          name: dish.name,
          description: dish.description,
          category: category?.name,
          image_url: dish.image_url,
          tag: dish.tag,
        });
      }
    }

    // 限制返回数量
    const limit = args.people_count ? Math.ceil(args.people_count * 1.5) : 4;
    return {
      success: true,
      data: recommended.slice(0, limit),
    };
  }
}
