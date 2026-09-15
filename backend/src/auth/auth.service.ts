import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  verifyPassword(password: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(password, passwordHash);
  }

  signAccessToken(userId: string): Promise<string> {
    return this.jwtService.signAsync({ sub: userId });
  }
}
