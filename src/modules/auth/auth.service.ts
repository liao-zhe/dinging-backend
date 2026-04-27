import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async wechatLogin(code: string, userInfo?: { nickname?: string; avatar_url?: string }) {
    const openid = await this.getOpenidByCode(code);

    const user = await this.usersService.findOrCreate(openid, {
      nickname: userInfo?.nickname,
      avatar_url: userInfo?.avatar_url,
    });

    const payload = { sub: user.id, openid: user.openid, role: user.role };
    const token = this.jwtService.sign(payload);

    return {
      token,
      user: {
        id: user.id,
        openid: user.openid,
        nickname: user.nickname,
        avatar_url: user.avatar_url,
        phone: user.phone,
        role: user.role,
      },
    };
  }

  private async getOpenidByCode(code: string): Promise<string> {
    if (this.configService.get('NODE_ENV') === 'development') {
      return 'test-openid-001';
    }

    const appId = this.configService.get('WECHAT_APPID');
    const secret = this.configService.get('WECHAT_SECRET');
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.errcode) {
        throw new Error(`WeChat login failed: ${data.errmsg}`);
      }

      return data.openid;
    } catch (error) {
      throw new Error(`Failed to get openid: ${error.message}`);
    }
  }

  async validateToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.usersService.findById(payload.sub);
      return user;
    } catch (error) {
      return null;
    }
  }
}
