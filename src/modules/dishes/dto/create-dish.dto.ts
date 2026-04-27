import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDishDto {
  @ApiProperty({ description: 'Dish category id' })
  @IsString()
  @IsNotEmpty()
  category_id: string;

  @ApiPropertyOptional({ description: 'Dish name' })
  @ValidateIf((o) => !o.dish_name)
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ description: 'Legacy dish name field for compatibility' })
  @ValidateIf((o) => !o.name)
  @IsString()
  @IsNotEmpty()
  dish_name?: string;

  @ApiPropertyOptional({ description: 'Dish description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Legacy description field for compatibility' })
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiPropertyOptional({ description: 'Dish image url' })
  @IsOptional()
  @IsString()
  image_url?: string;

  @ApiPropertyOptional({ description: 'Dish tag' })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ description: 'Dish sort order' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sort_order?: number;

  @ApiPropertyOptional({ description: 'Whether the dish is active', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  is_active?: number;
}
