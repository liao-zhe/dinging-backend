import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
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

interface ChangeChefPasswordParams {
  currentPassword: string;
  newPassword: string;
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

    const user = await this.usersService.findByUsername(username);
    const isChef = user?.role === 'chef';
    const isPasswordMatch = user?.password_hash
      ? this.verifyPassword(password, user.password_hash)
      : false;

    if (!user || !isChef || !isPasswordMatch) {
      throw new UnauthorizedException('Invalid chef credentials');
    }

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

  async changeChefPassword(
    tokenUser: AuthenticatedUser,
    params: ChangeChefPasswordParams,
  ) {
    const currentPassword = params.currentPassword?.trim();
    const newPassword = params.newPassword?.trim();

    if (!currentPassword || !newPassword) {
      throw new BadRequestException(
        'currentPassword and newPassword are required',
      );
    }

    if (newPassword.length < 6) {
      throw new BadRequestException(
        'newPassword must be at least 6 characters long',
      );
    }

    const user = await this.usersService.findById(tokenUser.userId);
    if (!user || user.role !== 'chef' || !user.password_hash) {
      throw new UnauthorizedException('Chef account not found');
    }

    if (!this.verifyPassword(currentPassword, user.password_hash)) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    await this.usersService.update(user.id, {
      password_hash: this.hashPassword(newPassword),
    });
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

  private verifyPassword(password: string, passwordHash: string): boolean {
    const [salt, storedHash] = passwordHash.split(':');
    if (!salt || !storedHash) {
      return false;
    }

    const derivedHash = scryptSync(password, salt, 64).toString('hex');
    return this.safeCompare(derivedHash, storedHash);
  }

  private hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }
}
