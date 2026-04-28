import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('user')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    const profile = await this.usersService.findById(user.userId);
    return {
      code: 0,
      data: profile,
      message: 'success',
    };
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { nickname?: string; avatar_url?: string; phone?: string },
  ) {
    const profile = await this.usersService.update(user.userId, body);
    return {
      code: 0,
      data: profile,
      message: 'success',
    };
  }
}
