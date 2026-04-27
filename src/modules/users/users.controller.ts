import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';

@ApiTags('鐢ㄦ埛')
@Controller('user')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: '鑾峰彇鐢ㄦ埛淇℃伅' })
  async getProfile() {
    const user = await this.usersService.getDefaultUser();
    return {
      code: 0,
      data: user,
      message: 'success',
    };
  }

  @Put('profile')
  @ApiOperation({ summary: '鏇存柊鐢ㄦ埛淇℃伅' })
  async updateProfile(@Body() body: { nickname?: string; avatar_url?: string; phone?: string }) {
    const defaultUser = await this.usersService.getDefaultUser();
    const user = await this.usersService.update(defaultUser.id, body);
    return {
      code: 0,
      data: user,
      message: 'success',
    };
  }
}
