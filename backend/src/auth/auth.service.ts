import { HttpException, HttpStatus, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'node:crypto';
import { PrismaService } from '../data-access/prisma.service';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService, private readonly config: ConfigService, private readonly prisma: PrismaService) {}

  hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  verifyPassword(password: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(password, passwordHash);
  }

  signAccessToken(userId: string): Promise<string> {
    return this.jwtService.signAsync({ sub: userId });
  }

  async verifyAccessToken(token: string): Promise<string> {
    try {
      const payload = await this.jwtService.verifyAsync<{ sub?: unknown }>(token);
      if (typeof payload.sub !== 'string') throw new Error('Missing subject');
      return payload.sub;
    } catch {
      throw new UnauthorizedException('Your session is invalid or has expired.');
    }
  }

  async sendOtp(rawPhoneNumber: string): Promise<void> {
    const phoneNumber = normalizeIndianPhone(rawPhoneNumber);
    const developmentCode = this.developmentCode();
    if (!developmentCode) throw new ServiceUnavailableException('SMS delivery is not configured.');
    const now = new Date();
    const requests = await this.prisma.otpChallenge.count({ where: { phoneNumber, createdAt: { gte: new Date(now.getTime() - 10 * 60_000) } } });
    if (requests >= this.config.get<number>('OTP_REQUEST_LIMIT', 3)) throw new HttpException('Too many codes requested. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
    const code = developmentCode ?? randomInt(100000, 1_000_000).toString();
    await this.prisma.otpChallenge.create({ data: { phoneNumber, codeHash: await bcrypt.hash(code, 12), expiresAt: new Date(now.getTime() + 5 * 60_000) } });
  }

  async loginWithPhone(rawPhoneNumber: string) {
    const phoneNumber = normalizeIndianPhone(rawPhoneNumber);
    const existingUser = await this.prisma.user.findUnique({ where: { phoneNumber } });
    const user = existingUser ?? await this.prisma.user.create({ data: { key: `phone:${phoneNumber}`, phoneNumber, profile: { create: { name: 'Member', goal: 'Build muscle', days: '4 days / week', diet: 'Vegetarian' } } } });
    return { accessToken: await this.signAccessToken(user.id), isNewUser: !existingUser, user: { id: user.id, phoneNumber } };
  }

  async verifyOtp(rawPhoneNumber: string, code: string) {
    const phoneNumber = normalizeIndianPhone(rawPhoneNumber);
    const challenge = await this.prisma.otpChallenge.findFirst({ where: { phoneNumber, consumedAt: null }, orderBy: { createdAt: 'desc' } });
    if (!challenge || challenge.expiresAt <= new Date()) throw new UnauthorizedException('This code has expired. Request a new one.');
    if (challenge.attempts >= this.config.get<number>('OTP_MAX_ATTEMPTS', 5)) throw new HttpException('Too many incorrect attempts. Request a new code.', HttpStatus.TOO_MANY_REQUESTS);
    if (!await bcrypt.compare(code, challenge.codeHash)) {
      await this.prisma.otpChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
      throw new UnauthorizedException('That code is not correct.');
    }
    const existingUser = await this.prisma.user.findUnique({ where: { phoneNumber } });
    const user = existingUser ?? await this.prisma.user.create({ data: { key: `phone:${phoneNumber}`, phoneNumber, profile: { create: { name: 'Member', goal: 'Build muscle', days: '4 days / week', diet: 'Vegetarian' } } } });
    const consumed = await this.prisma.otpChallenge.updateMany({ where: { id: challenge.id, consumedAt: null }, data: { consumedAt: new Date(), userId: user.id } });
    if (consumed.count !== 1) throw new UnauthorizedException('This code has already been used.');
    return { accessToken: await this.signAccessToken(user.id), isNewUser: !existingUser, user: { id: user.id, phoneNumber: user.phoneNumber } };
  }

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, phoneNumber: true } });
    if (!user?.phoneNumber) throw new UnauthorizedException('Your session is no longer valid.');
    return { user };
  }

  private developmentCode(): string | undefined {
    if (this.config.get<string>('NODE_ENV') === 'production' || !this.config.get<boolean>('OTP_DEVELOPMENT_MODE', false)) return undefined;
    return this.config.get<string>('OTP_DEVELOPMENT_CODE');
  }
}

export function normalizeIndianPhone(value: string): string {
  const digits = value.replace(/[\s-]/g, '').replace(/^\+/, '');
  return `+91${digits.startsWith('91') ? digits.slice(2) : digits}`;
}
