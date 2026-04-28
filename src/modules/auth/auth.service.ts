import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { AuthenticatedUser } from './auth.types';

interface WechatLoginParams {
  code: string;
  nickname?: string;
  avatar_url?: string;
  phone?: string;
}

interface JwtPayload {
  sub: string;
  openid: string;
  role: string;
}

interface ChefLoginParams {
  username: string;
  password: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async wechatLogin(params: WechatLoginParams) {
    if (!params.code?.trim()) {
      throw new BadRequestException('code is required');
    }

    const openid = await this.resolveOpenidByCode(params.code.trim());
    const user = await this.usersService.findOrCreate(openid, {
      nickname: params.nickname,
      avatar_url: params.avatar_url,
      phone: params.phone,
      role: 'customer',
    });

    return this.buildLoginResponse(user);
  }

  async chefLogin(params: ChefLoginParams) {
    const username = params.username?.trim();
    const password = params.password?.trim();

    if (!username || !password) {
      throw new BadRequestException('username and password are required');
    }

    const chefUsername = this.configService.get<string>('CHEF_USERNAME');
    const chefPassword = this.configService.get<string>('CHEF_PASSWORD');

    if (!chefUsername || !chefPassword) {
      throw new InternalServerErrorException(
        'CHEF_USERNAME and CHEF_PASSWORD are required for chef login',
      );
    }

    const isUsernameMatch = username === chefUsername;
    const isPasswordMatch = this.safeCompare(password, chefPassword);

    if (!isUsernameMatch || !isPasswordMatch) {
      throw new UnauthorizedException('Invalid chef credentials');
    }

    const user = await this.usersService.findOrCreate(`chef-account:${chefUsername}`, {
      nickname: 'Chef',
      role: 'chef',
    });

    return this.buildLoginResponse(user);
  }

  async validateAccessToken(token: string): Promise<AuthenticatedUser | null> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      const user = await this.usersService.findById(payload.sub);

      if (!user) {
        return null;
      }

      return {
        userId: user.id,
        openid: user.openid,
        role: user.role as AuthenticatedUser['role'],
      };
    } catch {
      return null;
    }
  }

  async getCurrentUserProfile(tokenUser: AuthenticatedUser) {
    const user = await this.usersService.findById(tokenUser.userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  private async resolveOpenidByCode(code: string): Promise<string> {
    const loginMode = this.configService.get<string>('WECHAT_LOGIN_MODE');
    const appId = this.configService.get<string>('WECHAT_APPID');
    const secret = this.configService.get<string>('WECHAT_SECRET');

    if (!loginMode) {
      throw new InternalServerErrorException(
        'WECHAT_LOGIN_MODE is required and must be set to mock or official',
      );
    }

    if (!['mock', 'official'].includes(loginMode)) {
      throw new InternalServerErrorException(
        'WECHAT_LOGIN_MODE must be either mock or official',
      );
    }

    if (loginMode === 'mock') {
      return `mock-openid-${code}`;
    }

    if (!appId || !secret) {
      throw new InternalServerErrorException(
        'WECHAT_APPID and WECHAT_SECRET are required in official mode',
      );
    }

    const url = new URL('https://api.weixin.qq.com/sns/jscode2session');
    url.searchParams.set('appid', appId);
    url.searchParams.set('secret', secret);
    url.searchParams.set('js_code', code);
    url.searchParams.set('grant_type', 'authorization_code');

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new UnauthorizedException('Failed to call WeChat login API');
    }

    const data = (await response.json()) as {
      openid?: string;
      errcode?: number;
      errmsg?: string;
    };

    if (data.errcode || !data.openid) {
      throw new UnauthorizedException(data.errmsg || 'WeChat login failed');
    }

    return data.openid;
  }

  private buildLoginResponse(user: {
    id: string;
    openid: string;
    nickname?: string;
    avatar_url?: string;
    phone?: string;
    role: string;
  }) {
    const accessToken = this.jwtService.sign({
      sub: user.id,
      openid: user.openid,
      role: user.role,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '7d'),
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

  private safeCompare(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    if (leftBuffer.length !== rightBuffer.length) {
      return false;
    }

    return timingSafeEqual(leftBuffer, rightBuffer);
  }
}
